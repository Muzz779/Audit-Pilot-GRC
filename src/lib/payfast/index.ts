// Plans and PayFast settings that are safe in the browser. Signing, payment
// notifications and the PayFast API are in ./server, which needs secrets.

// Test mode unless live payments are switched on explicitly with
// NEXT_PUBLIC_PAYFAST_SANDBOX=false. A missing setting used to mean live.
export const PAYFAST_SANDBOX = process.env.NEXT_PUBLIC_PAYFAST_SANDBOX !== 'false';
export const PAYFAST_HOST = PAYFAST_SANDBOX ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
export const PAYFAST_URL = `https://${PAYFAST_HOST}/eng/process`;

// The fallbacks are PayFast's public sandbox merchant, used only in test mode
export const PAYFAST_MERCHANT_ID =
  process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID || (PAYFAST_SANDBOX ? '10000100' : '');
export const PAYFAST_MERCHANT_KEY =
  process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY || (PAYFAST_SANDBOX ? '46f0cd694581a' : '');

// Pricing Plans in ZAR cents. Only list what the product does today: AI audits
// cover POPIA alone, and anything not built is marked as on request or planned.
export const PRICING_PLANS = {
  starter: {
    id: 'starter' as const,
    name: 'Starter',
    price_cents: 0,
    price_display: 'Free',
    description: 'Perfect for small teams getting started with GRC',
    features: [
      'Up to 5 users',
      '2 frameworks tracked (AI audit: POPIA, GDPR, NIS2, NIST CSF)',
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
      'All 8 frameworks tracked (AI audit: POPIA, GDPR, NIS2, NIST CSF)',
      'Risk heat map',
      'Unlimited policies',
      'Evidence repository',
      'AI Policy Drafter',
      'AI Risk Assessor',
      'Audit report generator',
      'Priority support',
      'PayFast recurring billing',
    ],
    cta: 'Get Pro',
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
      'Dedicated account manager',
      'Custom frameworks (on request)',
      'Custom integrations (on request)',
      'Service levels by agreement',
      'Planned: SSO / SAML, API access, white-labelling',
      'Planned: dedicated or on-premise deployment',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    payfast_amount: '0.00',
  },
};

// Format ZAR currency
export function formatZAR(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
