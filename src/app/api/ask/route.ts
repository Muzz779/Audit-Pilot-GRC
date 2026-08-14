import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/rag/embeddings';
import { checkAiQuota, quotaExceededResponse, logAiUsage } from '@/lib/usage/quota';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIMILARITY_THRESHOLD = 0.25;
const MAX_DOCUMENT_CHUNKS = 8;
const MAX_REGULATION_CHUNKS = 5;

interface RetrievedDocChunk {
  id: string;
  evidence_id: string;
  chunk_text: string;
  page_number: number | null;
  section_title: string | null;
  paragraph_id: string | null;
  similarity: number;
}

interface RetrievedRegChunk {
  id: string;
  framework_id: string;
  section_reference: string;
  title: string;
  chunk_text: string;
  category: string | null;
  required_evidence_description: string | null;
  is_verified: boolean;
  similarity: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  }

  const quota = await checkAiQuota(profile.organisation_id);
  if (!quota.allowed) return NextResponse.json(quotaExceededResponse(quota), { status: 429 });

  const body: any = await req.json();
  const { question, framework_id } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: 'A question is required' }, { status: 400 });
  }

  try {
    // ── Step 1: Embed the question ───────────────────────────────────
    const queryEmbedding = await embedQuery(question.trim());
    console.log('Query embedding length:', queryEmbedding.length);
    console.log('First 5 values:', queryEmbedding.slice(0, 5));

    // ── Step 2: Retrieve relevant chunks from BOTH sources in parallel ──
    const [docResults, regResults] = await Promise.all([
      supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_org_id: profile.organisation_id,
        match_count: MAX_DOCUMENT_CHUNKS,
        match_threshold: SIMILARITY_THRESHOLD,
      }),
      supabase.rpc('match_regulation_chunks', {
        query_embedding: queryEmbedding,
        match_framework_id: framework_id || null,
        match_count: MAX_REGULATION_CHUNKS,
        match_threshold: SIMILARITY_THRESHOLD,
      }),
    ]);

    console.log('📄 Doc results:', docResults.data?.length || 0, 'chunks');
    console.log('📋 Reg results:', regResults.data?.length || 0, 'chunks');
    if (docResults.error) console.error('❌ Doc error:', docResults.error);
    if (regResults.error) console.error('❌ Reg error:', regResults.error);

    if (docResults.error) throw new Error(`Document search failed: ${docResults.error.message}`);
    if (regResults.error) throw new Error(`Regulation search failed: ${regResults.error.message}`);

    const documentChunks: RetrievedDocChunk[] = docResults.data || [];
    const regulationChunks: RetrievedRegChunk[] = regResults.data || [];

    const hadSufficientEvidence = documentChunks.length > 0 || regulationChunks.length > 0;

    // ── Step 3: If nothing relevant was found, don't even call Claude — ──
    // be honest about it immediately rather than letting the model guess.
    if (!hadSufficientEvidence) {
      const answer =
        "I couldn't find any relevant information in your uploaded documents or the regulation knowledge base to answer this question. " +
        "This could mean: (1) no documents have been analyzed yet — upload and analyze evidence first, " +
        "(2) the relevant regulation isn't in the knowledge base yet, or " +
        "(3) the question may need to be phrased differently.";

      await logQuery(supabase, profile.organisation_id, user.id, question, answer, [], [], false, 'No matching chunks found above similarity threshold');

      return NextResponse.json({
        answer,
        citations: { documents: [], regulations: [] },
        had_sufficient_evidence: false,
      });
    }

    // ── Step 4: Fetch evidence document names for citation labels ──────
    const evidenceIds = [...new Set(documentChunks.map(c => c.evidence_id))];
    const { data: evidenceRecords } = evidenceIds.length > 0
      ? await supabase.from('evidence').select('id, name, file_name').in('id', evidenceIds)
      : { data: [] };

    const evidenceNameMap = new Map((evidenceRecords || []).map(e => [e.id, e.name || e.file_name]));

    // ── Step 5: Build the grounded context for Claude ──────────────────
    const documentContext = documentChunks.map((c: RetrievedDocChunk, i: number) => {
      const docName = evidenceNameMap.get(c.evidence_id) || 'Unknown document';
      const location = [
        c.page_number ? `Page ${c.page_number}` : null,
        c.section_title ? `Section: "${c.section_title}"` : null,
      ].filter(Boolean).join(', ');
      return `[DOC-${i + 1}] Source: "${docName}"${location ? ` (${location})` : ''}\n${c.chunk_text}`;
    }).join('\n\n---\n\n');

    const regulationContext = regulationChunks.map((c: RetrievedRegChunk, i: number) => {
      const verifiedNote = c.is_verified ? '' : ' [⚠️ UNVERIFIED — drafted from public text, not yet legally reviewed]';
      return `[REG-${i + 1}] ${c.section_reference}: "${c.title}"${verifiedNote}\n${c.chunk_text}`;
    }).join('\n\n---\n\n');

    // ── Step 6: Ask Claude — strictly grounded, citation-required ───────
    const systemPrompt = `You are AuditPilot's evidence analysis assistant. You answer questions ONLY using the document excerpts and regulation excerpts provided below. 

CRITICAL RULES:
1. Only use information explicitly present in the provided excerpts. Never use outside knowledge about POPIA, ISO 27001, or any regulation beyond what is shown here.
2. Every claim you make must cite its source using the bracket labels provided (e.g. [DOC-1], [REG-2]).
3. If the provided excerpts are insufficient to fully answer the question, say so explicitly — do not fill gaps with assumptions or general knowledge.
4. If a regulation excerpt is marked UNVERIFIED, you must mention this caveat when citing it.
5. Structure your answer as:
   - A direct answer to the question
   - Supporting evidence with citations
   - Any gaps or caveats

DOCUMENT EXCERPTS (from the organisation's uploaded evidence):
${documentContext || '(none retrieved)'}

REGULATION EXCERPTS:
${regulationContext || '(none retrieved)'}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: question.trim() }],
    });

    const answer = (message.content[0] as { text: string }).text;

    // ── Step 7: Log the full query for audit traceability ──────────────
    await logQuery(
      supabase,
      profile.organisation_id,
      user.id,
      question,
      answer,
      documentChunks.map(c => c.id),
      regulationChunks.map(c => c.id),
      true,
      null
    );

    // Meter this AI operation against the org's monthly usage
    await logAiUsage(profile.organisation_id, user.id, 'ask');

    // ── Step 8: Return answer + structured citations for UI rendering ──
    return NextResponse.json({
      answer,
      citations: {
        documents: documentChunks.map((c: RetrievedDocChunk, i: number) => ({
          label: `DOC-${i + 1}`,
          document_name: evidenceNameMap.get(c.evidence_id) || 'Unknown document',
          page_number: c.page_number,
          section_title: c.section_title,
          excerpt: c.chunk_text.slice(0, 200) + (c.chunk_text.length > 200 ? '...' : ''),
          similarity: Math.round(c.similarity * 100),
        })),
        regulations: regulationChunks.map((c: RetrievedRegChunk, i: number) => ({
          label: `REG-${i + 1}`,
          section_reference: c.section_reference,
          title: c.title,
          is_verified: c.is_verified,
          excerpt: c.chunk_text.slice(0, 200) + (c.chunk_text.length > 200 ? '...' : ''),
          similarity: Math.round(c.similarity * 100),
        })),
      },
      had_sufficient_evidence: true,
    });

  } catch (err: any) {
    console.error('RAG query error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process your question' },
      { status: 500 }
    );
  }
}

async function logQuery(
  supabase: any,
  orgId: string,
  userId: string,
  question: string,
  answer: string,
  docChunkIds: string[],
  regChunkIds: string[],
  hadSufficientEvidence: boolean,
  confidenceNote: string | null
) {
  await supabase.from('rag_queries').insert({
    organisation_id: orgId,
    user_id: userId,
    question,
    answer,
    retrieved_document_chunk_ids: docChunkIds,
    retrieved_regulation_chunk_ids: regChunkIds,
    had_sufficient_evidence: hadSufficientEvidence,
    confidence_note: confidenceNote,
  });
}
