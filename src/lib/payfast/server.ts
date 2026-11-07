import crypto from 'crypto';
import { promises as dns } from 'dns';
import type { PayFastPaymentData } from '@/types';
import {
  PAYFAST_HOST,
  PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY,
  PAYFAST_SANDBOX,
  PRICING_PLANS,
} from './index';

// Server-only PayFast code. Follows the PayFast developer docs
// (developers.payfast.co.za/docs and /api), read on 2026-11-07.

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

// PHP's urlencode, which PayFast's signatures are defined against: spaces
// become '+', and !'()*~ are encoded, unlike encodeURIComponent.
export function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c: string) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+');
}

// ── Checkout ─────────────────────────────────────────────────────────────────

// Checkout signature: the non-blank fields in the order PayFast documents
// them (not alphabetical), then the passphrase.
function checkoutSignature(data: Record<string, string>, passphrase?: string): string {
  let s = Object.entries(data)
    .filter(([, v]: [string, string]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]: [string, string]) => `${k}=${pfEncode(String(v).trim())}`)
    .join('&');
  if (passphrase) s += `&passphrase=${pfEncode(passphrase.trim())}`;
  return md5(s);
}

export function buildPayFastPaymentData(params: {
  orgId: string;
  tier: string;
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  appUrl: string;
}): PayFastPaymentData {
  const plan = PRICING_PLANS[params.tier as keyof typeof PRICING_PLANS];
  if (!plan || plan.price_cents === 0) throw new Error('Invalid plan for payment');
  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    throw new Error('PayFast merchant details are not configured for live payments');
  }

  // Order matters for the signature: merchant, customer, transaction
  // (including custom fields), then subscription fields.
  const data: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${params.appUrl}/settings/billing?status=success`,
    cancel_url: `${params.appUrl}/settings/billing?status=cancelled`,
    notify_url: `${params.appUrl}/api/payfast/webhook`,
    name_first: params.firstName.trim(),
    name_last: params.lastName.trim(),
    email_address: params.userEmail.trim(),
    m_payment_id: `${params.orgId}-${Date.now()}`,
    amount: plan.payfast_amount,
    item_name: `AuditPilot ${plan.name} Plan`,
    item_description: `Monthly subscription - ${plan.name} tier`,
    custom_str1: params.orgId,
    custom_str2: params.tier,
    custom_str3: params.userId,
    subscription_type: '1',
    billing_date: new Date().toISOString().split('T')[0],
    recurring_amount: plan.payfast_amount,
    frequency: '3', // Monthly
    cycles: '0', // Until cancelled
  };

  // Blank fields are left out of the form as well as the signature
  for (const key of Object.keys(data)) if (data[key] === '') delete data[key];

  return {
    ...data,
    signature: checkoutSignature(data, process.env.PAYFAST_PASSPHRASE),
  } as unknown as PayFastPaymentData;
}

// ── Payment notifications (ITN) ──────────────────────────────────────────────

const PAYFAST_NOTIFY_HOSTS = [
  'www.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
  'sandbox.payfast.co.za',
];

async function isPayFastAddress(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const lists = await Promise.all(
    PAYFAST_NOTIFY_HOSTS.map((h: string) => dns.resolve4(h).catch(() => [] as string[]))
  );
  return lists.flat().includes(ip);
}

export type ItnResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; reason: string; data: Record<string, string> };

// PayFast's four checks on a payment notification. Any failure means the
// notification is not trusted and nothing is changed.
export async function verifyPayFastNotification(rawBody: string, sourceIp: string | null): Promise<ItnResult> {
  const data: Record<string, string> = {};
  const parts: string[] = [];
  let signed = true;
  for (const [k, v] of new URLSearchParams(rawBody).entries()) {
    data[k] = v;
    // Every field PayFast posted, in order, up to the signature
    if (k === 'signature') signed = false;
    if (signed) parts.push(`${k}=${pfEncode(v)}`);
  }
  const paramString = parts.join('&');
  const fail = (reason: string): ItnResult => ({ ok: false, reason, data });

  // 1. Signature
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const expected = md5(passphrase ? `${paramString}&passphrase=${pfEncode(passphrase)}` : paramString);
  if (!data.signature || data.signature !== expected) return fail('signature does not match');
  if (!PAYFAST_MERCHANT_ID || data.merchant_id !== PAYFAST_MERCHANT_ID) return fail('wrong merchant');

  // 2. It came from PayFast
  if (!(await isPayFastAddress(sourceIp))) return fail(`source address ${sourceIp ?? 'unknown'} is not PayFast`);

  // 3. The amount is checked by the caller, which knows the plan.

  // 4. PayFast confirms it sent this notification
  try {
    const res = await fetch(`https://${PAYFAST_HOST}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: paramString,
      signal: AbortSignal.timeout(10_000),
    });
    const answer = (await res.text()).trim();
    if (answer !== 'VALID') return fail(`PayFast did not confirm it (${answer.slice(0, 40) || res.status})`);
  } catch (err: any) {
    return fail(`PayFast confirmation failed: ${err?.message || 'no response'}`);
  }

  return { ok: true, data };
}

export function amountMatchesPlan(tier: string, amountGross: string | undefined): boolean {
  const plan = PRICING_PLANS[tier as keyof typeof PRICING_PLANS];
  if (!plan || plan.price_cents === 0 || amountGross === undefined) return false;
  return Math.abs(parseFloat(plan.payfast_amount) - parseFloat(amountGross)) <= 0.01;
}

// ── Recurring billing API ────────────────────────────────────────────────────

// Cancels the recurring charge at PayFast. Without this, cancelling in
// AuditPilot leaves the customer paying every month.
export async function cancelPayFastSubscription(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!passphrase) return { ok: false, error: 'PayFast passphrase is not configured' };
  if (!PAYFAST_MERCHANT_ID) return { ok: false, error: 'PayFast merchant ID is not configured' };

  const headers: Record<string, string> = {
    'merchant-id': PAYFAST_MERCHANT_ID,
    version: 'v1',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00'),
  };
  // API signature: every header and body variable plus the passphrase,
  // sorted alphabetically. The testing flag is left out.
  const signed: Record<string, string> = { ...headers, passphrase };
  const signature = md5(
    Object.keys(signed).sort().map((k: string) => `${k}=${pfEncode(signed[k])}`).join('&')
  );

  try {
    const res = await fetch(
      `https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/cancel${PAYFAST_SANDBOX ? '?testing=true' : ''}`,
      { method: 'PUT', headers: { ...headers, signature }, signal: AbortSignal.timeout(15_000) }
    );
    const json: any = await res.json().catch(() => null);
    if (res.ok && json?.status === 'success') return { ok: true };
    return { ok: false, error: json?.data?.message || json?.message || `PayFast returned ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'PayFast did not respond' };
  }
}
