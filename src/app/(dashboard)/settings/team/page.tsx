import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { TeamContent } from '@/components/settings/TeamContent';

export const metadata = { title: 'Team Management' };

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, organisations(*)').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at');

  return (
    <div className="flex flex-col">
      <Topbar title="Team Management" subtitle="Manage team members, roles and permissions" />
      <TeamContent
        members={members || []}
        currentUser={profile}
        organisation={(profile as any)?.organisations}
        orgId={orgId}
        userRole={profile?.role}
      />
    </div>
  );
}
