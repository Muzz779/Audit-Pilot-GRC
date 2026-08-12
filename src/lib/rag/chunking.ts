// ============================================================
// AuditPilot — Chunking Engine
// ============================================================
//
// Splits extracted page content into semantic chunks suitable
// for embedding and retrieval. Each chunk retains:
//   - the page number it came from
//   - a best-effort section title (detected from heading patterns)
//   - its position in the document
//
// Chunking strategy: paragraph-aware sliding window.
// We don't just cut every N characters — we try to keep
// paragraphs whole, and only split mid-paragraph if it's
// unusually long. This matters because a citation that cuts
// a sentence in half is useless for an audit finding.
// ============================================================

import type { PageContent } from './extraction';

export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  paragraphId: string | null;
  estimatedTokens: number;
}

// Target chunk size — small enough for precise citations,
// large enough to retain context. ~300-500 tokens is a common
// sweet spot for retrieval quality.
const TARGET_CHUNK_CHARS = 1400; // roughly 300-400 tokens
const MIN_CHUNK_CHARS = 200;     // avoid tiny orphan chunks
const OVERLAP_CHARS = 150;       // slight overlap preserves context across chunk boundaries

// Heuristic heading detector: short lines, title case or all caps,
// no trailing punctuation — catches most "Section 4: Foo" style headings
function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  if (/[.;,]$/.test(trimmed)) return false; // headings rarely end mid-sentence

  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const looksNumbered = /^(\d+(\.\d+)*[\.\)]?\s+|\b(Section|Article|Clause|Chapter)\s+\d+)/i.test(trimmed);
  const isShortTitleCase = trimmed.split(' ').length <= 10 &&
    /^[A-Z]/.test(trimmed) &&
    !trimmed.includes('. ');

  return isAllCaps || looksNumbered || (isShortTitleCase && trimmed.length < 70);
}

/**
 * Chunk a single page's text into one or more DocumentChunk objects.
 */
function chunkPage(page: PageContent, startIndex: number): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = startIndex;
  let currentSection: string | null = null;

  // Split into paragraphs (double newline, or single newline as fallback)
  const rawParagraphs = page.text
    .split(/\n\s*\n/)
    .flatMap(block => block.split('\n'))
    .map(p => p.trim())
    .filter(p => p.length > 0);

  let buffer = '';
  let paragraphCounter = 0;

  const flushBuffer = () => {
    if (buffer.trim().length >= MIN_CHUNK_CHARS || (buffer.trim().length > 0 && chunks.length === 0)) {
      chunks.push({
        chunkIndex: chunkIndex++,
        text: buffer.trim(),
        pageNumber: page.pageNumber,
        sectionTitle: currentSection,
        paragraphId: `p${paragraphCounter}`,
        estimatedTokens: Math.ceil(buffer.trim().length / 4),
      });
      // Keep a small overlap tail for context continuity
      buffer = buffer.slice(-OVERLAP_CHARS);
    }
  };

  for (const para of rawParagraphs) {
    if (looksLikeHeading(para)) {
      // Flush whatever we have before starting a new section
      if (buffer.trim().length > 0) flushBuffer();
      currentSection = para;
      paragraphCounter++;
      continue;
    }

    paragraphCounter++;

    if (buffer.length + para.length > TARGET_CHUNK_CHARS && buffer.trim().length >= MIN_CHUNK_CHARS) {
      flushBuffer();
    }

    buffer += (buffer ? '\n\n' : '') + para;
  }

  // Flush remaining content
  if (buffer.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      text: buffer.trim(),
      pageNumber: page.pageNumber,
      sectionTitle: currentSection,
      paragraphId: `p${paragraphCounter}`,
      estimatedTokens: Math.ceil(buffer.trim().length / 4),
    });
  }

  return chunks;
}

/**
 * Chunk an entire document (all pages) into a flat array of chunks
 * with continuous indexing and accurate page references.
 */
export function chunkDocument(pages: PageContent[]): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];
  let runningIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkPage(page, runningIndex);
    allChunks.push(...pageChunks);
    runningIndex += pageChunks.length;
  }

  return allChunks;
}
