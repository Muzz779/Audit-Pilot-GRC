// ============================================================
// AuditPilot — Document Extraction Engine
// ============================================================
//
// Extracts text + page numbers from uploaded evidence files.
//
// PDF parsing uses `unpdf` (Mozilla PDF.js engine) — robust,
// serverless-friendly, and splits reliably by page so citations
// carry accurate page numbers. Replaced `pdf-parse`, which failed
// on many valid PDFs with "bad xref entry".
//
// - PDFs with selectable text → parsed via unpdf, per page
// - Scanned pages inside PDFs → Claude vision OCR, per page
// - DOCX → mammoth (no page concept, so cited by section)
// - Plain text → read directly (cited by section)
// - XLSX / CSV → parsed into rows (cited by row range)
// - Images → Claude vision OCR
//
// Nothing here is allowed to drop content quietly. Text we could
// not read is reported in `warnings` and shown to the user, because
// unread text can become a false "gap" finding.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OCR_MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Anthropic's PDF input limits
const MAX_OCR_PAGES = 100;
const MAX_OCR_BYTES = 32 * 1024 * 1024;
// Keeps OCR inside the analyze route's 120s limit
const OCR_MAX_TOKENS = 8000;
const OCR_TIMEOUT_MS = 100_000;
// A page with less text than this is a scan (at most a watermark or stamp)
const MIN_PAGE_TEXT_CHARS = 20;
// Analysis has to finish inside one request
const MAX_SPREADSHEET_ROWS = 50_000;

interface RawRow {
  rowNumber: number;
  cells: string[];
}

export interface TabularRow {
  rowNumber: number; // the row number the user sees in Excel
  text: string;
}

export interface TabularSheet {
  sheetName: string | null; // null for CSV, which has no sheets
  columns: string[];
  rows: TabularRow[];
}

export interface PageContent {
  pageNumber: number | null; // null when the format has no real pages
  text: string;
  extractionMethod: 'native' | 'ocr';
  tabular?: TabularSheet;
}

export interface ExtractionResult {
  pages: PageContent[];
  totalPages: number;
  documentTitle?: string;
  warnings?: string[]; // content that could not be read — always shown to the user
}

/**
 * Main entry point — routes to the correct extractor based on file type.
 */
export async function extractDocument(
  fileBuffer: Buffer,
  fileType: string,
  fileName: string
): Promise<ExtractionResult> {
  const type = fileType.toLowerCase();
  const name = fileName.toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return extractPdf(fileBuffer);
  }

  // Must come before the Excel check: Windows reports .csv files as "ms-excel"
  if (type.includes('csv') || name.endsWith('.csv')) {
    return extractCsv(fileBuffer);
  }

  if (name.endsWith('.xls')) {
    throw new Error(
      'Older Excel .xls files cannot be read. Please open it in Excel, save it as .xlsx or CSV, and upload that version.'
    );
  }

  if (type.includes('spreadsheetml') || type.includes('ms-excel') || name.endsWith('.xlsx')) {
    return extractSpreadsheet(fileBuffer);
  }

  if (name.endsWith('.doc')) {
    throw new Error(
      'Older Word .doc files cannot be read. Please open it in Word, save it as .docx or PDF, and upload that version.'
    );
  }

  if (type.includes('wordprocessingml') || type.includes('msword') || name.endsWith('.docx')) {
    return extractDocx(fileBuffer);
  }

  if (type.includes('text/plain') || name.endsWith('.txt')) {
    return extractPlainText(fileBuffer);
  }

  if (type.includes('image')) {
    return extractImageViaOcr(fileBuffer, type);
  }

  throw new Error(
    `Unsupported file type for analysis: ${fileType || fileName}. AuditPilot can analyze PDF, Word (.docx), Excel, CSV, TXT and image files.`
  );
}

// ============================================================
// PDF EXTRACTION (unpdf / PDF.js, with OCR for scanned pages)
// ============================================================

async function extractPdf(fileBuffer: Buffer): Promise<ExtractionResult> {
  // Dynamic import keeps unpdf out of the edge bundle
  const { getDocumentProxy, extractText } = await import('unpdf');

  let pdf;
  try {
    // unpdf wants a Uint8Array
    const uint8 = new Uint8Array(fileBuffer);
    pdf = await getDocumentProxy(uint8);
  } catch (err: any) {
    throw new Error(
      'This PDF could not be read — it may be corrupted or password-protected. Please re-save or re-export the PDF and try again.'
    );
  }

  const totalPages = pdf.numPages;

  // mergePages: false → returns an array of per-page strings
  const { text: pageTexts } = await extractText(pdf, { mergePages: false });

  const textByPage = new Map<number, string>();
  (pageTexts as string[]).forEach((raw, i) => textByPage.set(i + 1, (raw || '').trim()));

  const scannedPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => (textByPage.get(n) || '').length < MIN_PAGE_TEXT_CHARS);

  if (scannedPages.length === 0) {
    return { pages: buildPages(textByPage, new Map()), totalPages };
  }

  const { ocrByPage, failure } = await ocrPdfPages(fileBuffer, totalPages);

  const pages = buildPages(textByPage, ocrByPage);
  if (pages.length === 0) {
    throw new Error(failure
      ? `This PDF appears to be scanned, and the scanned text could not be read: ${failure}`
      : 'No readable text was found in this PDF.');
  }

  const unread = scannedPages.filter(n => !ocrByPage.has(n));
  const warnings = unread.length > 0
    ? [`${unread.length} of ${totalPages} pages could not be read (${describePages(unread)}), so their content is not included in this analysis.${failure ? ` ${failure}` : ''}`]
    : undefined;

  return { pages, totalPages, warnings };
}

