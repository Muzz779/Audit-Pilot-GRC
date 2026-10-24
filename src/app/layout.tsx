import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Toaster } from 'sonner';
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

export const metadata: Metadata = {
  title: {
    default: 'AuditPilot — AI-Powered GRC Platform',
    template: '%s | AuditPilot',
  },
  description:
    'AuditPilot is an AI-powered Governance, Risk & Compliance platform. Manage POPIA, ISO 27001, SOC 2, King IV and more — all in one place.',
  keywords: ['GRC', 'POPIA', 'compliance', 'risk management', 'ISO 27001', 'South Africa', 'audit', 'governance'],
  authors: [{ name: 'AuditPilot' }],
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: 'https://auditpilot.co.za',
    title: 'AuditPilot — AI-Powered GRC Platform',
    description: 'Manage compliance, risks and audits with AI automation. POPIA, ISO 27001, SOC 2 and more.',
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
