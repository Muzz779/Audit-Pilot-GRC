import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Toaster } from 'sonner';
import { getAppUrl } from '@/lib/app-url';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Editorial display face for headlines (matches the sales deck). Body stays Inter.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
  display: 'swap',
});

// Descriptions match what the product does: AI audits cover POPIA only.
const DESCRIPTION =
  'AuditPilot is an AI auditor for POPIA. Upload your policies and evidence and get draft findings cited to the document and page, for your team to review. Track risks, policies and other frameworks alongside.';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: 'AuditPilot — AI-Powered GRC Platform',
    template: '%s | AuditPilot',
  },
  description: DESCRIPTION,
  keywords: ['GRC', 'POPIA', 'compliance', 'risk management', 'South Africa', 'audit', 'governance'],
  authors: [{ name: 'AuditPilot' }],
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/',
    title: 'AuditPilot — AI-Powered GRC Platform',
    description: DESCRIPTION,
    siteName: 'AuditPilot',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sourceSerif.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
