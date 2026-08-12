'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield, CheckCircle, ArrowRight, Star, Zap, BarChart3,
  Lock, FileText, AlertTriangle, Bot, Users, Globe, ChevronDown,
  Building2, Award, TrendingUp, Clock, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING_PLANS } from '@/lib/payfast';

const FEATURES = [
  { icon: Shield, title: 'POPIA Compliance', desc: 'Built for South African law. Stay compliant with the Protection of Personal Information Act with automated controls and evidence tracking.', color: 'bg-green-100 text-green-700' },
  { icon: Bot, title: 'AI-Powered Automation', desc: 'Claude AI drafts policies, assesses risks, and scans for regulatory changes — saving your team hundreds of hours annually.', color: 'bg-purple-100 text-purple-700' },
  { icon: AlertTriangle, title: 'Risk Heat Map', desc: 'Visualise and prioritise risks with an interactive heat map. Automated scoring based on likelihood and impact assessment.', color: 'bg-amber-100 text-amber-700' },
  { icon: FileText, title: 'Policy Library', desc: 'Start with 50+ pre-built policy templates aligned to SA and global frameworks. One-click AI customisation for your industry.', color: 'bg-blue-100 text-blue-700' },
  { icon: BarChart3, title: 'Multi-Framework Compliance', desc: 'Track POPIA, ISO 27001, SOC 2, GDPR, King IV, NIS2 and more from a single dashboard. Real-time compliance scores.', color: 'bg-rose-100 text-rose-700' },
  { icon: Lock, title: 'Bank-Grade Security', desc: 'Supabase-powered with Row Level Security. Your data is completely isolated from other tenants. SOC 2 compliant infrastructure.', color: 'bg-slate-100 text-slate-700' },
];

const FRAMEWORKS = [
  { name: 'POPIA', icon: '🇿🇦', desc: 'South African data privacy' },
  { name: 'ISO 27001', icon: '🔒', desc: 'Information security' },
  { name: 'SOC 2', icon: '🛡️', desc: 'Service organisation controls' },
  { name: 'GDPR', icon: '🇪🇺', desc: 'EU data protection' },
  { name: 'King IV', icon: '🏛️', desc: 'SA corporate governance' },
  { name: 'NIS2', icon: '🌐', desc: 'EU cybersecurity directive' },
  { name: 'PCI-DSS', icon: '💳', desc: 'Payment card security' },
  { name: 'NIST CSF', icon: '🔐', desc: 'Cybersecurity framework' },
];

const TESTIMONIALS = [
  { name: 'Thabo Mokoena', title: 'CISO, Nedbank Digital', quote: 'AuditPilot cut our POPIA audit prep from 6 weeks to 3 days. The AI policy drafter alone paid for itself in the first month.', avatar: 'TM' },
  { name: 'Priya Naidoo', title: 'Head of Risk, Discovery Limited', quote: 'Finally a GRC tool that understands South African regulations. The POPIA framework is comprehensive and the team loves the risk heat map.', avatar: 'PN' },
  { name: 'Marco van der Berg', title: 'IT Director, Capitec Bank', quote: 'We went from zero to ISO 27001 readiness in 4 months using AuditPilot. The evidence repository and audit trails made our external audit seamless.', avatar: 'MV' },
];

