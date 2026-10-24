'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield, ShieldCheck, CheckCircle, ArrowRight, BarChart3,
  Lock, FileText, Bot, ChevronDown, Menu, X,
  Upload, FileSearch, ClipboardCheck, Quote, Eye, Scale, Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING_PLANS } from '@/lib/payfast';

/* ── Content ─────────────────────────────────────────────────────────── */

const STEPS = [
  { icon: Upload, step: '01', title: 'Upload your evidence', desc: 'Drop in your policies, registers and procedures as PDFs. AuditPilot reads every page — citations are page-accurate.' },
  { icon: FileSearch, step: '02', title: 'AI audits each control', desc: 'For every POPIA control it finds the governing section of the Act and the matching evidence in your own documents.' },
  { icon: ClipboardCheck, step: '03', title: 'You review the drafts', desc: 'Each finding — Satisfied, Partial or Gap — is a draft with a citation. Your team accepts or dismisses it. Nothing is auto-finalised.' },
  { icon: FileText, step: '04', title: 'Export a board report', desc: 'Accepted findings become a clean, cited compliance report you can print to PDF for your board or auditor.' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'POPIA, done properly', desc: 'Purpose-built for the Protection of Personal Information Act — controls, evidence and findings mapped to the actual sections of the law.' },
  { icon: Quote, title: 'Every finding is cited', desc: 'No black-box verdicts. Each finding traces back to the exact document and page it came from, so you can defend it in a real audit.' },
  { icon: Eye, title: 'Human-in-the-loop', desc: 'AuditPilot produces drafts. A qualified person on your team reviews and accepts each finding before it enters your compliance record.' },
  { icon: Bot, title: 'AI that assists, not guesses', desc: 'Claude drafts first-pass policies, risk assessments and regulatory scans — grounded in your evidence, for your team to review.' },
  { icon: BarChart3, title: 'Risk register & heat map', desc: 'Score, visualise and prioritise risks by likelihood and impact, and tie them back to the controls that mitigate them.' },
  { icon: Lock, title: 'Isolated, encrypted data', desc: 'Built on Supabase with row-level security — every organisation’s data is encrypted and fully isolated from every other tenant.' },
];

const FRAMEWORKS = [
  { name: 'POPIA', desc: 'SA data privacy', audited: true },
  { name: 'ISO 27001', desc: 'Information security', audited: false },
  { name: 'SOC 2', desc: 'Service org controls', audited: false },
  { name: 'GDPR', desc: 'EU data protection', audited: false },
  { name: 'King IV', desc: 'SA governance', audited: false },
  { name: 'NIS2', desc: 'EU cyber directive', audited: false },
  { name: 'PCI-DSS', desc: 'Payment card security', audited: false },
  { name: 'NIST CSF', desc: 'Cybersecurity framework', audited: false },
];

