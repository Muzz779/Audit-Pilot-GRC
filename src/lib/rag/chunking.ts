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
//
// RULE: every line of source text must reach a chunk. Heading
// detection only LABELS a section; it must never remove text.
// Short lines are often real evidence ("Approved by: Board of
// Directors", "Laptops use full disk encryption"), and text the
// AI can't see turns into a false "gap" finding.
//
// Spreadsheets take a separate path: rows are grouped with their
// column names repeated, and cited by row range.
// ============================================================

import type { PageContent, TabularSheet } from './extraction';

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

// Words that stay lower-case in a genuine Title Case heading
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
]);

// True for "Network and Application Security", false for
// "Laptops use full disk encryption" (a sentence-case list item).
function isTitleCased(line: string): boolean {
  const significant = line
    .split(/\s+/)
    .filter(word => /[A-Za-z]/.test(word))
    .filter(word => !MINOR_WORDS.has(word.toLowerCase()));
  if (significant.length === 0) return false;
  const capitalised = significant.filter(word => /^[^A-Za-z]*[A-Z]/.test(word)).length;
  return capitalised / significant.length >= 0.75;
}

// Heuristic heading detector: short lines, title case or all caps,
// no trailing punctuation — catches most "Section 4: Foo" style headings.
// Used only to label sections. A false positive mislabels a section;
// it does not lose the line.
function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  if (/[.;,]$/.test(trimmed)) return false; // headings rarely end mid-sentence

  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const looksNumbered = /^(\d+(\.\d+)*[\.\)]?\s+|\b(Section|Article|Clause|Chapter)\s+\d+)/i.test(trimmed);
  const isShortTitleCase = trimmed.split(' ').length <= 10 &&
    /^[A-Z]/.test(trimmed) &&
    !trimmed.includes('. ') &&
    isTitleCased(trimmed);

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
  let bufferHasNewText = false; // false when the buffer holds only overlap from the last chunk
  let paragraphCounter = 0;

  const pushChunk = () => {
    const text = buffer.trim();
    chunks.push({
      chunkIndex: chunkIndex++,
      text,
      pageNumber: page.pageNumber,
      sectionTitle: currentSection,
      paragraphId: `p${paragraphCounter}`,
      estimatedTokens: Math.ceil(text.length / 4),
    });
  };

  const flushBuffer = () => {
    if (buffer.trim().length >= MIN_CHUNK_CHARS || (buffer.trim().length > 0 && chunks.length === 0)) {
      pushChunk();
      // Keep a small overlap tail for context continuity
      buffer = buffer.slice(-OVERLAP_CHARS);
      bufferHasNewText = false;
    }
  };

  for (const para of rawParagraphs) {
    if (looksLikeHeading(para)) {
      // Close the previous section, then label the new one. The heading
      // line still falls through and is added to the text below.
      if (bufferHasNewText && buffer.trim().length > 0) flushBuffer();
      currentSection = para;
    }

    paragraphCounter++;

    if (buffer.length + para.length > TARGET_CHUNK_CHARS && buffer.trim().length >= MIN_CHUNK_CHARS) {
      flushBuffer();
    }

    buffer += (buffer ? '\n\n' : '') + para;
    bufferHasNewText = true;
  }

  // Flush remaining content
  if (bufferHasNewText && buffer.trim().length > 0) pushChunk();

  return chunks;
}

/**
 * Chunk a spreadsheet: groups of rows, each group repeating the sheet name
 * and column names so a row still makes sense when retrieved on its own.
 */
function chunkSheet(sheet: TabularSheet, startIndex: number): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = startIndex;

  const preamble = [
    sheet.sheetName ? `Sheet: ${sheet.sheetName}` : null,
    sheet.columns.length > 0 ? `Columns: ${sheet.columns.join(' | ')}` : null,
  ].filter(Boolean).join('\n');

  let lines: string[] = [];
  let firstRow = 0;
  let lastRow = 0;
  let size = preamble.length;

  const flush = () => {
    if (lines.length === 0) return;
    const text = [preamble, ...lines].filter(Boolean).join('\n');
    const rows = firstRow === lastRow ? `row ${firstRow}` : `rows ${firstRow}–${lastRow}`;
    chunks.push({
      chunkIndex: chunkIndex++,
      text,
      pageNumber: null, // spreadsheets have no pages — the citation is the row range
      sectionTitle: sheet.sheetName ? `${sheet.sheetName}, ${rows}` : rows.charAt(0).toUpperCase() + rows.slice(1),
      paragraphId: `rows-${firstRow}-${lastRow}`,
      estimatedTokens: Math.ceil(text.length / 4),
    });
    lines = [];
    size = preamble.length;
  };

  for (const row of sheet.rows) {
    const line = `Row ${row.rowNumber}: ${row.text}`;
    if (lines.length > 0 && size + line.length + 1 > TARGET_CHUNK_CHARS) flush();
    if (lines.length === 0) firstRow = row.rowNumber;
    lines.push(line);
    lastRow = row.rowNumber;
    size += line.length + 1;
  }
  flush();

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
    const pageChunks = page.tabular
      ? chunkSheet(page.tabular, runningIndex)
      : chunkPage(page, runningIndex);
    allChunks.push(...pageChunks);
    runningIndex += pageChunks.length;
  }

  return allChunks;
}
