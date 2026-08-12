import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { RisksContent } from '@/components/risks/RisksContent';

export const metadata = { title: 'Risk Register' };

export default async function RisksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [{ data: risks }, { data: members }] = await Promise.all([
    supabase
      .from('risks')
      .select('*, owner:profiles!risks_owner_id_fkey(id, full_name, email)')
      .eq('organisation_id', orgId)
      .order('risk_score', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('organisation_id', orgId),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Risk Register" subtitle="Identify, assess, and mitigate organisational risks" />
      <RisksContent
        risks={risks || []}
        members={members || []}
        orgId={orgId}
        userId={user.id}
        userRole={profile?.role}
      />
    </div>
  );
}
