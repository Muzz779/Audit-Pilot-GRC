import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { FindingsContent } from '@/components/findings/FindingsContent';

export const metadata = { title: 'Findings' };

export default async function FindingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [{ data: frameworks }, { data: controls }, { data: findings }] = await Promise.all([
    supabase
      .from('organisation_frameworks')
      .select('*, framework:compliance_frameworks(id, short_name, name, icon)')
      .eq('organisation_id', orgId)
      .eq('is_active', true),
    supabase
      .from('controls')
      .select('id, control_id, name, description, category, framework_id, status')
      .eq('organisation_id', orgId)
      .order('control_id'),
    supabase
      .from('findings')
      .select('*, control:controls(id, control_id, name, category), framework:compliance_frameworks(id, short_name, name)')
      .eq('organisation_id', orgId)
      .order('generated_at', { ascending: false }),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Findings"
        subtitle="Evidence-based compliance findings — Phase 2 preview"
      />
      <FindingsContent
        frameworks={frameworks || []}
        controls={controls || []}
        initialFindings={findings || []}
        orgId={orgId}
        userRole={profile?.role || 'viewer'}
      />
    </div>
  );
}
