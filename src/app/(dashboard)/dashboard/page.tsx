import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/dashboard/Topbar';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organisations(*)')
    .eq('id', user.id)
    .single();

  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [
    { data: risks },
    { data: policies },
    { data: controls },
    { data: audits },
    { data: frameworks },
    { data: recentActivity },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from('risks')
      .select('id, risk_score, status, title, created_at, likelihood, impact')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('policies')
      .select('id, status, title')
      .eq('organisation_id', orgId),
    supabase
      .from('controls')
      .select('id, status')
      .eq('organisation_id', orgId),
    supabase
      .from('audits')
      .select('id, title, status, start_date, end_date')
      .eq('organisation_id', orgId)
      .eq('status', 'planned')
      .limit(5),
    supabase
      .from('organisation_frameworks')
      .select('*, framework:compliance_frameworks(*)')
      .eq('organisation_id', orgId)
      .eq('is_active', true),
    supabase
      .from('audit_logs')
      .select('*, user:profiles(full_name, email)')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('organisation_id', orgId)
      .single(),
  ]);

  // Calculate real stats
  const openRisks = risks?.filter(r => r.status !== 'resolved' && r.status !== 'accepted').length || 0;
  const criticalRisks = risks?.filter(r => r.risk_score >= 17).length || 0;
  const avgRiskScore = risks?.length
    ? Math.round(risks.reduce((sum: number, r: any) => sum + (r.risk_score || 0), 0) / risks.length)
    : 0;

  const approvedPolicies = policies?.filter(p => p.status === 'approved').length || 0;

  const applicableControls = controls?.filter(c => c.status !== 'not_applicable') || [];
  const implementedControls = applicableControls.filter(c => c.status === 'implemented').length;
  const compliancePercent = applicableControls.length > 0
    ? Math.round((implementedControls / applicableControls.length) * 100)
    : 0;

  const avgFrameworkScore = frameworks?.length
    ? Math.round(frameworks.reduce((sum: number, f: any) => sum + (f.compliance_score || 0), 0) / frameworks.length)
    : 0;

  // First-run onboarding progress — derived from real data
  const [
    { count: evidenceCount },
    { count: analyzedCount },
    { count: findingsCount },
  ] = await Promise.all([
    supabase.from('evidence').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
    supabase.from('document_analysis').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
    supabase.from('findings').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
  ]);

  const onboarding = {
    hasFramework: (frameworks?.length || 0) > 0,
    hasEvidence:  (evidenceCount || 0) > 0,
    hasAnalyzed:  (analyzedCount || 0) > 0,
    hasFindings:  (findingsCount || 0) > 0,
  };

  // Real control-status breakdown for the dashboard overview (no fabricated history)
  const controlStats = {
    implemented:    controls?.filter(c => c.status === 'implemented').length    || 0,
    in_progress:    controls?.filter(c => c.status === 'in_progress').length    || 0,
    not_started:    controls?.filter(c => c.status === 'not_started').length    || 0,
    not_applicable: controls?.filter(c => c.status === 'not_applicable').length || 0,
  };

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard"
        subtitle={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'there'} 👋`}
      />
      <DashboardContent
        stats={{
          overall_risk_score: avgRiskScore,
          open_risks: openRisks,
          critical_risks: criticalRisks,
          compliance_percentage: compliancePercent,
          avg_framework_score: avgFrameworkScore,
          active_policies: approvedPolicies,
          upcoming_audits: audits?.length || 0,
        }}
        controlStats={controlStats}
        onboarding={onboarding}
        risks={risks || []}
        policies={policies || []}
        frameworks={frameworks || []}
        recentActivity={recentActivity || []}
        subscription={subscription}
        orgName={(profile as any)?.organisations?.name || 'Your Organisation'}
      />
    </div>
  );
}
