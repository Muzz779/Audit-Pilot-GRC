import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/Sidebar';
import type { Profile, Organisation } from '@/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch organisation
  let organisation: Organisation | null = null;
  if (profile?.organisation_id) {
    const { data } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single();
    organisation = data;
  }

  // If no org, redirect to onboarding
  if (!organisation && profile && !profile.is_platform_admin) {
    redirect('/register?step=organisation');
  }

  // Unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile as Profile}
        organisation={organisation}
        unreadCount={unreadCount || 0}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