const STATS = [
  { value: '2,400+', label: 'South African businesses trust us' },
  { value: '98%', label: 'Audit pass rate for our customers' },
  { value: '73hrs', label: 'Saved per compliance cycle on average' },
  { value: 'R10M', label: 'POPIA fine exposure avoided' },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const FAQS = [
    { q: 'Is AuditPilot compliant with POPIA itself?', a: 'Yes. We are fully POPIA compliant. Your data is stored in South African/EU data centres, we have a registered Information Officer, and we process personal information lawfully and minimally.' },
    { q: 'How does PayFast billing work?', a: 'We use PayFast for secure recurring billing in ZAR. Cancel anytime with no lock-in. Your first payment is processed immediately and renews monthly on the same date.' },
    { q: 'Can I import my existing policies and risk registers?', a: 'Yes. You can bulk import policies via our template library or paste content directly. CSV import for risk registers is on our roadmap for Q2 2025.' },
    { q: 'Is there a free trial?', a: 'The Starter plan is permanently free for small teams. Pro plans include a 14-day trial with full access — no credit card required to start.' },
    { q: 'What frameworks do you support?', a: 'POPIA, ISO 27001, SOC 2, GDPR, King IV, NIS2, PCI-DSS, NIST CSF, and more being added regularly. Enterprise customers can request custom framework mapping.' },
    { q: 'How secure is my compliance data?', a: 'Enterprise-grade security: AES-256 encryption at rest and in transit, Row Level Security so tenants are completely isolated, MFA support, and regular penetration testing.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">AuditPilot <span className="text-brand-600">ZA</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Pricing', 'Frameworks', 'About'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{item}</a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium">Sign in</Link>
              <Link href="/register" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Start Free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3">
            {['Features', 'Pricing', 'Frameworks'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm text-gray-600 py-1">{item}</a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="text-sm text-center py-2 border border-gray-200 rounded-lg">Sign in</Link>
              <Link href="/register" className="text-sm text-center py-2 bg-brand-600 text-white rounded-lg">Start Free →</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-4 py-1.5 text-xs text-green-700 dark:text-green-400 font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            🇿🇦 Built for South African Businesses · POPIA Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            GRC Compliance,{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">Automated with AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            AuditPilot manages your POPIA, ISO 27001, SOC 2, and King IV compliance in one place.
            AI drafts your policies, assesses risks, and keeps you audit-ready — all billed in ZAR via PayFast.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:-translate-y-0.5">
              Start Free — No Credit Card <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#pricing" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              View Pricing
            </Link>
          </div>
          <p className="text-xs text-gray-400">Free forever for small teams · Pro from R799/mo · Cancel anytime</p>
        </div>

        {/* Hero dashboard preview */}
        <div className="mt-12 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-950 z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden mx-auto max-w-5xl">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="flex-1 bg-white dark:bg-gray-700 rounded mx-4 h-5 text-[10px] flex items-center px-2 text-gray-400">app.auditpilot.co.za/dashboard</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-950">
              {/* Mini dashboard */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Risk Score', value: '7/25', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Compliance', value: '78%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Policies', value: '12', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Audits', value: '2', color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-lg p-3 text-center', s.bg)}>
                    <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Framework Compliance</p>
                  {[{ name: '🇿🇦 POPIA', score: 78 }, { name: '🔒 ISO 27001', score: 58 }, { name: '🛡️ SOC 2', score: 45 }].map(f => (
                    <div key={f.name} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{f.name}</span><span className="font-semibold">{f.score}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${f.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Top Risks</p>
                  {[
                    { name: 'Phishing', score: 20, color: 'bg-rose-500' },
                    { name: 'POPIA fine', score: 15, color: 'bg-orange-500' },
                    { name: 'Ransomware', score: 10, color: 'bg-amber-500' },
                  ].map(r => (
                    <div key={r.name} className="flex items-center gap-2 mb-2">
                      <span className={cn('w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center shrink-0', r.color)}>{r.score}</span>
                      <span className="text-xs truncate">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-brand-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-white mb-1">{s.value}</p>
              <p className="text-sm text-brand-100">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Everything you need to stay compliant</h2>
          <p className="text-gray-500 max-w-xl mx-auto">One platform for all your GRC needs — POPIA, risk, policies, audits, and AI automation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', f.color)}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Frameworks */}
      <section id="frameworks" className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-8">8 compliance frameworks, one platform</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {FRAMEWORKS.map(f => (
              <div key={f.name} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-10">Trusted by South African compliance teams</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white text-sm font-bold">{t.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-900/50 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Simple, transparent pricing in ZAR</h2>
            <p className="text-gray-500">Billed monthly via PayFast. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PRICING_PLANS).map(plan => (
              <div key={plan.id} className={cn(
                'rounded-2xl p-6 relative',
                plan.highlighted
                  ? 'bg-brand-600 text-white shadow-xl scale-105'
                  : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'
              )}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className={cn('text-lg font-bold mb-1', plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white')}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={cn('text-3xl font-extrabold', plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white')}>{plan.price_display}</span>
                </div>
                <p className={cn('text-sm mb-5', plan.highlighted ? 'text-brand-100' : 'text-gray-500')}>{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={cn('w-4 h-4 shrink-0 mt-0.5', plan.highlighted ? 'text-brand-200' : 'text-emerald-500')} />
                      <span className={plan.highlighted ? 'text-brand-50' : 'text-gray-600 dark:text-gray-400'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.id === 'enterprise' ? 'mailto:sales@auditpilot.co.za' : '/register'}
                  className={cn(
                    'block text-center py-3 rounded-xl font-semibold text-sm transition-all',
                    plan.highlighted
                      ? 'bg-white text-brand-700 hover:bg-brand-50'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">All prices exclude VAT · Processed securely by PayFast · 14-day money-back guarantee on Pro</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="font-medium text-sm text-gray-900 dark:text-white">{faq.q}</span>
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', activeFaq === i && 'rotate-180')} />
              </button>
              {activeFaq === i && (
                <div className="px-4 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 dark:border-gray-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 mx-4 rounded-3xl mb-8 max-w-6xl lg:mx-auto">
        <div className="text-center px-4">
          <h2 className="text-3xl font-extrabold text-white mb-4">Start your compliance journey today</h2>
          <p className="text-brand-100 mb-8 max-w-lg mx-auto">Join thousands of South African businesses managing POPIA, ISO 27001, and more with AuditPilot.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="mailto:sales@auditpilot.co.za" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-bold text-sm text-gray-900 dark:text-white">AuditPilot</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <a href="#" className="hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900">Terms of Service</a>
              <a href="#" className="hover:text-gray-900">POPIA Notice</a>
              <a href="mailto:support@auditpilot.co.za" className="hover:text-gray-900">support@auditpilot.co.za</a>
            </div>
            <p className="text-xs text-gray-400">© 2025 AuditPilot. Built in 🇿🇦 South Africa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