function buildPages(textByPage: Map<number, string>, ocrByPage: Map<number, string>): PageContent[] {
  const pages: PageContent[] = [];
  for (const [pageNumber, nativeText] of textByPage) {
    const ocrText = ocrByPage.get(pageNumber);
    if (nativeText.length < MIN_PAGE_TEXT_CHARS && ocrText !== undefined) {
      if (ocrText.length > 0) pages.push({ pageNumber, text: ocrText, extractionMethod: 'ocr' });
    } else if (nativeText.length > 0) {
      pages.push({ pageNumber, text: nativeText, extractionMethod: 'native' });
    }
  }
  return pages.sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
}

function describePages(pages: number[]): string {
  const shown = pages.slice(0, 10).join(', ');
  return pages.length > 10 ? `pages ${shown} and ${pages.length - 10} more` : `page${pages.length > 1 ? 's' : ''} ${shown}`;
}

/**
 * OCR a whole PDF with Claude. Returns the text of each page it finished
 * (blank pages come back as ''), plus a reason if it could not finish.
 */
async function ocrPdfPages(
  fileBuffer: Buffer,
  totalPages: number
): Promise<{ ocrByPage: Map<number, string>; failure: string | null }> {
  const ocrByPage = new Map<number, string>();

  if (totalPages > MAX_OCR_PAGES || fileBuffer.length > MAX_OCR_BYTES) {
    return {
      ocrByPage,
      failure: `Scanned reading is limited to ${MAX_OCR_PAGES} pages and 32MB. Please split the document and upload the parts.`,
    };
  }

  try {
    const message = await anthropic.messages.create(
      {
        model: OCR_MODEL(),
        max_tokens: OCR_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: fileBuffer.toString('base64'),
                },
              },
              {
                type: 'text',
                text:
                  'Transcribe this PDF exactly as it appears, page by page. Start each page with a line ' +
                  'containing only <<<PAGE n>>> where n is the page number in the file. Copy the words ' +
                  'verbatim and keep headings and paragraph structure. Do not summarise, correct, or add ' +
                  'commentary. Never guess at text you cannot read: write [illegible] in its place. ' +
                  'If a page has no text, write nothing after its marker.',
              },
            ] as any, // the installed SDK's types predate the `document` block
          },
        ],
      },
      { timeout: OCR_TIMEOUT_MS }
    );

    const output = (message.content[0] as { text: string }).text || '';
    const truncated = message.stop_reason === 'max_tokens';

    const sections = output.split(/<<<PAGE (\d+)>>>/);
    const parsed: Array<[number, string]> = [];
    for (let i = 1; i < sections.length; i += 2) {
      parsed.push([Number(sections[i]), (sections[i + 1] || '').trim()]);
    }
    // The last page of a cut-off response is incomplete, so it counts as unread
    if (truncated) parsed.pop();
    for (const [pageNumber, text] of parsed) ocrByPage.set(pageNumber, text);

    return {
      ocrByPage,
      failure: truncated
        ? 'The document is too long to read in one pass. Please split it into smaller parts.'
        : null,
    };
  } catch (err: any) {
    console.error('PDF OCR error:', err);
    return { ocrByPage, failure: 'The scanned-text reader was unavailable. Please try again shortly.' };
  }
}

// ============================================================
// DOCX EXTRACTION
// ============================================================

async function extractDocx(fileBuffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer: fileBuffer });

  // DOCX has no page concept, so citations reference the section. Claiming
  // "Page 1" for everything would be a false citation.
  return {
    pages: [
      { pageNumber: null, text: result.value.trim(), extractionMethod: 'native' },
    ],
    totalPages: 1,
  };
}

// ============================================================
// PLAIN TEXT
// ============================================================

async function extractPlainText(fileBuffer: Buffer): Promise<ExtractionResult> {
  return {
    pages: [{ pageNumber: null, text: decodeText(fileBuffer), extractionMethod: 'native' }],
    totalPages: 1,
  };
}

function decodeText(fileBuffer: Buffer): string {
  // Some accounting packages export UTF-16
  if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe) {
    return fileBuffer.toString('utf16le').replace(/^﻿/, '').trim();
  }
  return fileBuffer.toString('utf-8').replace(/^﻿/, '').trim();
}

// ============================================================
// SPREADSHEETS (XLSX / CSV)
// ============================================================

