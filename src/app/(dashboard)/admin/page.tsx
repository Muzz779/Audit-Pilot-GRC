import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { AdminContent } from '@/components/admin/AdminContent';

export const metadata = { title: 'Platform Admin' };

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.is_platform_admin) redirect('/dashboard');

  const adminClient = await createServiceRoleClient();

  const [
    { data: orgs, count: orgCount },
    { data: subs },
    { data: recentSignups },
    { data: aiUsage },
  ] = await Promise.all([
    adminClient.from('organisations').select('*, subscription:subscriptions(tier, status)', { count: 'exact' }).order('created_at', { ascending: false }).limit(20),
    adminClient.from('subscriptions').select('tier, status'),
    adminClient.from('profiles').select('id, email, full_name, created_at, organisation_id').order('created_at', { ascending: false }).limit(10),
    adminClient.from('ai_interactions').select('feature, created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  const tierCounts = {
    starter: subs?.filter(s => s.tier === 'starter').length || 0,
    pro: subs?.filter(s => s.tier === 'pro' && s.status === 'active').length || 0,
    enterprise: subs?.filter(s => s.tier === 'enterprise').length || 0,
  };

  const mrr = (tierCounts.pro * 799) + (tierCounts.enterprise * 2999);

  return (
    <div className="flex flex-col">
      <Topbar title="Platform Admin" subtitle="Super-user dashboard for AuditPilot" />
      <AdminContent
        organisations={orgs || []}
        orgCount={orgCount || 0}
        tierCounts={tierCounts}
        mrr={mrr}
        recentSignups={recentSignups || []}
        aiUsage={aiUsage || []}
      />
    </div>
  );
}
