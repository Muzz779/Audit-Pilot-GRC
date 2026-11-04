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

// How long one analysis step may spend embedding, rate-limit waits included.
// Keeps a step inside the route's 120s limit, so it fails with a clear
// message instead of being killed mid-way.
const DOCUMENT_DEADLINE_MS = 100_000;
// A search query is one short call, so it waits less
const QUERY_DEADLINE_MS = 25_000;

// Provider limits (conservative defaults)
const MAX_INPUT_TOKENS = 3000; // per single text input — split if larger
const MAX_BATCH_INPUTS = 128; // Voyage documented per-request input limit
const PART_OVERLAP_CHARS = 200; // overlap when splitting oversized texts
// Estimated tokens per API call. A request larger than the account's
// tokens-per-minute limit can never succeed, however long it retries, and the
// entry limit is 10K. Batches also have to fit several to the minute.
const MAX_BATCH_TOKENS = 4500;

// Prose runs at about 4 characters per token, but spreadsheet rows measured
// about 2, because digits and punctuation tokenise far worse than words.
function estimateTokens(text: string): number {
  const nonLetters = text.replace(/[A-Za-z\s]/g, '').length;
  return Math.max(1, Math.ceil(text.length / 4 + nonLetters / 2.2));
}

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * POST to Voyage, waiting out rate limits and brief outages. The rate limit
 * resets within a minute, so ordinary use recovers without the user seeing it.
 */
async function postToVoyage(
  apiKey: string,
  payload: Record<string, unknown>,
  deadlineAt: number
): Promise<VoyageEmbeddingResponse> {
  let attempt = 0;

  while (true) {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) return response.json();

    const retryable = response.status === 429 || response.status >= 500;
    const errorText = await response.text();

    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const waitMs = retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : Math.min(5_000 * 2 ** attempt, 30_000);

    if (!retryable || Date.now() + waitMs > deadlineAt) {
      if (response.status === 429) {
        throw new Error(
          'The document search service is at its rate limit right now. Please wait a minute and try again. ' +
          'Very large documents may need to be split into smaller files.'
        );
      }
      throw new Error(`Voyage embedding API error (${response.status}): ${errorText}`);
    }

    await sleep(waitMs);
    attempt++;
  }
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
export async function embedTexts(
  texts: string[],
  deadlineAt: number = Date.now() + DOCUMENT_DEADLINE_MS
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not configured. Add it to your environment variables.');
  }

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

      // Reached the end of the text. Without this stop, the overlap step
      // below moves `start` back and the loop never finishes.
      if ((sliceEnd || end) >= text.length) break;

      // advance with overlap, always moving forward
      start = Math.max((sliceEnd || end) - PART_OVERLAP_CHARS, start + 1);
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

    const data = await postToVoyage(apiKey, {
      input: batchInputs,
      model: EMBEDDING_MODEL,
      input_type: 'document',
    }, deadlineAt);
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
 * Embed as many leading texts as possible in one analysis step, and return
 * their vectors. The caller saves them and comes back for the rest, so a file
 * of any size finishes at whatever speed the Voyage plan allows.
 */
export async function embedWithinBudget(texts: string[], budgetMs: number): Promise<number[][]> {
  const startedAt = Date.now();
  const deadlineAt = startedAt + DOCUMENT_DEADLINE_MS;
  const embedded: number[][] = [];

  while (embedded.length < texts.length && (embedded.length === 0 || Date.now() - startedAt < budgetMs)) {
    const group: string[] = [];
    let groupTokens = 0;
    for (let i = embedded.length; i < texts.length && group.length < MAX_BATCH_INPUTS; i++) {
      const tokens = estimateTokens(texts[i]);
      if (group.length > 0 && groupTokens + tokens > MAX_BATCH_TOKENS) break;
      group.push(texts[i]);
      groupTokens += tokens;
    }

    try {
      embedded.push(...await embedTexts(group, deadlineAt));
    } catch (err) {
      // Keep what this step finished. The next step picks up from there.
      if (embedded.length > 0) break;
      throw err;
    }
  }

  return embedded;
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

  const data = await postToVoyage(apiKey, {
    input: [query],
    model: EMBEDDING_MODEL,
    input_type: 'query',
  }, Date.now() + QUERY_DEADLINE_MS);
  return data.data[0].embedding;
}
