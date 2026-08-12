import crypto from 'crypto';
import type { PayFastPaymentData, PayFastWebhookPayload } from '@/types';

const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';
const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process';

export const PAYFAST_URL = process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true'
  ? PAYFAST_SANDBOX_URL
  : PAYFAST_LIVE_URL;

export const PAYFAST_MERCHANT_ID = process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID || '10000100';
export const PAYFAST_MERCHANT_KEY = process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY || '46f0cd694581a';

// Pricing Plans in ZAR cents
export const PRICING_PLANS = {
  starter: {
    id: 'starter' as const,
    name: 'Starter',
    price_cents: 0,
    price_display: 'Free',
    description: 'Perfect for small teams getting started with GRC',
    features: [
      'Up to 5 users',
      '2 compliance frameworks',
      'Basic risk register',
      'Policy library (5 policies)',
      'Email support',
      'POPIA compliance checklist',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    payfast_amount: '0.00',
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    price_cents: 79900,
    price_display: 'R799/mo',
    description: 'For growing businesses serious about compliance',
    features: [
      'Up to 25 users',
      'All compliance frameworks',
      'Advanced risk heat map',
      'Unlimited policies',
      'Evidence repository (50GB)',
      'AI Policy Drafter',
      'AI Risk Assessor',
      'Audit report generator',
      'Priority support',
      'PayFast recurring billing',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
    payfast_amount: '799.00',
  },
  enterprise: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price_cents: 0,
    price_display: 'Custom',
    description: 'Enterprise-grade GRC for large organisations',
    features: [
      'Unlimited users',
      'Custom frameworks',
      'Dedicated AI instance',
      'White-labelling',
      'API access',
      'SSO / SAML',
      'SLA guarantee',
      'Dedicated account manager',
      'On-premise option',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    payfast_amount: '0.00',
  },
};

// Generate PayFast signature
export function generateSignature(data: Record<string, string>, passphrase?: string): string {
  // Build the query string from sorted data
  const queryString = Object.entries(data)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const stringToHash = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : queryString;

  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

// Build PayFast payment form data
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

  const data: PayFastPaymentData = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${params.appUrl}/settings/billing?status=success`,
    cancel_url: `${params.appUrl}/settings/billing?status=cancelled`,
    notify_url: `${params.appUrl}/api/payfast/webhook`,
    name_first: params.firstName,
    name_last: params.lastName,
    email_address: params.userEmail,
    m_payment_id: `${params.orgId}-${Date.now()}`,
    amount: plan.payfast_amount,
    item_name: `AuditPilot ${plan.name} Plan`,
    item_description: `Monthly subscription - ${plan.name} tier`,
    subscription_type: '1',
    billing_date: new Date().toISOString().split('T')[0],
    recurring_amount: plan.payfast_amount,
    frequency: '3', // Monthly
    cycles: '0', // Indefinite
    custom_str1: params.orgId,
    custom_str2: params.tier,
    custom_str3: params.userId,
  } as PayFastPaymentData;

  // Generate signature
  const dataWithoutSignature = { ...data } as Record<string, string>;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  data.signature = generateSignature(dataWithoutSignature, passphrase);

  return data;
}

// Verify PayFast webhook
export function verifyPayFastWebhook(payload: PayFastWebhookPayload): boolean {
  const { signature, ...data } = payload;
  const calculatedSignature = generateSignature(
    data as Record<string, string>,
    process.env.PAYFAST_PASSPHRASE
  );
  return calculatedSignature === signature;
}

// Format ZAR currency
export function formatZAR(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
