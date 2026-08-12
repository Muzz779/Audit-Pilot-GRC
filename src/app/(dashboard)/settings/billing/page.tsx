import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { BillingContent } from '@/components/settings/BillingContent';

export const metadata = { title: 'Billing & Subscription' };

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  const [{ data: subscription }, { data: invoices }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('organisation_id', orgId).single(),
    supabase.from('subscription_invoices').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }).limit(10),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Billing & Subscription" subtitle="Manage your plan and payment history" />
      <BillingContent
        subscription={subscription}
        invoices={invoices || []}
        orgId={orgId}
        userId={user.id}
        userEmail={profile?.email || user.email || ''}
        userName={profile?.full_name || ''}
        userRole={profile?.role}
      />
    </div>
  );
}
