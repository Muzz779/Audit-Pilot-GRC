import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyPayFastWebhook } from '@/lib/payfast';
import type { PayFastWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const payload: PayFastWebhookPayload = Object.fromEntries(params.entries()) as unknown as PayFastWebhookPayload;

    console.log('PayFast webhook received:', payload.payment_status, payload.m_payment_id);

    // Verify signature (skip in sandbox for testing)
    const isSandbox = process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true';
    if (!isSandbox) {
      const isValid = verifyPayFastWebhook(payload);
      if (!isValid) {
        console.error('PayFast webhook signature invalid');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Verify it's from PayFast
    if (payload.merchant_id !== process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID) {
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Extract org data from custom fields
    const orgId = payload.custom_str1;
    const tier = payload.custom_str2 || 'pro';
    const userId = payload.custom_str3;

    if (!orgId) {
      console.error('No organisation ID in webhook');
      return NextResponse.json({ error: 'Missing org ID' }, { status: 400 });
    }

    const paymentStatus = payload.payment_status?.toLowerCase();

    // Handle different payment statuses
    if (paymentStatus === 'complete') {
      // Update/create subscription
      const amountCents = Math.round(parseFloat(payload.amount_gross || '0') * 100);

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
      };

      if (existingSub) {
        await supabase.from('subscriptions').update(subscriptionData).eq('organisation_id', orgId);
      } else {
        await supabase.from('subscriptions').insert(subscriptionData);
      }

      // Record invoice
      await supabase.from('subscription_invoices').insert({
        organisation_id: orgId,
        subscription_id: existingSub?.id,
        payfast_payment_id: payload.pf_payment_id,
        amount_cents: amountCents,
        status: 'paid',
        paid_at: new Date().toISOString(),
        invoice_data: payload as any,
      });

      // Create notification
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

      console.log(`Subscription activated for org ${orgId}, tier: ${tier}`);

    } else if (paymentStatus === 'cancelled') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
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

    // Log audit trail
    await supabase.from('audit_logs').insert({
      organisation_id: orgId,
      user_id: userId || null,
      action: `PayFast webhook: ${payload.payment_status}`,
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
