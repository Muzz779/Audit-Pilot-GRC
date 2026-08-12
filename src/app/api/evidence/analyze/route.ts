import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { extractDocument } from '@/lib/rag/extraction';
import { chunkDocument } from '@/lib/rag/chunking';
import { embedTexts } from '@/lib/rag/embeddings';

export const maxDuration = 120; // this can take a while for larger documents

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

  const body: any = await req.json();
  const { evidence_id } = body;

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

  if (existingAnalysis?.status === 'completed') {
    return NextResponse.json({
      error: 'This document has already been analyzed. Delete the existing analysis first to re-analyze.',
    }, { status: 400 });
  }

  if (existingAnalysis?.status === 'processing') {
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

    // Extract the storage path from the file_url
    // URL format: https://xxx.supabase.co/storage/v1/object/public/evidence/orgId/timestamp-filename
    // We need just: orgId/timestamp-filename
    const urlParts = evidence.file_url.split('/evidence/');
    if (urlParts.length < 2) {
      throw new Error('Could not parse storage path from file URL. Please re-upload the file.');
    }
    const storagePath = urlParts[1];

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('evidence')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Could not download file from storage: ${downloadError?.message || 'File not found'}. Please re-upload the evidence file.`);
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // ── Step 2: Extract text with page-level structure ───────────────
    const extraction = await extractDocument(
      fileBuffer,
      evidence.file_type || '',
      evidence.file_name || evidence.name
    );

    if (extraction.pages.length === 0) {
      throw new Error('No text could be extracted from this document.');
    }

    // ── Step 3: Chunk into semantic, citable pieces ───────────────────
    const chunks = chunkDocument(extraction.pages);

    if (chunks.length === 0) {
      throw new Error('Document text could not be split into analyzable chunks.');
    }

    // ── Step 4: Generate embeddings for all chunks ────────────────────
    const embeddings = await embedTexts(chunks.map(c => c.text));

    // ── Step 5: Store chunks + embeddings in the database ─────────────
    // Use the same service role client for the bulk insert to avoid RLS
    // overhead on a potentially large batch.
    const chunkRows = chunks.map((chunk: any, i: number) => ({
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

    // Clean up any existing chunks for this evidence before inserting new ones
    // This ensures re-runs replace old chunks instead of creating duplicates.
    const { error: deleteError } = await serviceClient
      .from('document_chunks')
      .delete()
      .eq('evidence_id', evidence_id);

    if (deleteError) {
      throw new Error(`Failed to remove existing document chunks: ${deleteError.message}`);
    }

    const { error: insertError } = await serviceClient
      .from('document_chunks')
      .insert(chunkRows);

    if (insertError) {
      throw new Error(`Failed to store document chunks: ${insertError.message}`);
    }

    // ── Step 6: Mark analysis as completed ─────────────────────────────
    await supabase
      .from('document_analysis')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
        page_count: extraction.totalPages,
        completed_at: new Date().toISOString(),
      })
      .eq('evidence_id', evidence_id);

    // Update evidence status to verified now that it's been analyzed
    await supabase
      .from('evidence')
      .update({ status: 'verified', verified_by: user.id })
      .eq('id', evidence_id);

    await supabase.from('audit_logs').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      action: `analyzed document: ${evidence.name} (${chunks.length} chunks, ${extraction.totalPages} pages)`,
      resource_type: 'evidence',
      resource_id: evidence_id,
      resource_name: evidence.name,
    });

    return NextResponse.json({
      success: true,
      chunk_count: chunks.length,
      page_count: extraction.totalPages,
      message: `Document analyzed successfully — ${chunks.length} searchable sections extracted from ${extraction.totalPages} page(s).`,
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
  return NextResponse.json({ data: data || { status: 'not_started' } });
}
