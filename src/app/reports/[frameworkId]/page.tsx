import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PrintButton } from './PrintButton';

// ────────────────────────────────────────────────────────────────────────────
// Phase 5 — Board-ready report (printable HTML, browser print-to-PDF).
//
// Liability rules baked in (see CLAUDE.md principles):
//  - Only ACCEPTED findings appear in the formal detail. Pending is a count only.
//  - Prominent "DRAFT — pending internal review" notice on the cover.
//  - Unverified-regulation + decision-support (not legal advice) disclaimer in the appendix.
//  - No language that asserts the customer "is compliant".
// ────────────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational'];

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', informational: 'Informational',
};

const DETERMINATION_LABEL: Record<string, string> = {
  satisfied: 'Satisfied', partial: 'Partial', gap: 'Gap', not_assessed: 'Not assessed',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence',
};

function scoreBadgeClasses(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function severityDot(sev: string): string {
  if (sev === 'critical') return 'bg-rose-600';
  if (sev === 'high') return 'bg-orange-500';
  if (sev === 'medium') return 'bg-amber-500';
  if (sev === 'low') return 'bg-blue-500';
  return 'bg-gray-400';
}

export default async function BoardReportPage({ params }: { params: Promise<{ frameworkId: string }> }) {
  const { frameworkId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, organisations(name, industry)')
    .eq('id', user.id)
    .single();

  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const org = (profile as any)?.organisations;

  // Framework + score for this org
  const { data: orgFramework } = await supabase
    .from('organisation_frameworks')
    .select('compliance_score, framework:compliance_frameworks(name, short_name, description, version, icon)')
    .eq('organisation_id', orgId)
    .eq('framework_id', frameworkId)
    .single();

  if (!orgFramework) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <p className="text-sm text-gray-600">
          This framework is not tracked by your organisation, or you do not have access to it.
        </p>
      </div>
    );
  }

  const framework = (orgFramework as any).framework;

  // Controls (for the summary counts) + accepted findings + pending count
  const [
    { data: controls },
    { data: acceptedFindings },
    { count: pendingCount },
  ] = await Promise.all([
    supabase
      .from('controls')
      .select('status')
      .eq('organisation_id', orgId)
      .eq('framework_id', frameworkId),
    supabase
      .from('findings')
      .select('id, determination, confidence, severity, title, summary, reasoning, recommendation, evidence_chunk_ids, regulation_chunk_ids, used_unverified_regulation, reviewed_at, control:controls(control_id, name, category)')
      .eq('organisation_id', orgId)
      .eq('framework_id', frameworkId)
      .eq('status', 'accepted'),
    supabase
      .from('findings')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId)
      .eq('framework_id', frameworkId)
      .eq('status', 'draft_pending_review'),
  ]);

  const allControls = controls || [];
  const applicable = allControls.filter((c: any) => c.status !== 'not_applicable');
  const implementedCount = applicable.filter((c: any) => c.status === 'implemented').length;
  const score = orgFramework.compliance_score ?? 0;

  const findings = acceptedFindings || [];
  const satisfied = findings.filter((f: any) => f.determination === 'satisfied').length;
  const partial = findings.filter((f: any) => f.determination === 'partial').length;
  const gap = findings.filter((f: any) => f.determination === 'gap').length;

  // ── Resolve evidence citations: chunk id → { document name, page } ──────────
  const allChunkIds = Array.from(
    new Set(findings.flatMap((f: any) => (f.evidence_chunk_ids || []) as string[]))
  );

  const citationByChunk = new Map<string, { evidenceId: string; page: number | null }>();
  const evidenceNameById = new Map<string, string>();

  if (allChunkIds.length > 0) {
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id, evidence_id, page_number')
      .in('id', allChunkIds);

    for (const ch of (chunks || []) as any[]) {
      citationByChunk.set(ch.id, { evidenceId: ch.evidence_id, page: ch.page_number });
    }

    const evidenceIds = Array.from(new Set((chunks || []).map((c: any) => c.evidence_id).filter(Boolean)));
    if (evidenceIds.length > 0) {
      const { data: docs } = await supabase
        .from('evidence')
        .select('id, name')
        .in('id', evidenceIds);
      for (const d of (docs || []) as any[]) evidenceNameById.set(d.id, d.name);
    }
  }

  // Build a per-finding "Document (p. 3, 5)" citation list, deduped by document.
  function citationsFor(finding: any): string[] {
    const pagesByDoc = new Map<string, Set<number>>();
    const docsNoPage = new Set<string>();
    for (const chunkId of (finding.evidence_chunk_ids || []) as string[]) {
      const cite = citationByChunk.get(chunkId);
      if (!cite) continue;
      const name = evidenceNameById.get(cite.evidenceId) || 'Uploaded document';
      if (cite.page != null) {
        if (!pagesByDoc.has(name)) pagesByDoc.set(name, new Set());
        pagesByDoc.get(name)!.add(cite.page);
      } else {
        docsNoPage.add(name);
      }
    }
    const out: string[] = [];
    for (const [name, pages] of pagesByDoc) {
      const sorted = Array.from(pages).sort((a, b) => a - b);
      out.push(`${name} (p. ${sorted.join(', ')})`);
    }
    for (const name of docsNoPage) if (!pagesByDoc.has(name)) out.push(name);
    return out;
  }

  // Documents cited anywhere in the report (for the appendix)
  const citedDocuments = Array.from(evidenceNameById.values()).sort((a, b) => a.localeCompare(b));

  // Group accepted findings by severity for the detail section
  const findingsBySeverity = SEVERITY_ORDER
    .map((sev) => ({ sev, items: findings.filter((f: any) => (f.severity || 'medium') === sev) }))
    .filter((g) => g.items.length > 0);

  const reportDate = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Print rules: A4 margins, avoid breaking a finding across pages */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 16mm; }
              .report-card { box-shadow: none !important; }
              .finding-block { break-inside: avoid; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Toolbar (screen only) */}
        <div className="no-print mb-4 flex items-center justify-between">
          <a href="/findings" className="text-sm text-gray-500 hover:text-gray-800">← Back to Findings</a>
          <PrintButton />
        </div>

        <div className="report-card rounded-xl bg-white p-10 shadow-sm print:p-0 print:shadow-none">

          {/* ── Cover ─────────────────────────────────────────────────── */}
          <header className="border-b border-gray-200 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-sky-700">🛡️ AuditPilot</div>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  {framework?.short_name} Compliance Findings Report
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {org?.name || 'Organisation'}{org?.industry ? ` · ${org.industry}` : ''} · {reportDate}
                </p>
              </div>
              <span className="text-4xl">{framework?.icon}</span>
            </div>

            {/* DRAFT notice — must stay prominent */}
            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">DRAFT — pending internal review</p>
              <p className="mt-0.5 text-xs text-amber-700">
                This is a decision-support draft, not a certificate of compliance or legal advice. Every finding
                below has been reviewed and accepted by a member of your organisation, but the underlying
                regulation data has not yet been verified by a qualified legal practitioner.
              </p>
            </div>
          </header>

          {/* ── Executive summary ─────────────────────────────────────── */}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Executive Summary</h2>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Compliance score', value: `${score}%` },
                { label: 'Satisfied', value: satisfied },
                { label: 'Partial', value: partial },
                { label: 'Gaps', value: gap },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                  <div className="mt-1 text-xs text-gray-500">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Score visual — simple, robust bar */}
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>{framework?.short_name} framework compliance</span>
                <span className={`rounded px-1.5 py-0.5 font-semibold ${scoreBadgeClasses(score)}`}>{score}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {implementedCount} of {applicable.length} applicable controls implemented ·{' '}
                {findings.length} accepted finding{findings.length === 1 ? '' : 's'}
                {pendingCount ? ` · ${pendingCount} still pending review (excluded from this report)` : ''}
              </p>
            </div>
          </section>

          {/* ── Findings detail (accepted only), grouped by severity ───── */}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Accepted Findings ({findings.length})
            </h2>

            {findings.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No findings have been accepted for this framework yet. Run an audit and accept findings on the
                Findings page, then regenerate this report.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {findingsBySeverity.map((group) => (
                  <div key={group.sev}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${severityDot(group.sev)}`} />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                        {SEVERITY_LABEL[group.sev]} ({group.items.length})
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {group.items.map((f: any) => {
                        const cites = citationsFor(f);
                        return (
                          <div key={f.id} className="finding-block rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-gray-900">{f.title}</h4>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                {DETERMINATION_LABEL[f.determination] || f.determination}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {CONFIDENCE_LABEL[f.confidence] || f.confidence}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {f.control?.control_id} · {f.control?.name}
                            </p>

                            {f.summary && <p className="mt-2 text-xs leading-relaxed text-gray-700">{f.summary}</p>}

                            <div className="mt-3 space-y-2 text-xs">
                              <div>
                                <span className="font-semibold text-gray-700">Evidence cited: </span>
                                {cites.length > 0 ? (
                                  <span className="text-gray-600">{cites.join('; ')}</span>
                                ) : (
                                  <span className="italic text-gray-400">No document evidence cited.</span>
                                )}
                              </div>
                              {f.reasoning && (
                                <div>
                                  <span className="font-semibold text-gray-700">Reasoning: </span>
                                  <span className="text-gray-600">{f.reasoning}</span>
                                </div>
                              )}
                              {f.recommendation && (
                                <div>
                                  <span className="font-semibold text-gray-700">Recommendation: </span>
                                  <span className="text-gray-600">{f.recommendation}</span>
                                </div>
                              )}
                            </div>

                            {(!f.regulation_chunk_ids || f.regulation_chunk_ids.length === 0) ? (
                              <p className="mt-2 text-[10px] text-rose-700">
                                ⚠ No verified regulation base for {framework?.short_name} — this finding is AI general-knowledge only. Illustrative, not a compliance assessment.
                              </p>
                            ) : f.used_unverified_regulation ? (
                              <p className="mt-2 text-[10px] text-amber-700">
                                ⚠ Assessed against unverified regulation text — confirm against official {framework?.short_name} before acting.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Appendix ──────────────────────────────────────────────── */}
          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Appendix</h2>

            <div className="mt-3">
              <h3 className="text-xs font-semibold text-gray-700">Evidence documents cited in this report</h3>
              {citedDocuments.length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-xs text-gray-600">
                  {citedDocuments.map((name) => <li key={name}>{name}</li>)}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-gray-400">No documents were cited by the accepted findings.</p>
              )}
            </div>

            <div className="mt-5 rounded-lg border border-gray-300 bg-gray-50 p-4">
              <h3 className="text-xs font-bold text-gray-700">Disclaimer</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                This report is a <strong>decision-support draft</strong>, not legal advice and not a certificate of
                compliance. Findings are generated by an AI system from your uploaded evidence and reviewed by a
                member of your organisation. The regulation knowledge base used to assess these controls is{' '}
                <strong>AI-drafted and legally unverified</strong>, pending review by a qualified{' '}
                {framework?.short_name === 'POPIA' ? 'South African data-protection practitioner' : 'legal practitioner'}.
                Do not rely on this document as evidence of legal compliance. Confirm all determinations against the
                official {framework?.short_name} text and take professional advice before acting.
              </p>
            </div>

            <p className="mt-6 text-center text-[10px] text-gray-400">
              Generated by AuditPilot on {reportDate} · CONFIDENTIAL — handle per your information classification policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
