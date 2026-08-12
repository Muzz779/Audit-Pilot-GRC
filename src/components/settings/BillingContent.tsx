'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, CreditCard, AlertTriangle, Download,
  Zap, Shield, Building2, Star, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/index';
import { cn, formatZAR, formatDate, getStatusColor } from '@/lib/utils';
import { PRICING_PLANS, PAYFAST_URL } from '@/lib/payfast';
import { toast } from 'sonner';
import type { Subscription } from '@/types';

interface BillingContentProps {
  subscription: Subscription | null;
  invoices: any[];
  orgId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
}

export function BillingContent({
  subscription,
  invoices,
  orgId,
  userId,
  userEmail,
  userName,
  userRole,
}: BillingContentProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(subscription?.status || 'active');
  const [statusBanner, setStatusBanner] = useState<'success' | 'cancelled' | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);

  // Read URL params and env vars on client only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s === 'success' || s === 'cancelled') setStatusBanner(s);
    setIsSandbox(process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true');
  }, []);

  const currentTier = subscription?.tier || 'starter';
  // subscriptionStatus tracks local updates (e.g. after cancel) without a page reload
  const canManageBilling = ['owner', 'admin'].includes(userRole);

  // ── Subscribe / upgrade ──────────────────────────────────────────────────
  const handleSubscribe = async (tier: string) => {
    if (tier === 'starter') return;
    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@auditpilot.co.za?subject=Enterprise Plan Enquiry';
      return;
    }
    if (currentTier === tier) return;

    setLoadingTier(tier);
    try {
      const res = await fetch('/api/payfast/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

      // Build and auto-submit the PayFast form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.payfast_url;

      Object.entries(data.payment_data as Record<string, string>).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment');
      setLoadingTier(null);
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will retain Pro access until the end of your current billing period.'
    )) return;

    setCancelling(true);
    try {
      const res = await fetch('/api/payfast/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation failed');

      toast.success('Subscription cancelled. You retain access until your billing period ends.');
      // Update subscription status locally without full reload
      setSubscriptionStatus('cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription. Please contact support.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Status banners */}
      {statusBanner === 'success' && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Payment successful!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              Your Pro subscription is now active. All features are unlocked.
            </p>
          </div>
        </div>
      )}

      {statusBanner === 'cancelled' && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Payment was cancelled. Your subscription has not changed.
          </p>
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0">
                {currentTier === 'pro'        ? <Star      className="w-6 h-6 text-white" /> :
                 currentTier === 'enterprise' ? <Building2 className="w-6 h-6 text-white" /> :
                                                <Shield    className="w-6 h-6 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold capitalize">{currentTier} Plan</h2>
                  <span className={cn(
                    'status-badge',
                    getStatusColor(subscription?.status || 'active')
                  )}>
                    {subscriptionStatus}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentTier === 'starter'
                    ? 'Free forever — up to 5 users, 2 frameworks'
                    : currentTier === 'pro'
                    ? `R799/month · Next billing: ${formatDate(subscription?.current_period_end)}`
                    : 'Custom enterprise pricing'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentTier === 'starter' && canManageBilling && (
                <Button
                  size="sm"
                  onClick={() => handleSubscribe('pro')}
                  loading={loadingTier === 'pro'}
                >
                  <Zap className="w-3.5 h-3.5" /> Upgrade to Pro
                </Button>
              )}
              {currentTier === 'pro' && canManageBilling && subscription?.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  loading={cancelling}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing plans */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(PRICING_PLANS).map(plan => {
            const isCurrent = currentTier === plan.id;
            const isLoading = loadingTier === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-xl border p-5 relative transition-all',
                  plan.highlighted
                    ? 'border-primary shadow-md bg-primary/5 dark:bg-primary/10'
                    : 'border-border bg-card',
                  isCurrent && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && !plan.highlighted && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price_display}</span>
                    {plan.price_cents > 0 && (
                      <span className="text-xs text-muted-foreground">excl. VAT</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="sm"
                  disabled={isCurrent || !canManageBilling || isLoading}
                  loading={isLoading}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting...</>
                  ) : isCurrent ? (
                    '✓ Current Plan'
                  ) : (
                    plan.cta
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          All prices in South African Rand (ZAR) · Billed monthly via PayFast · Cancel anytime · VAT excluded
        </p>
      </div>

      {/* PayFast sandbox notice */}
      {isSandbox && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Sandbox / Test Mode Active
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              No real payments are processed. Use test card:{' '}
              <strong>4000000000000002</strong>, Expiry: <strong>12/25</strong>, CVV: <strong>123</strong>
            </p>
          </div>
        </div>
      )}

      {/* Invoice history */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatDate(inv.created_at)}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {inv.payfast_payment_id || inv.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatZAR(inv.amount_cents)}
                    </span>
                    <Badge variant="success" className="text-[10px]">{inv.status}</Badge>
                    <Button variant="ghost" size="icon-sm" title="Download invoice">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No invoices yet */}
      {invoices.length === 0 && currentTier !== 'starter' && (
        <Card>
          <CardContent className="py-8 text-center">
            <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices will appear here after each successful payment
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
