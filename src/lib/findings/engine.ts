// ============================================================
// AuditPilot — Findings Engine (Phase 2)
// ============================================================
//
// Analyzes a single compliance control against:
//   1. The regulation text that governs it (found via vector search)
//   2. The organisation's uploaded & analyzed evidence
//
// Produces a structured finding: Satisfied / Partial / Gap,
// with High/Medium/Low confidence, cited evidence, and a
// recommendation. Findings are always created as drafts
// pending human review.
//
// Design note: rather than a hand-written control→regulation
// map, we match dynamically using the same embedding search
// proven in Phase 1. This self-maintains as regulation data grows.
// ============================================================

import { embedQuery } from '@/lib/rag/embeddings';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Reuse the calibrated threshold from Phase 1
const SIMILARITY_THRESHOLD = 0.25;
const MAX_EVIDENCE_CHUNKS = 8;
const MAX_REGULATION_CHUNKS = 3;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export interface ControlInput {
  id: string;
  control_id: string;      // e.g. "POPIA-12"
  name: string;
  description: string;
  category: string;
  framework_id: string;
}

export interface FindingResult {
  determination: 'satisfied' | 'partial' | 'gap' | 'not_assessed';
  confidence: 'high' | 'medium' | 'low';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  summary: string;
  reasoning: string;
  recommendation: string;
  evidence_chunk_ids: string[];
  regulation_chunk_ids: string[];
  evidence_summary: string;
  used_unverified_regulation: boolean;
}

interface EvidenceChunk {
  id: string;
  evidence_id: string;
  chunk_text: string;
  page_number: number | null;
  section_title: string | null;
  similarity: number;
}

interface RegulationChunk {
  id: string;
  section_reference: string;
  title: string;
  chunk_text: string;
  required_evidence_description: string | null;
  is_verified: boolean;
  similarity: number;
}

/**
 * Analyze one control and produce a draft finding.
 * `supabase` is passed in so this works with the request-scoped client.
 */
