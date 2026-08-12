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
// - Scanned/image-only PDFs → rejected with a clear message (Phase 1)
// - DOCX → mammoth
// - Plain text / CSV → read directly
// - Images → Claude vision OCR
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface PageContent {
  pageNumber: number;
  text: string;
  extractionMethod: 'native' | 'ocr';
}

export interface ExtractionResult {
  pages: PageContent[];
  totalPages: number;
  documentTitle?: string;
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

  if (type.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    return extractPdf(fileBuffer);
  }

  if (
    type.includes('wordprocessingml') ||
    type.includes('msword') ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    return extractDocx(fileBuffer);
  }

  if (type.includes('text/plain') || fileName.toLowerCase().endsWith('.txt')) {
    return extractPlainText(fileBuffer);
  }

  if (type.includes('csv') || fileName.toLowerCase().endsWith('.csv')) {
    return extractPlainText(fileBuffer);
  }

  if (type.includes('image')) {
    return extractImageViaOcr(fileBuffer, type);
  }

  throw new Error(
    `Unsupported file type for analysis: ${fileType}. Phase 1 supports PDF, DOCX, TXT, CSV, and images.`
  );
}

// ============================================================
// PDF EXTRACTION (unpdf / PDF.js)
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

  const pages: PageContent[] = (pageTexts as string[])
    .map((raw, i) => ({
      pageNumber: i + 1,
      text: (raw || '').trim(),
      extractionMethod: 'native' as const,
    }))
    .filter(p => p.text.length > 0);

  // If every page came back essentially empty, it's almost certainly a scan
  if (pages.length === 0) {
    throw new Error(
      'This PDF appears to be scanned with no extractable text. ' +
      'Scanned-PDF OCR is not yet supported in Phase 1 — please upload native PDFs or images for now.'
    );
  }

  return { pages, totalPages };
}

// ============================================================
// DOCX EXTRACTION
// ============================================================

async function extractDocx(fileBuffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer: fileBuffer });

  // DOCX has no native page concept, so citations reference section/paragraph
  return {
    pages: [
      { pageNumber: 1, text: result.value.trim(), extractionMethod: 'native' },
    ],
    totalPages: 1,
  };
}

// ============================================================
// PLAIN TEXT / CSV
// ============================================================

async function extractPlainText(fileBuffer: Buffer): Promise<ExtractionResult> {
  const text = fileBuffer.toString('utf-8').trim();
  return {
    pages: [{ pageNumber: 1, text, extractionMethod: 'native' }],
    totalPages: 1,
  };
}

// ============================================================
// IMAGE OCR VIA CLAUDE VISION
// ============================================================

async function extractImageViaOcr(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const base64 = fileBuffer.toString('base64');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const message = await anthropic.messages.create({
    model,
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
    pages: [{ pageNumber: 1, text: extractedText.trim(), extractionMethod: 'ocr' }],
    totalPages: 1,
  };
}
