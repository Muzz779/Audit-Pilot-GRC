import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { AuditContent } from '@/components/audit/AuditContent';

export const metadata = { title: 'Audit & Evidence' };

export default async function AuditPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [{ data: audits }, { data: evidence }, { data: frameworks }] = await Promise.all([
    supabase
      .from('audits')
      .select('*, framework:compliance_frameworks(name, short_name, icon)')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('evidence')
      .select('*')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('organisation_frameworks')
      .select('framework:compliance_frameworks(id, name, short_name)')
      .eq('organisation_id', orgId)
      .eq('is_active', true),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Audit & Evidence" subtitle="Manage audits, evidence repository and compliance reports" />
      <AuditContent
        audits={audits || []}
        evidence={evidence || []}
        frameworks={frameworks?.map((f: any) => f.framework) || []}
        orgId={orgId}
        userId={user.id}
        userRole={profile?.role}
      />
    </div>
  );
}
