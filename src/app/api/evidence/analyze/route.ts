import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { extractDocument, type ExtractionResult } from '@/lib/rag/extraction';
import { chunkDocument } from '@/lib/rag/chunking';
import { embedWithinBudget } from '@/lib/rag/embeddings';
import { checkAiQuota, quotaExceededResponse, logAiUsage } from '@/lib/usage/quota';

export const maxDuration = 120; // covers a scanned PDF read, which is the longest step

// Every step refreshes requested_at, so this only passes once steps have stopped
const STALE_ANALYSIS_MS = 2 * 60 * 1000;
const CHUNK_INSERT_BATCH = 200; // keeps each insert under the database request size limit
// Analysis runs in steps, like Run Full Audit: each request embeds what it can
// in this time and saves it, then the browser asks for the next step. Large
// files therefore can't hit the route limit, and an interrupted run resumes.
const STEP_BUDGET_MS = 20_000;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  }
  if (!['owner', 'admin', 'member'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Cost guard — block if the org has hit its monthly AI operation cap
  const quota = await checkAiQuota(profile.organisation_id);
  if (!quota.allowed) return NextResponse.json(quotaExceededResponse(quota), { status: 429 });

  const body: any = await req.json();
  const { evidence_id, reanalyze, resume } = body;

  if (!evidence_id) {
    return NextResponse.json({ error: 'evidence_id is required' }, { status: 400 });
  }

  // Fetch the evidence record — must belong to the user's org
  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence')
    .select('*')
    .eq('id', evidence_id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (evidenceError || !evidence) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  if (!evidence.file_url) {
    return NextResponse.json(
      { error: 'This evidence has no file attached — only metadata was saved. Re-upload with a file to analyze it.' },
      { status: 400 }
    );
  }

  // Check if already analyzed / in progress
  const { data: existingAnalysis } = await supabase
    .from('document_analysis')
    .select('*')
    .eq('evidence_id', evidence_id)
    .maybeSingle();

  if (existingAnalysis?.status === 'completed' && !reanalyze && !resume) {
    return NextResponse.json({
      error: 'This document has already been analyzed. Use Re-analyze to run it again.',
    }, { status: 400 });
  }

  // A run killed by the platform timeout never reaches the catch below, so an
  // old "processing" row is dead. Without this, the document stays stuck forever.
  const startedAt = existingAnalysis?.requested_at ? new Date(existingAnalysis.requested_at).getTime() : 0;
  const stillRunning = Date.now() - startedAt < STALE_ANALYSIS_MS;
  if (existingAnalysis?.status === 'processing' && stillRunning && !resume) {
    return NextResponse.json({ error: 'Analysis is already in progress for this document.' }, { status: 400 });
  }

  // Create or update the analysis tracking row to "processing"
  const analysisId = existingAnalysis?.id;
  if (analysisId) {
    await supabase
      .from('document_analysis')
      .update({ status: 'processing', error_message: null, requested_by: user.id, requested_at: new Date().toISOString() })
      .eq('id', analysisId);
  } else {
    await supabase
      .from('document_analysis')
      .insert({
        organisation_id: profile.organisation_id,
        evidence_id,
        status: 'processing',
        requested_by: user.id,
      });
  }

  try {
    // ── Step 1: Download the file from Supabase Storage ──────────────
    // We use the service role client to download from private storage
    // rather than fetching the public URL, which won't work for private buckets.
    const serviceClient = await createServiceRoleClient();

    // file_url now stores the storage path directly (orgId/timestamp-filename).
    // Older rows stored a public URL that embeds the path after "/evidence/" — handle both.
    const storagePath = evidence.file_url.includes('/evidence/')
      ? evidence.file_url.split('/evidence/')[1]
      : evidence.file_url;
    if (!storagePath) {
      throw new Error('Could not resolve storage path from evidence record. Please re-upload the file.');
    }

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('evidence')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Could not download file from storage: ${downloadError?.message || 'File not found'}. Please re-upload the evidence file.`);
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // ── Step 2: Extract text with page-level structure ───────────────
    // A scanned reading is slow, paid for, and can differ between reads, so
    // it is kept in storage beside the file for the steps that follow.
    const ocrCachePath = `${storagePath}.ocr.json`;
    let extraction: ExtractionResult | null = null;

    if (resume) {
      const { data: cached } = await serviceClient.storage.from('evidence').download(ocrCachePath);
      if (cached) extraction = JSON.parse(await cached.text());
    }

    const resumedScan = extraction !== null;
    if (!extraction) {
      extraction = await extractDocument(
        fileBuffer,
        evidence.file_type || '',
        evidence.file_name || evidence.name
      );
    }

    if (extraction.pages.length === 0) {
      throw new Error('No text could be extracted from this document.');
    }

    // ── Step 3: Chunk into semantic, citable pieces ───────────────────
    const chunks = chunkDocument(extraction.pages);

    if (chunks.length === 0) {
      throw new Error('Document text could not be split into analyzable chunks.');
    }

    const usedOcr = extraction.pages.some(page => page.extractionMethod === 'ocr');
    const readScanNow = usedOcr && !resumedScan;

    let scanSaved = false;
    if (readScanNow) {
      const { error: cacheError } = await serviceClient.storage
        .from('evidence')
        // text/plain, because the bucket's allowed types exclude application/json
        .upload(ocrCachePath, JSON.stringify(extraction), { contentType: 'text/plain', upsert: true });
      if (cacheError) console.error('Could not keep the scanned reading:', cacheError.message);
      scanSaved = !cacheError;
    }

    // ── Step 4: Work out where this analysis has got to ───────────────
    // A fresh re-analysis starts clean. Otherwise, chunks already saved by an
    // earlier step are kept. A new scanned reading also starts clean rather
    // than mixing two readings of the same pages.
    const deleteExistingChunks = async () => {
      const { error: deleteError } = await serviceClient
        .from('document_chunks')
        .delete()
        .eq('evidence_id', evidence_id);
      if (deleteError) {
        throw new Error(`Failed to remove existing document chunks: ${deleteError.message}`);
      }
    };

    let alreadySaved = 0;
    if ((reanalyze && !resume) || readScanNow) {
      await deleteExistingChunks();
    } else {
      const { data: lastChunk } = await serviceClient
        .from('document_chunks')
        .select('chunk_index')
        .eq('evidence_id', evidence_id)
        .order('chunk_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      alreadySaved = lastChunk ? lastChunk.chunk_index + 1 : 0;

      // More chunks than this reading produces means they came from an older
      // chunker, so they can't be continued from.
      if (alreadySaved > chunks.length) {
        await deleteExistingChunks();
        alreadySaved = 0;
      }
    }

    // The scan may have used most of this step's time. Embed in the next one.
    if (scanSaved) {
      return NextResponse.json({ continue: true, processed: 0, total: chunks.length });
    }

    // ── Step 5: Embed and save the next group of chunks ───────────────
    const remaining = chunks.slice(alreadySaved);
    const { embeddings, rateLimited } = await embedWithinBudget(remaining.map(c => c.text), STEP_BUDGET_MS);

    // Use the service role client for the bulk insert to avoid RLS
    // overhead on a potentially large batch.
    const chunkRows = remaining.slice(0, embeddings.length).map((chunk: any, i: number) => ({
      organisation_id: profile.organisation_id,
      evidence_id,
      chunk_text: chunk.text,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      section_title: chunk.sectionTitle,
      paragraph_id: chunk.paragraphId,
      embedding: embeddings[i],
      token_count: chunk.estimatedTokens,
    }));

    for (let i = 0; i < chunkRows.length; i += CHUNK_INSERT_BATCH) {
      const { error: insertError } = await serviceClient
        .from('document_chunks')
        .insert(chunkRows.slice(i, i + CHUNK_INSERT_BATCH));

      if (insertError) {
        throw new Error(`Failed to store document chunks: ${insertError.message}`);
      }
    }

    const savedSoFar = alreadySaved + chunkRows.length;
    if (savedSoFar < chunks.length) {
      // Without a kept reading, the next step would read the scan again and
      // start over, so it could never finish.
      if (readScanNow) {
        throw new Error('This scanned document could not be finished. Please Try Again in a minute.');
      }
      return NextResponse.json({
        continue: true,
        processed: savedSoFar,
        total: chunks.length,
        rate_limited: rateLimited,
      });
    }

    if (usedOcr) await serviceClient.storage.from('evidence').remove([ocrCachePath]);

    // ── Step 6: Mark analysis as completed ─────────────────────────────
    // Evidence status is left alone: reading a file is not verifying it, and
    // only a person can mark evidence "verified". Unread content is kept in
    // error_message so the warning stays visible after the toast has gone.
    const warningText = extraction.warnings?.join(' ') || null;
    await supabase
      .from('document_analysis')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
        page_count: extraction.totalPages,
        error_message: warningText,
        completed_at: new Date().toISOString(),
      })
      .eq('evidence_id', evidence_id);

    await supabase.from('audit_logs').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      action: `analyzed document: ${evidence.name} (${chunks.length} chunks, ${extraction.totalPages} pages)`,
      resource_type: 'evidence',
      resource_id: evidence_id,
      resource_name: evidence.name,
    });

    // Meter this AI operation against the org's monthly usage
    await logAiUsage(profile.organisation_id, user.id, 'evidence_analysis');

    return NextResponse.json({
      success: true,
      chunk_count: chunks.length,
      page_count: extraction.totalPages,
      warning: warningText,
      message: `Document analyzed — ${chunks.length} searchable sections extracted.`,
    });

  } catch (err: any) {
    console.error('Document analysis error:', err);

    await supabase
      .from('document_analysis')
      .update({
        status: 'failed',
        error_message: err.message || 'Unknown error during analysis',
      })
      .eq('evidence_id', evidence_id);

    return NextResponse.json(
      { error: err.message || 'Document analysis failed' },
      { status: 500 }
    );
  }
}

// GET — check analysis status for a piece of evidence
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const evidenceId = searchParams.get('evidence_id');

  if (!evidenceId) {
    return NextResponse.json({ error: 'evidence_id query param is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('document_analysis')
    .select('*')
    .eq('evidence_id', evidenceId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Steps run from the browser, so closing the tab leaves a "processing" row
  // nothing is working on. Offer Try Again rather than a spinner forever.
  const startedAt = data?.requested_at ? new Date(data.requested_at).getTime() : 0;
  if (data?.status === 'processing' && Date.now() - startedAt >= STALE_ANALYSIS_MS) {
    return NextResponse.json({
      data: { ...data, status: 'failed', error_message: 'Analysis was interrupted. Try Again to continue from where it stopped.' },
    });
  }

  return NextResponse.json({ data: data || { status: 'not_started' } });
}