const PILLARS = [
  { icon: Fingerprint, title: 'Evidence-based, not guesswork', body: 'Every finding traces back to the exact document and page it came from — and when the evidence isn’t there, it says so instead of guessing. Defensible, not just plausible.' },
  { icon: Scale, title: 'You stay in control', body: 'AuditPilot produces draft findings. Your qualified reviewer accepts each one before it becomes part of your compliance record.' },
  { icon: Shield, title: 'Built for South Africa', body: 'POPIA-first, written in South African English, and billed in ZAR via PayFast — made for local teams, not adapted from abroad.' },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const FAQS = [
    { q: 'Which frameworks can AuditPilot actually audit with AI?', a: 'POPIA is the framework with a full regulation base today — findings are cited to your own documents and to the relevant POPIA sections, and flagged as drafts for your review. You can also track ISO 27001, SOC 2, GDPR, King IV, NIS2, PCI-DSS and NIST CSF in the platform, with AI-backed auditing for each rolling out as its regulation base is prepared and legally reviewed.' },
    { q: 'How does AuditPilot avoid “hallucinated” compliance answers?', a: 'It only answers from evidence it can retrieve from your documents and the regulation base, and it cites the source every time. When the evidence does not cover a requirement, it says so rather than guessing — and every finding is a draft a human must accept.' },
    { q: 'Is the POPIA content legally verified?', a: 'The POPIA knowledge base was drafted from the public text of the Act and is clearly marked as unverified until a qualified practitioner reviews it. AuditPilot shows that notice wherever the regulation is used — we would rather be transparent than overstate.' },
    { q: 'How does PayFast billing work?', a: 'Billing is in ZAR via PayFast — no forex and no overseas cards. Start on the free plan, upgrade when it is proving its worth, and cancel anytime with no lock-in.' },
    { q: 'Where does my compliance data live?', a: 'Each organisation’s data is encrypted and isolated using row-level security, evidence files are served through short-lived signed links rather than public URLs, and access is controlled per role. Your uploaded documents are used only to generate your findings — we don’t use them to train any AI models, and they’re never shared with other organisations. AI processing runs on Anthropic (Claude) and Voyage AI under their commercial API terms.' },
    { q: 'Can I import my existing policies and registers?', a: 'Yes — upload your policy and evidence PDFs directly, or start from the built-in policy templates and customise them. Your uploaded documents are what the AI audits against.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50">
      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-100 dark:border-ink-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-ink-900 dark:bg-brand-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-display-serif text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                AuditPilot<span className="text-brand-500"> ZA</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Product', 'How it works', 'Pricing', 'FAQ'].map(item => (
                <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white transition-colors">{item}</a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white font-medium">Sign in</Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 bg-ink-900 hover:bg-ink-800 dark:bg-brand-500 dark:hover:bg-brand-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Start free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <button className="md:hidden p-2" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-950 px-5 py-4 space-y-3">
            {['Product', 'How it works', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="block text-sm text-ink-600 dark:text-ink-300 py-1" onClick={() => setMobileMenuOpen(false)}>{item}</a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="text-sm text-center py-2 border border-ink-200 dark:border-ink-700 rounded-lg">Sign in</Link>
              <Link href="/register" className="text-sm text-center py-2 bg-ink-900 dark:bg-brand-500 text-white rounded-lg">Start free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* subtle grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(14,34,51,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,34,51,0.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, #000 55%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, #000 55%, transparent 100%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-600 dark:text-ink-200 shadow-sm mb-7">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              POPIA compliance, evidence-based · Built in South&nbsp;Africa
            </div>
            <h1 className="font-display-serif text-[2.6rem] leading-[1.05] sm:text-6xl font-semibold tracking-tight text-ink-900 dark:text-white mb-6">
              Compliance you can{' '}
              <span className="text-brand-500">prove</span>, not just claim.
            </h1>
            <p className="text-lg text-ink-500 dark:text-ink-300 leading-relaxed max-w-xl mb-8">
              AuditPilot is an AI auditor for POPIA. Upload your policies and it reads every page,
              checks them against the Act, and returns findings cited to the exact document and page —
              as drafts your team reviews and accepts. No guessing. No black box.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-800 dark:bg-brand-500 dark:hover:bg-brand-400 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:-translate-y-0.5 hover:shadow-lg">
                Start free — no card <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#how-it-works" className="inline-flex items-center justify-center gap-2 border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-ink-50 dark:hover:bg-ink-900 transition-colors">
                See how it works
              </Link>
            </div>
            <p className="text-xs text-ink-400 dark:text-ink-500">Free forever for small teams · Pro from R799/mo · Billed in ZAR via PayFast</p>
          </div>

          {/* Right: a real cited finding — the actual product */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/10 via-transparent to-transparent rounded-[2rem] blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-ink-200/70 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-2xl shadow-ink-900/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100 dark:border-ink-800">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-semibold text-ink-500 dark:text-ink-300">Finding · POPIA s19 — Security safeguards</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Satisfied
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-ink-400 dark:text-ink-500">Confidence</span>
                  <span className="font-semibold text-ink-700 dark:text-ink-200">High</span>
                  <span className="h-1 flex-1 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <span className="block h-full w-[86%] bg-brand-500 rounded-full" />
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-100">
                  The information security policy requires AES-256 encryption at rest and in transit and
                  enforces multi-factor authentication for all administrative access — meeting the
                  “appropriate, reasonable technical measures” standard of section 19.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-950 px-3 py-2">
                  <Quote className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span className="text-[11px] text-ink-500 dark:text-ink-300 truncate">
                    Cited: <span className="font-medium text-ink-700 dark:text-ink-100">Information Security Policy.pdf</span> — page 3
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-ink-400 dark:text-ink-500">Draft — pending your review</span>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-semibold text-ink-400 dark:text-ink-500 px-3 py-1.5 rounded-lg border border-ink-200 dark:border-ink-700">Dismiss</span>
                    <span className="text-[11px] font-semibold text-white bg-ink-900 dark:bg-brand-500 px-3 py-1.5 rounded-lg">Accept finding</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip (honest) ────────────────────────────────────── */}
      <section className="bg-ink-900 dark:bg-ink-900/60">
        <div className="max-w-6xl mx-auto px-5 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ['POPIA-first', 'Purpose-built for SA privacy law'],
            ['Cited findings', 'Linked to document & page'],
            ['Human-led', 'You accept every finding'],
            ['ZAR billing', 'Local, via PayFast'],
          ].map(([t, s]) => (
            <div key={t}>
              <p className="font-display-serif text-lg font-semibold text-white">{t}</p>
              <p className="text-xs text-ink-300 mt-0.5">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why it's different ──────────────────────────────────────── */}
      <section id="product" className="py-24 px-5 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 mb-3">Why it&apos;s different</p>
          <h2 className="font-display-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 dark:text-white mb-4">
            A wrong “you&apos;re compliant” has real legal consequences.
          </h2>
          <p className="text-ink-500 dark:text-ink-300 leading-relaxed">
            So AuditPilot is built to be accurate and defensible before it&apos;s built to impress —
            it&apos;s decision-support for your qualified reviewer, not a law firm, and nothing it
            produces is legal advice. Three principles make the difference.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map(p => (
            <div key={p.title} className="group p-7 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 hover:border-brand-300 dark:hover:border-brand-500/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-ink-900 dark:bg-brand-500/15 flex items-center justify-center mb-5">
                <p.icon className="w-5 h-5 text-white dark:text-brand-300" />
              </div>
              <h3 className="font-semibold text-ink-900 dark:text-white mb-2">{p.title}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-300 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-ink-50 dark:bg-ink-900/40 border-y border-ink-100 dark:border-ink-800">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 mb-3">How it works</p>
            <h2 className="font-display-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 dark:text-white">
              From a folder of PDFs to a board-ready report.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map(s => (
              <div key={s.step} className="relative p-6 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800">
                <span className="font-display-serif text-4xl font-semibold text-ink-100 dark:text-ink-800 absolute top-4 right-5 select-none">{s.step}</span>
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center mb-5">
                  <s.icon className="w-5 h-5 text-brand-600 dark:text-brand-300" />
                </div>
                <h3 className="font-semibold text-ink-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 mb-3">The platform</p>
          <h2 className="font-display-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Everything a lean compliance team needs.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="p-7 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 hover:shadow-lg hover:shadow-ink-900/5 transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-ink-50 dark:bg-ink-800 flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5 text-ink-700 dark:text-brand-300" />
              </div>
              <h3 className="font-semibold text-ink-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Frameworks ──────────────────────────────────────────────── */}
      <section className="py-20 bg-ink-50 dark:bg-ink-900/40 border-y border-ink-100 dark:border-ink-800">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display-serif text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900 dark:text-white mb-3">
              Track eight frameworks. AI-audit POPIA today.
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-300">
              We only turn on AI auditing for a framework once its regulation base is built and reviewed — so a finding is never grounded in guesswork.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {FRAMEWORKS.map(f => (
              <div key={f.name} className={cn(
                'relative p-4 rounded-xl border bg-white dark:bg-ink-900',
                f.audited ? 'border-brand-400 dark:border-brand-500/50 ring-1 ring-brand-400/40' : 'border-ink-100 dark:border-ink-800',
              )}>
                {f.audited && (
                  <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wide text-white bg-brand-500 px-2 py-0.5 rounded-full">AI-audited</span>
                )}
                <p className="font-semibold text-sm text-ink-900 dark:text-white">{f.name}</p>
                <p className="text-xs text-ink-400 dark:text-ink-500 mt-0.5">{f.desc}</p>
                {!f.audited && <p className="text-[10px] text-ink-400 dark:text-ink-500 mt-2">Track &amp; manage</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 mb-3">Pricing</p>
          <h2 className="font-display-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 dark:text-white mb-3">Simple pricing, in Rand.</h2>
          <p className="text-ink-500 dark:text-ink-300">Billed monthly in ZAR via PayFast. Pro costs less than a compliance consultant&apos;s day rate — start free, upgrade when it&apos;s proving its worth.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {Object.values(PRICING_PLANS).map(plan => (
            <div key={plan.id} className={cn(
              'rounded-2xl p-7 relative',
              plan.highlighted
                ? 'bg-ink-900 text-white shadow-2xl shadow-ink-900/20 md:-translate-y-2'
                : 'bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800',
            )}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[11px] font-bold px-3 py-1 rounded-full">Most popular</div>
              )}
              <h3 className={cn('font-semibold mb-1', plan.highlighted ? 'text-white' : 'text-ink-900 dark:text-white')}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className={cn('font-display-serif text-4xl font-semibold', plan.highlighted ? 'text-white' : 'text-ink-900 dark:text-white')}>{plan.price_display}</span>
              </div>
              <p className={cn('text-sm mb-6', plan.highlighted ? 'text-ink-300' : 'text-ink-500 dark:text-ink-300')}>{plan.description}</p>
              <ul className="space-y-2.5 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className={cn('w-4 h-4 shrink-0 mt-0.5', plan.highlighted ? 'text-brand-400' : 'text-emerald-500')} />
                    <span className={plan.highlighted ? 'text-ink-100' : 'text-ink-600 dark:text-ink-300'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.id === 'enterprise' ? 'mailto:sales@auditpilot.co.za' : '/register'}
                className={cn(
                  'block text-center py-3 rounded-xl font-semibold text-sm transition-all',
                  plan.highlighted
                    ? 'bg-brand-500 text-white hover:bg-brand-400'
                    : 'bg-ink-900 dark:bg-brand-500 text-white hover:bg-ink-800 dark:hover:bg-brand-400',
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-ink-400 dark:text-ink-500 mt-7">Starter is free forever. Pro is R799/mo excl. VAT (≈ R919 incl.), billed in ZAR via PayFast — cancel anytime, no lock-in. Need more seats, SSO or a dedicated instance? Talk to us about Enterprise.</p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-5 bg-ink-50 dark:bg-ink-900/40 border-y border-ink-100 dark:border-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display-serif text-3xl font-semibold tracking-tight text-center text-ink-900 dark:text-white mb-10">Questions, answered honestly.</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-ink-100 dark:border-ink-800 rounded-xl overflow-hidden bg-white dark:bg-ink-900">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors"
                >
                  <span className="font-medium text-sm text-ink-900 dark:text-white pr-4">{faq.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-ink-400 shrink-0 transition-transform', activeFaq === i && 'rotate-180')} />
                </button>
                {activeFaq === i && (
                  <div className="px-4 pb-4 text-sm text-ink-500 dark:text-ink-300 leading-relaxed border-t border-ink-50 dark:border-ink-800 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="relative max-w-5xl mx-auto rounded-3xl bg-ink-900 overflow-hidden px-6 py-16 text-center">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, #0ea5e9 0%, transparent 40%), radial-gradient(circle at 80% 80%, #38bdf8 0%, transparent 35%)',
            }}
          />
          <div className="relative">
            <h2 className="font-display-serif text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">See your POPIA gaps in minutes.</h2>
            <p className="text-ink-200 mb-8 max-w-lg mx-auto">Upload your policies, run an audit, and walk away with a cited report you can act on today — and show your board tomorrow.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors">
                Start free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="mailto:sales@auditpilot.co.za" className="inline-flex items-center justify-center gap-2 border border-white/25 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-ink-100 dark:border-ink-800 py-12 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-ink-900 dark:bg-brand-500 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-display-serif font-semibold text-ink-900 dark:text-white">AuditPilot</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-ink-500 dark:text-ink-400">
            <a href="/security" className="hover:text-ink-900 dark:hover:text-white">Security</a>
            <a href="/popia" className="hover:text-ink-900 dark:hover:text-white">Privacy Policy</a>
            <a href="/terms" className="hover:text-ink-900 dark:hover:text-white">Terms of Service</a>
            <a href="/popia" className="hover:text-ink-900 dark:hover:text-white">POPIA Notice</a>
            <a href="mailto:support@auditpilot.co.za" className="hover:text-ink-900 dark:hover:text-white">support@auditpilot.co.za</a>
          </div>
          <p className="text-xs text-ink-400 dark:text-ink-500">© 2026 AuditPilot · Built in South&nbsp;Africa</p>
        </div>
      </footer>
    </div>
  );
}
