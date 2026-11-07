import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { amountMatchesPlan, verifyPayFastNotification } from '@/lib/payfast/server';

const PAID_TIERS = ['pro'];

// PayFast's payment notification (ITN). Nothing here is trusted until PayFast's
// four checks pass: it used to skip the signature in test mode and trust a
// merchant ID that is public, so anyone could post a fake "payment complete"
// and get Pro, or a fake "cancelled" to switch off someone else's plan.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sourceIp =
      req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    const check = await verifyPayFastNotification(rawBody, sourceIp);
    if (!check.ok) {
      console.error('PayFast notification rejected:', check.reason, check.data.m_payment_id || '');
      return NextResponse.json({ error: 'Notification not verified' }, { status: 400 });
    }
    const payload = check.data;

    const orgId = payload.custom_str1;
    const tier = payload.custom_str2;
    const userId = payload.custom_str3;

    if (!orgId || !PAID_TIERS.includes(tier)) {
      console.error('PayFast notification has no organisation or an unknown plan:', payload.m_payment_id);
      return NextResponse.json({ error: 'Unknown organisation or plan' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();
    const paymentStatus = payload.payment_status?.toLowerCase();

    if (paymentStatus === 'complete') {
      // 3rd check: the amount paid is the plan's price
      if (!amountMatchesPlan(tier, payload.amount_gross)) {
        console.error('PayFast amount does not match the plan:', payload.amount_gross, tier, payload.m_payment_id);
        return NextResponse.json({ error: 'Amount does not match plan' }, { status: 400 });
      }

      const amountCents = Math.round(parseFloat(payload.amount_gross) * 100);

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('organisation_id', orgId)
        .single();

      const subscriptionData = {
        organisation_id: orgId,
        tier,
        status: 'active',
        payfast_subscription_token: payload.token || null,
        payfast_payment_id: payload.pf_payment_id,
        amount_cents: amountCents,
        billing_cycle: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
      };

      if (existingSub) {
        await supabase.from('subscriptions').update(subscriptionData).eq('organisation_id', orgId);
      } else {
        await supabase.from('subscriptions').insert(subscriptionData);
      }

      await supabase.from('subscription_invoices').insert({
        organisation_id: orgId,
        subscription_id: existingSub?.id,
        payfast_payment_id: payload.pf_payment_id,
        amount_cents: amountCents,
        status: 'paid',
        paid_at: new Date().toISOString(),
        invoice_data: payload as any,
      });

      if (userId) {
        await supabase.from('notifications').insert({
          organisation_id: orgId,
          user_id: userId,
          type: 'subscription',
          title: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated`,
          message: `Your AuditPilot ${tier} subscription is now active. Welcome!`,
          metadata: { tier, amount_cents: amountCents },
        });
      }
    } else if (paymentStatus === 'cancelled') {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('organisation_id', orgId);

      if (userId) {
        await supabase.from('notifications').insert({
          organisation_id: orgId,
          user_id: userId,
          type: 'subscription',
          title: 'Subscription cancelled',
          message: 'Your subscription has been cancelled. You will retain access until the end of your billing period.',
        });
      }
    } else if (paymentStatus === 'failed') {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('organisation_id', orgId);

      if (userId) {
        await supabase.from('notifications').insert({
          organisation_id: orgId,
          user_id: userId,
          type: 'subscription',
          title: 'Payment failed',
          message: 'Your recent payment failed. Please update your payment method to avoid service interruption.',
        });
      }
    }

    await supabase.from('audit_logs').insert({
      organisation_id: orgId,
      user_id: userId || null,
      action: `PayFast notification: ${payload.payment_status}`,
      resource_type: 'subscription',
      details: {
        payment_id: payload.pf_payment_id,
        amount: payload.amount_gross,
        tier,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PayFast webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// PayFast requires 200 OK for webhook validation
export async function GET() {
  return NextResponse.json({ status: 'PayFast webhook endpoint active' });
}
