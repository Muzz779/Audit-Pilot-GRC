// ============================================================
// AuditPilot — Embedding Engine
// ============================================================
//
// Uses Voyage AI for embeddings — this is the embedding provider
// Anthropic recommends pairing with Claude (voyage-3 models).
// Requires VOYAGE_API_KEY in environment variables.
//
// Why not use Claude itself for embeddings? Claude does not
// currently expose an embeddings endpoint — it's a generation
// model. Voyage is a separate, lightweight API call alongside it.
// ============================================================

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3-lite'; // 1536 dimensions, cost-efficient, good for retrieval

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

/**
 * Generate an embedding vector for a single piece of text.
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}

/**
 * Generate embedding vectors for multiple texts in one API call (more efficient).
 * Voyage supports batching up to 128 texts per call.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not configured. Add it to your environment variables.');
  }

  // Robust token-aware batching and per-input cap
  // Heuristics: estimate tokens by characters (approx 4 chars/token)
  const estimateTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

  // Provider limits (conservative defaults)
  const MAX_INPUT_TOKENS = 3000; // per single text input — split if larger
  const MAX_BATCH_TOKENS = 32000; // total tokens per API call
  const MAX_BATCH_INPUTS = 128; // Voyage documented per-request input limit
  const PART_OVERLAP_CHARS = 200; // overlap when splitting oversized texts

  // Split a single large text into smaller parts that respect MAX_INPUT_TOKENS
  function splitTextIntoParts(text: string): string[] {
    const est = estimateTokens(text);
    if (est <= MAX_INPUT_TOKENS) return [text];

    const maxChars = MAX_INPUT_TOKENS * 4;
    const parts: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(text.length, start + maxChars);
      // Try to break on nearest newline/space before end for cleaner splits
      let sliceEnd = end;
      const newlinePos = text.lastIndexOf('\n', end);
      const spacePos = text.lastIndexOf(' ', end);
      if (newlinePos > start && newlinePos >= end - 200) sliceEnd = newlinePos;
      else if (spacePos > start && spacePos >= end - 200) sliceEnd = spacePos;

      const part = text.slice(start, sliceEnd || end).trim();
      if (part.length > 0) parts.push(part);

      // advance with overlap
      start = (sliceEnd || end) - PART_OVERLAP_CHARS;
      if (start < 0) start = 0;
      if (start >= text.length) break;
    }

    return parts.length > 0 ? parts : [text.slice(0, maxChars)];
  }

  // Prepare a flat list of parts with mapping to original indices so we can re-assemble
  type Part = { originalIndex: number; text: string };
  const parts: Part[] = [];
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i] || '';
    const split = splitTextIntoParts(t);
    for (const p of split) parts.push({ originalIndex: i, text: p });
  }

  const allEmbeddings: number[][] = [];

  // Batch by both input count and estimated token sum
  let cursor = 0;
  while (cursor < parts.length) {
    const batchInputs: string[] = [];
    let batchTokenSum = 0;

    while (cursor < parts.length && batchInputs.length < MAX_BATCH_INPUTS) {
      const part = parts[cursor];
      const est = estimateTokens(part.text);
      if (batchTokenSum + est > MAX_BATCH_TOKENS && batchInputs.length > 0) break; // flush current batch

      batchInputs.push(part.text);
      batchTokenSum += est;
      cursor++;
    }

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batchInputs,
        model: EMBEDDING_MODEL,
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage embedding API error (${response.status}): ${errorText}`);
    }

    const data: VoyageEmbeddingResponse = await response.json();
    const sorted = data.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map(d => d.embedding));
  }

  // Re-assemble embeddings to match the original `texts` order by averaging parts
  const vectorsByOriginal: number[][][] = Array.from({ length: texts.length }, () => []);
  let embCursor = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    vectorsByOriginal[p.originalIndex].push(allEmbeddings[embCursor++]);
  }

  const averaged: number[][] = vectorsByOriginal.map(vecs => {
    if (!vecs || vecs.length === 0) return Array(allEmbeddings[0].length).fill(0);
    if (vecs.length === 1) return vecs[0];
    const dim = vecs[0].length;
    const sum = new Array(dim).fill(0);
    for (const v of vecs) for (let i = 0; i < dim; i++) sum[i] += v[i];
    return sum.map(s => s / vecs.length);
  });

  return averaged;
}

/**
 * Embed a search QUERY (as opposed to a document). Voyage performs better
 * when query vs document embeddings use the appropriate input_type.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not configured.');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [query],
      model: EMBEDDING_MODEL,
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voyage embedding API error (${response.status}): ${errorText}`);
  }

  const data: VoyageEmbeddingResponse = await response.json();
  return data.data[0].embedding;
}
