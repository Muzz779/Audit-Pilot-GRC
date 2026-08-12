import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { PoliciesContent } from '@/components/policies/PoliciesContent';

export const metadata = { title: 'Policy Management' };

export default async function PoliciesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [{ data: policies }, { data: members }] = await Promise.all([
    supabase
      .from('policies')
      .select('*, owner:profiles!policies_owner_id_fkey(id, full_name, email), versions:policy_versions(id, version_number, content, created_at)')
      .eq('organisation_id', orgId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organisation_id', orgId),
  ]);

  // Attach latest version content to each policy
  const policiesWithContent = (policies || []).map((p: any) => ({
    ...p,
    content: p.versions
      ? [...p.versions].sort((a: any, b: any) => b.version_number - a.version_number)[0]?.content || null
      : null,
  }));

  return (
    <div className="flex flex-col">
      <Topbar title="Policy Management" subtitle="Create, manage and track policy acknowledgements" />
      <PoliciesContent
        policies={policiesWithContent}
        members={members || []}
        orgId={orgId}
        userId={user.id}
        userRole={profile?.role}
      />
    </div>
  );
}
