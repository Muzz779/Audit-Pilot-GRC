import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { AIToolsContent } from '@/components/ai/AIToolsContent';

export const metadata = { title: 'AI Tools' };

export default async function AIToolsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, organisations(*)').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('organisation_id', orgId)
    .single();

  return (
    <div className="flex flex-col">
      <Topbar title="AI Tools" subtitle="AI-powered compliance, risk, and policy automation" />
      <AIToolsContent
        subscription={subscription}
        orgId={orgId}
        userId={user.id}
        orgContext={`Organisation: ${(profile as any)?.organisations?.name}, Industry: ${(profile as any)?.organisations?.industry}`}
      />
    </div>
  );
}
