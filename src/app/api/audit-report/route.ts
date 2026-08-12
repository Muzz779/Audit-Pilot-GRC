import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('organisation_id, organisations(name, industry)').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();

  // Gather compliance data
  const [
    { data: frameworks },
    { data: risks },
    { data: policies },
    { data: controls },
    { data: evidence },
  ] = await Promise.all([
    supabase.from('organisation_frameworks').select('*, framework:compliance_frameworks(name, short_name)').eq('organisation_id', orgId),
    supabase.from('risks').select('title, risk_score, status, likelihood, impact').eq('organisation_id', orgId).order('risk_score', { ascending: false }),
    supabase.from('policies').select('title, status, category').eq('organisation_id', orgId),
    supabase.from('controls').select('name, status, framework_id').eq('organisation_id', orgId),
    supabase.from('evidence').select('name, status').eq('organisation_id', orgId),
  ]);

  const org = (profile as any).organisations;
  const reportDate = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  // Generate HTML report
  const avgCompliance = frameworks?.length
    ? Math.round(frameworks.reduce((s: number, f: any) => s + (f.compliance_score || 0), 0) / frameworks.length)
    : 0;

  const criticalRisks = risks?.filter(r => r.risk_score >= 17) || [];
  const highRisks = risks?.filter(r => r.risk_score >= 10 && r.risk_score <= 16) || [];
  const approvedPolicies = policies?.filter(p => p.status === 'approved') || [];
  const implementedControls = controls?.filter(c => c.status === 'implemented') || [];

  const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AuditPilot - Compliance Report - ${reportDate}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
    .header { border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { color: #0284c7; font-size: 22px; font-weight: bold; }
    h1 { color: #111827; margin: 10px 0 5px; }
    .meta { color: #6b7280; font-size: 14px; }
    .section { margin-bottom: 30px; }
    h2 { color: #0284c7; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; font-size: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: bold; color: #0284c7; }
    .kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f9fafb; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e7eb; font-size: 12px; }
    td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #059669; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-amber { background: #fef3c7; color: #d97706; }
    .badge-blue { background: #dbeafe; color: #2563eb; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛡️ AuditPilot</div>
    <h1>Compliance Status Report</h1>
    <div class="meta">${org?.name || 'Organisation'} · ${org?.industry || ''} · Generated: ${reportDate}</div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value">${avgCompliance}%</div>
        <div class="kpi-label">Overall Compliance</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${risks?.length || 0}</div>
        <div class="kpi-label">Total Risks</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${approvedPolicies.length}</div>
        <div class="kpi-label">Approved Policies</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${implementedControls.length}</div>
        <div class="kpi-label">Implemented Controls</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Framework Compliance Status</h2>
    <table>
      <thead><tr><th>Framework</th><th>Compliance Score</th><th>Status</th></tr></thead>
      <tbody>
        ${frameworks?.map(f => `
          <tr>
            <td>${f.framework?.name || 'Unknown'} (${f.framework?.short_name})</td>
            <td>${f.compliance_score}%</td>
            <td><span class="badge ${f.compliance_score >= 80 ? 'badge-green' : f.compliance_score >= 60 ? 'badge-amber' : 'badge-red'}">${f.compliance_score >= 80 ? 'Compliant' : f.compliance_score >= 60 ? 'In Progress' : 'Needs Attention'}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="3">No frameworks tracked</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Risk Register Summary</h2>
    <p style="color:#6b7280;font-size:13px;margin-bottom:12px">
      ${criticalRisks.length} critical · ${highRisks.length} high · ${(risks?.length || 0) - criticalRisks.length - highRisks.length} medium/low
    </p>
    <table>
      <thead><tr><th>Risk</th><th>Score</th><th>Status</th></tr></thead>
      <tbody>
        ${risks?.slice(0, 10).map(r => `
          <tr>
            <td>${r.title}</td>
            <td><strong>${r.risk_score}/25</strong></td>
            <td><span class="badge ${r.risk_score >= 17 ? 'badge-red' : r.risk_score >= 10 ? 'badge-amber' : 'badge-green'}">${r.risk_score >= 17 ? 'Critical' : r.risk_score >= 10 ? 'High' : r.risk_score >= 5 ? 'Medium' : 'Low'}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="3">No risks registered</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Policy Status</h2>
    <table>
      <thead><tr><th>Policy</th><th>Category</th><th>Status</th></tr></thead>
      <tbody>
        ${policies?.map(p => `
          <tr>
            <td>${p.title}</td>
            <td>${p.category || '—'}</td>
            <td><span class="badge ${p.status === 'approved' ? 'badge-green' : p.status === 'review' ? 'badge-blue' : 'badge-gray'}">${p.status}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="3">No policies created</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>This report was automatically generated by AuditPilot on ${reportDate}.</p>
    <p>AuditPilot | POPIA Compliant | support@auditpilot.co.za | www.auditpilot.co.za</p>
    <p>CONFIDENTIAL — This document contains sensitive compliance information. Handle in accordance with your information classification policy.</p>
  </div>
</body>
</html>`;

  return NextResponse.json({
    success: true,
    report_html: reportHtml,
    summary: {
      avg_compliance: avgCompliance,
      total_risks: risks?.length || 0,
      critical_risks: criticalRisks.length,
      approved_policies: approvedPolicies.length,
      implemented_controls: implementedControls.length,
    },
  });
}