async function extractCsv(fileBuffer: Buffer): Promise<ExtractionResult> {
  const text = decodeText(fileBuffer);
  if (text.length === 0) throw new Error('This CSV file is empty.');

  const rows = parseCsv(text, detectDelimiter(text))
    .map((cells, i) => ({ rowNumber: i + 1, cells }));
  const sheet = buildSheet(null, rows);
  if (!sheet) throw new Error('No data rows were found in this CSV file.');
  assertRowLimit(sheet.rows.length);

  return { pages: [sheetToPage(sheet)], totalPages: 1 };
}

async function extractSpreadsheet(fileBuffer: Buffer): Promise<ExtractionResult> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(fileBuffer as any);
  } catch {
    throw new Error(
      'This spreadsheet could not be read — it may be corrupted or password-protected. Please remove the password or re-save it as .xlsx, then try again.'
    );
  }

  const sheets: TabularSheet[] = [];
  for (const worksheet of workbook.worksheets) {
    const rows: RawRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell: any, column: number) => {
        cells[column - 1] = cellToText(cell.value);
      });
      rows.push({ rowNumber, cells: Array.from(cells, cell => cell ?? '') });
    });

    const sheet = buildSheet(worksheet.name, rows);
    if (sheet) sheets.push(sheet);
  }

  if (sheets.length === 0) throw new Error('No data was found in this spreadsheet.');
  assertRowLimit(sheets.reduce((total, sheet) => total + sheet.rows.length, 0));

  return { pages: sheets.map(sheetToPage), totalPages: sheets.length };
}

// Excel cells can hold dates, formulas, rich text or hyperlinks, not just plain values
function cellToText(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value.richText)) return value.richText.map((part: any) => part.text).join('');
  if ('result' in value) return cellToText(value.result);
  if ('text' in value) return String(value.text);
  if ('error' in value) return String(value.error);
  return '';
}

function assertRowLimit(rowCount: number) {
  if (rowCount > MAX_SPREADSHEET_ROWS) {
    throw new Error(
      `This spreadsheet has ${rowCount.toLocaleString('en-ZA')} rows, and the limit is ${MAX_SPREADSHEET_ROWS.toLocaleString('en-ZA')} per file. Please split it into smaller files, for example by month.`
    );
  }
}

function sheetToPage(sheet: TabularSheet): PageContent {
  return {
    pageNumber: null,
    text: sheet.rows.map(row => row.text).join('\n'),
    extractionMethod: 'native',
    tabular: sheet,
  };
}

/**
 * Turn raw rows into a sheet. Exports often start with title lines, so the
 * column header is the first row about as wide as the data. Title lines are
 * kept as rows. Blank rows are skipped, but numbering still matches the file.
 */
function buildSheet(sheetName: string | null, rawRows: RawRow[]): TabularSheet | null {
  const cleaned = rawRows.map(({ rowNumber, cells }) => ({
    rowNumber,
    cells: cells.map(cell => String(cell ?? '').replace(/\s+/g, ' ').trim()),
  }));

  const filled = (cells: string[]) => cells.filter(cell => cell.length > 0).length;
  const nonEmpty = cleaned.filter(row => filled(row.cells) > 0);
  if (nonEmpty.length === 0) return null;

  const widest = Math.max(...nonEmpty.slice(0, 50).map(row => filled(row.cells)));
  const headerRow = nonEmpty.slice(0, 50).find(row => filled(row.cells) >= Math.ceil(widest / 2)) || nonEmpty[0];

  const toText = (cells: string[]) => {
    const last = cells.reduce((end, cell, i) => (cell.length > 0 ? i : end), -1);
    return cells.slice(0, last + 1).join(' | ');
  };

  return {
    sheetName,
    columns: headerRow.cells.filter(cell => cell.length > 0),
    rows: nonEmpty
      .filter(row => row !== headerRow)
      .map(row => ({ rowNumber: row.rowNumber, text: toText(row.cells) })),
  };
}

// South African Excel exports commonly use semicolons
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const candidates = [',', ';', '\t', '|'];
  const count = (delimiter: string) => firstLine.split(delimiter).length - 1;
  return candidates.reduce((best, candidate) => (count(candidate) > count(best) ? candidate : best), ',');
}

// RFC 4180 parser: handles quoted fields, escaped quotes and newlines in cells
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows;
}

// ============================================================
// IMAGE OCR VIA CLAUDE VISION
// ============================================================

async function extractImageViaOcr(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const base64 = fileBuffer.toString('base64');

  const message = await anthropic.messages.create({
    model: OCR_MODEL(),
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text:
              'Extract ALL visible text from this image exactly as it appears, preserving ' +
              'paragraph structure and any headings. Do not summarise, interpret, or add ' +
              'commentary — output only the raw extracted text. If the image contains no ' +
              'readable text, respond with exactly: [NO TEXT DETECTED]',
          },
        ],
      },
    ],
  });

  const extractedText = (message.content[0] as { text: string }).text;

  if (extractedText.trim() === '[NO TEXT DETECTED]') {
    throw new Error('No readable text was detected in this image.');
  }

  return {
    pages: [{ pageNumber: null, text: extractedText.trim(), extractionMethod: 'ocr' }],
    totalPages: 1,
  };
}
