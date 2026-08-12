import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { ComplianceContent } from '@/components/compliance/ComplianceContent';

export const metadata = { title: 'Compliance Management' };

export default async function CompliancePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [
    { data: orgFrameworks },
    { data: allFrameworks },
    { data: controls },
  ] = await Promise.all([
    supabase
      .from('organisation_frameworks')
      .select('*, framework:compliance_frameworks(*)')
      .eq('organisation_id', orgId)
      .eq('is_active', true),
    supabase.from('compliance_frameworks').select('*').order('name'),
    supabase
      .from('controls')
      .select('*, assignee:profiles!controls_assigned_to_fkey(id, full_name, email)')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Compliance Management" subtitle="Track frameworks, controls, and compliance status" />
      <ComplianceContent
        orgFrameworks={orgFrameworks || []}
        allFrameworks={allFrameworks || []}
        controls={controls || []}
        orgId={orgId}
        userId={user.id}
        userRole={profile?.role}
      />
    </div>
  );
}
