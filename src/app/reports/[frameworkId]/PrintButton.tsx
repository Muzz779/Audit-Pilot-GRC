'use client';

import { Printer } from 'lucide-react';

// Small client control for the report — triggers the browser's print-to-PDF.
// Hidden when the page is actually printed (print:hidden).
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
