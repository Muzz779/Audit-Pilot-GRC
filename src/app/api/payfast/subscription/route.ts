import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { PAYFAST_URL } from '@/lib/payfast';
import { buildPayFastPaymentData, cancelPayFastSubscription } from '@/lib/payfast/server';
import { getAppUrl } from '@/lib/app-url';

// POST — create new subscription / redirect to PayFast
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { tier } = body;

  if (!tier || tier === 'starter' || tier === 'enterprise') {
    return NextResponse.json({ error: 'Invalid tier for payment' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only owners and admins can change the plan' }, { status: 403 });
  }

  const nameParts = (profile.full_name || 'User').trim().split(/\s+/);

  try {
    const paymentData = buildPayFastPaymentData({
      orgId: profile.organisation_id,
      tier,
      userId: user.id,
      userEmail: profile.email || user.email || '',
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '.',
      appUrl: getAppUrl(req),
    });

    return NextResponse.json({ payfast_url: PAYFAST_URL, payment_data: paymentData });
  } catch (err: any) {
    console.error('PayFast subscription error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create subscription' }, { status: 500 });
  }
}

// DELETE — cancel subscription
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only owners and admins can cancel subscriptions' }, { status: 403 });
  }

  // Members can't write subscriptions, so the update runs on the server after
  // the checks above. It used to run as the member, changed nothing, and still
  // reported success.
  const serviceClient = await createServiceRoleClient();
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('id, payfast_subscription_token')
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (!sub) return NextResponse.json({ error: 'No subscription to cancel' }, { status: 404 });

  // Stop the recurring charge at PayFast first. If that fails, nothing changes
  // here, so the customer is never told they're cancelled while still paying.
  if (sub.payfast_subscription_token) {
    const cancelled = await cancelPayFastSubscription(sub.payfast_subscription_token);
    if (!cancelled.ok) {
      console.error('PayFast cancel failed:', cancelled.error);
      return NextResponse.json({
        error: 'We could not cancel the payment at PayFast, so your plan is unchanged. Please try again, or contact us and we will cancel it for you.',
      }, { status: 502 });
    }
  }

  const { error } = await serviceClient
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', sub.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('notifications').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    type: 'subscription',
    title: 'Subscription cancelled',
    message: 'Your subscription has been cancelled. You retain Pro access until the end of your current billing period.',
  });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: 'cancelled subscription',
    resource_type: 'subscription',
  });

  return NextResponse.json({ success: true });
}
