import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildPayFastPaymentData, PAYFAST_URL } from '@/lib/payfast';

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
    .select('organisation_id, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const nameParts = (profile.full_name || 'User').split(' ');

  try {
    const paymentData = buildPayFastPaymentData({
      orgId: profile.organisation_id,
      tier,
      userId: user.id,
      userEmail: profile.email || user.email || '',
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '.',
      appUrl,
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

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('organisation_id', profile.organisation_id);

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
