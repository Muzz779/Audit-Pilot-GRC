import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Database, Bot, FileWarning, Trash2, BadgeCheck, Mail } from 'lucide-react';

export const metadata = {
  title: 'Security & Trust — AuditPilot',
  description: 'How AuditPilot stores, isolates and protects your compliance data — and what we are honest about.',
};

export default function SecurityPage() {
  const updated = '24 October 2026';

  return (
    <main className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50">
      {/* Top bar */}
      <div className="border-b border-ink-100 dark:border-ink-800">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ink-900 dark:bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-display-serif text-lg font-semibold tracking-tight">AuditPilot<span className="text-brand-500"> ZA</span></span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14">
        {/* Hero */}
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 mb-3">Security &amp; trust</p>
        <h1 className="font-display-serif text-4xl sm:text-5xl font-semibold tracking-tight mb-5">
          Your compliance data, handled carefully.
        </h1>
        <p className="text-lg text-ink-500 dark:text-ink-300 leading-relaxed">
          AuditPilot asks you to upload the very documents a compliance team most wants to protect. This page
          is a plain-language account of where that data lives, who can reach it, and the things we&rsquo;re
          deliberately honest about. If anything here is unclear, ask us — we&rsquo;d rather over-explain.
        </p>

        <Item icon={Database} title="Where your data lives">
          Your documents, findings and records are stored in a managed PostgreSQL database and private file
          storage, hosted on <strong>Supabase</strong> infrastructure in the <strong>European Union</strong>.
          Each customer organisation is a separate, isolated workspace. We are a South African product and
          handle POPIA cross-border transfer obligations accordingly; if your organisation requires data to
          remain in South Africa, talk to us.
        </Item>

        <Item icon={Lock} title="Isolation, access &amp; encryption">
          Every organisation&rsquo;s data is isolated using database <strong>row-level security</strong>, so one
          customer can never query another&rsquo;s records. Within your organisation, access is controlled per
          user role. Evidence files are never public — they are served through <strong>short-lived signed
          links</strong> generated on demand, not fixed URLs. Data is encrypted <strong>in transit</strong>{' '}
          (TLS) and <strong>at rest</strong>. Administrative database keys are used only on our servers and are
          never exposed to the browser.
        </Item>

        <Item icon={Bot} title="AI processing &amp; sub-processors">
          To read your documents and draft findings, AuditPilot sends the relevant text to two AI
          sub-processors: <strong>Anthropic (Claude)</strong> for analysis and drafting, and{' '}
          <strong>Voyage AI</strong> for the search embeddings that make citations page-accurate. Your text is
          sent only to produce your results. <strong>We do not use your documents to train any AI models</strong>,
          and your data is never shared with other organisations. These providers process data under their own
          commercial API terms, which we review as part of our sub-processor due diligence.
        </Item>

        <Item icon={FileWarning} title="The regulation base is unverified — on purpose">
          AuditPilot&rsquo;s POPIA knowledge base was drafted from the public text of the Act and is clearly
          marked <strong>unverified until a qualified legal practitioner reviews it</strong>. You&rsquo;ll see
          that notice wherever the regulation is used. Every finding is a <strong>draft</strong> that a person
          on your team must review and accept — nothing is auto-finalised, and AuditPilot is decision-support,
          not legal advice or a certificate of compliance.
        </Item>

        <Item icon={Trash2} title="Your data is yours">
          You can delete individual documents or your whole workspace at any time. When you delete a document,
          its stored file and the derived search data are removed. If you close your account, we delete your
          organisation&rsquo;s data within [30 days], except where we are legally required to retain something.
          You can request an export of your data by contacting us.
        </Item>

        <Item icon={BadgeCheck} title="What we don&rsquo;t claim">
          We&rsquo;ll be straight with you: AuditPilot is <strong>not yet ISO 27001 or SOC&nbsp;2 certified</strong>,
          and we won&rsquo;t pretend otherwise. We build to those principles — isolation, least-privilege access,
          encryption, auditability — and we&rsquo;ll pursue formal certification as we grow. Billing is handled
          by <strong>PayFast</strong> in ZAR; we never see or store your full card details.
        </Item>

        <Item icon={Mail} title="Reporting a security issue">
          If you believe you&rsquo;ve found a vulnerability, please email{' '}
          <a href="mailto:security@auditpilot.co.za" className="text-brand-600 hover:underline">security@auditpilot.co.za</a>.
          We&rsquo;ll acknowledge your report and work with you to resolve it. Please don&rsquo;t publicly
          disclose an issue until we&rsquo;ve had a chance to fix it.
        </Item>

        <p className="mt-12 text-xs text-ink-400 dark:text-ink-500">
          Last updated: {updated}. This page describes our current practices and will change as the product
          matures; it is informational and not a contractual commitment. See our{' '}
          <Link href="/terms" className="hover:underline">Terms</Link> and{' '}
          <Link href="/popia" className="hover:underline">Privacy Notice</Link> for the binding detail.
        </p>
      </div>
    </main>
  );
}

function Item({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 pt-8 border-t border-ink-100 dark:border-ink-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-ink-700 dark:text-brand-300" />
        </div>
        <h2 className="font-semibold text-lg text-ink-900 dark:text-white">{title}</h2>
      </div>
      <p className="text-sm sm:text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">{children}</p>
    </section>
  );
}