export async function analyzeControl(
  supabase: any,
  organisationId: string,
  control: ControlInput
): Promise<FindingResult> {
  // ── Step 1: Build a search query from the control ────────────────
  const controlQuery = `${control.name}. ${control.description}`;
  const queryEmbedding = await embedQuery(controlQuery);

  // ── Step 2: Find governing regulation + relevant evidence ────────
  const [regResults, evidenceResults] = await Promise.all([
    supabase.rpc('match_regulation_chunks', {
      query_embedding: queryEmbedding,
      match_framework_id: control.framework_id,
      match_count: MAX_REGULATION_CHUNKS,
      match_threshold: SIMILARITY_THRESHOLD,
    }),
    supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_org_id: organisationId,
      match_count: MAX_EVIDENCE_CHUNKS,
      match_threshold: SIMILARITY_THRESHOLD,
    }),
  ]);

  if (regResults.error) throw new Error(`Regulation search failed: ${regResults.error.message}`);
  if (evidenceResults.error) throw new Error(`Evidence search failed: ${evidenceResults.error.message}`);

  const regulationChunks: RegulationChunk[] = regResults.data || [];
  const evidenceChunks: EvidenceChunk[] = evidenceResults.data || [];

  // ── Step 3: If no evidence at all, it's a gap by definition ───────
  if (evidenceChunks.length === 0) {
    const usedUnverified = regulationChunks.some(r => !r.is_verified);
    return {
      determination: 'gap',
      confidence: 'high', // high confidence that there's NO evidence — because there literally is none
      severity: inferSeverityFromCategory(control.category),
      title: `No evidence found for: ${control.name}`,
      summary: `No uploaded and analyzed documents contain evidence relevant to this control. This represents a documentation gap.`,
      reasoning: `A search of all analyzed evidence for this organisation returned no documents relevant to "${control.name}". Either no relevant document has been uploaded, or uploaded documents have not yet been analyzed.`,
      recommendation: `Upload and analyze documentation that demonstrates how your organisation satisfies this control${regulationChunks.length > 0 && regulationChunks[0].required_evidence_description ? `. Typically this requires: ${regulationChunks[0].required_evidence_description}` : '.'}`,
      evidence_chunk_ids: [],
      regulation_chunk_ids: regulationChunks.map(r => r.id),
      evidence_summary: 'No relevant evidence found.',
      used_unverified_regulation: usedUnverified,
    };
  }

  // ── Step 4: Fetch evidence document names for the summary ─────────
  const evidenceIds = [...new Set(evidenceChunks.map(c => c.evidence_id))];
  const { data: evidenceRecords } = await supabase
    .from('evidence')
    .select('id, name, file_name')
    .in('id', evidenceIds);

  const evidenceNameMap = new Map(
    (evidenceRecords || []).map((e: any) => [e.id, e.name || e.file_name])
  );

  // ── Step 5: Build context for Claude ──────────────────────────────
  const regulationContext = regulationChunks.length > 0
    ? regulationChunks.map((r, i) => {
        const verifiedNote = r.is_verified ? '' : ' [UNVERIFIED regulation text]';
        return `[REG-${i + 1}] ${r.section_reference}: ${r.title}${verifiedNote}\n${r.chunk_text}`;
      }).join('\n\n')
    : '(No specific regulation text was matched for this control.)';

  const evidenceContext = evidenceChunks.map((c, i) => {
    const docName = evidenceNameMap.get(c.evidence_id) || 'Unknown document';
    const loc = [
      c.page_number ? `Page ${c.page_number}` : null,
      c.section_title ? `Section: ${c.section_title}` : null,
    ].filter(Boolean).join(', ');
    return `[EV-${i + 1}] Source: "${docName}"${loc ? ` (${loc})` : ''}\n${c.chunk_text}`;
  }).join('\n\n');

  // ── Step 6: Ask Claude for a structured determination ─────────────
  const systemPrompt = `You are AuditPilot's compliance findings engine. You assess whether a specific compliance control is satisfied by the evidence provided. You must be rigorous, conservative, and evidence-based.

CRITICAL RULES:
1. Base your determination ONLY on the evidence excerpts provided. Never assume evidence exists that isn't shown.
2. Cite specific evidence using [EV-n] labels and regulation using [REG-n] labels.
3. Be conservative: if evidence is ambiguous or only partially addresses the control, classify as "partial", not "satisfied".
4. "satisfied" requires clear, specific evidence that directly addresses the control.
5. "gap" means the evidence does not address the control at all, or contradicts compliance.
6. Do not use outside knowledge of regulations beyond the provided regulation excerpts.

You must respond with ONLY a valid JSON object (no markdown, no backticks) in this exact shape:
{
  "determination": "satisfied" | "partial" | "gap",
  "confidence": "high" | "medium" | "low",
  "severity": "critical" | "high" | "medium" | "low" | "informational",
  "title": "short finding title (max 12 words)",
  "summary": "2-3 sentence plain-English summary of what was found",
  "reasoning": "explanation of why you reached this determination, citing [EV-n] and [REG-n]",
  "recommendation": "specific actionable recommendation to close any gap, or confirmation if satisfied"
}

Guidance on confidence:
- "high": evidence clearly and directly addresses the control
- "medium": evidence is relevant but incomplete or requires interpretation
- "low": evidence is tangential or the determination is uncertain

Guidance on severity (for gaps/partials — how serious is the compliance risk):
- "critical": core legal obligation with regulatory penalties (e.g. breach notification, lawful basis)
- "high": important obligation with real exposure
- "medium": standard compliance requirement
- "low": minor or administrative
- "informational": satisfied controls, or observations`;

  const userPrompt = `CONTROL TO ASSESS:
Reference: ${control.control_id}
Name: ${control.name}
Description: ${control.description}
Category: ${control.category}

GOVERNING REGULATION:
${regulationContext}

AVAILABLE EVIDENCE:
${evidenceContext}

Assess whether this control is satisfied by the evidence. Respond with only the JSON object.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = (message.content[0] as { text: string }).text;

  // ── Step 7: Parse Claude's JSON response safely ───────────────────
  let parsed: any;
  try {
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('The findings engine returned an unparseable response. Please try analyzing this control again.');
  }

  // ── Step 8: Assemble the finding with full traceability ───────────
  const usedUnverified = regulationChunks.some(r => !r.is_verified);

  const evidenceSummary = evidenceChunks.map((c, i) => {
    const docName = evidenceNameMap.get(c.evidence_id) || 'Unknown';
    const loc = c.page_number ? ` (Page ${c.page_number})` : '';
    return `[EV-${i + 1}] ${docName}${loc}`;
  }).join('; ');

  return {
    determination: parsed.determination || 'not_assessed',
    confidence: parsed.confidence || 'low',
    severity: parsed.severity || inferSeverityFromCategory(control.category),
    title: parsed.title || control.name,
    summary: parsed.summary || '',
    reasoning: parsed.reasoning || '',
    recommendation: parsed.recommendation || '',
    evidence_chunk_ids: evidenceChunks.map(c => c.id),
    regulation_chunk_ids: regulationChunks.map(r => r.id),
    evidence_summary: evidenceSummary,
    used_unverified_regulation: usedUnverified,
  };
}

// Fallback severity based on control category when the model doesn't specify
function inferSeverityFromCategory(category: string): FindingResult['severity'] {
  const c = category.toLowerCase();
  if (c.includes('security') || c.includes('breach')) return 'high';
  if (c.includes('rights') || c.includes('processing')) return 'medium';
  return 'medium';
}
