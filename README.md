# 🛡️ AuditPilot — AI-Powered GRC Platform

**The complete Governance, Risk & Compliance platform built for South African businesses.**  
Manage POPIA, ISO 27001, SOC 2, King IV, GDPR, and more — with AI automation, risk heat maps, policy management, and PayFast billing in ZAR.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui + Lucide Icons |
| Database & Auth | Supabase (Postgres, RLS, Realtime) |
| AI | Anthropic Claude API |
| Payments | PayFast (ZAR recurring subscriptions) |
| Deployment | Vercel |
| Charts | Recharts |

---

## ✨ Features

- 🔐 **Multi-tenant isolation** — full Row Level Security per organisation
- 🇿🇦 **POPIA compliance** built-in with framework controls
- 🤖 **AI Policy Drafter** — Claude generates policies from description
- 🧠 **AI Risk Assessor** — score and mitigate risks with AI
- 🔍 **Regulatory Scanner** — simulated compliance alert scanning
- 💬 **GRC Chat Assistant** — ask anything about compliance
- 🗺️ **Risk Heat Map** — visual likelihood × impact grid
- 📋 **Policy Library** — 50+ templates, version control, acknowledgements
- 🛡️ **8 Compliance Frameworks** — POPIA, ISO 27001, SOC 2, GDPR, King IV, NIS2, PCI-DSS, NIST CSF
- 💳 **PayFast Subscriptions** — ZAR billing, sandbox + live, webhook handling
- 📊 **Audit Reports** — auto-generated HTML compliance reports
- 🔔 **Realtime Notifications** — Supabase Realtime
- 🌙 **Dark/Light Mode**
- 👑 **Platform Admin** panel for super-users
- 📱 **Fully responsive** mobile-first design

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Anthropic API key (claude.ai/api)
- PayFast merchant account (sandbox for testing)
- Vercel account (for deployment)

---

## 🏗️ Local Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/auditpilot.git
cd auditpilot
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see [Environment Variables](#environment-variables) below.

### 3. Set up Supabase

#### Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to South Africa (e.g. **eu-west-1** or **us-east-1**)
3. Save your **Project URL** and **anon key** from Settings → API

#### Run the database schema
1. Go to your Supabase project → SQL Editor
2. Open `supabase/schema.sql` from this repo
3. Copy the entire contents and run it in the SQL Editor
4. (Optional) Run `supabase/seed.sql` for demo data

#### Enable Supabase Auth
1. Go to Authentication → Settings
2. Enable **Email OTP** (for magic links)
3. Set **Site URL** to `http://localhost:3000` (dev) or your production domain
4. Add redirect URLs: `http://localhost:3000/**` and `https://yourdomain.com/**`

#### Enable Realtime
1. Go to Database → Replication
2. Enable replication for: `notifications`, `audit_logs`, `risks`

### 4. Configure PayFast (Sandbox)

#### Create a PayFast sandbox account
1. Go to [sandbox.payfast.co.za](https://sandbox.payfast.co.za)
2. Register as a merchant
3. Get your **Merchant ID** and **Merchant Key**
4. Set a **Passphrase** in merchant settings (required for signature validation)

#### PayFast sandbox test details
- Card number: `4000000000000002`
- Expiry: any future date
- CVV: `123`

#### Set environment variables
```env
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=10000100  # Your sandbox merchant ID
NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=46f0cd694581a  # Your sandbox key
PAYFAST_PASSPHRASE=yourpassphrase  # Set in PayFast merchant settings
NEXT_PUBLIC_PAYFAST_SANDBOX=true
```

#### Configure webhook URL
In PayFast merchant settings, set the webhook/notify URL to:
```
https://yourdomain.com/api/payfast/webhook
```
For local testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Set: https://abc123.ngrok.io/api/payfast/webhook
```

### 5. Configure Anthropic
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🌍 Vercel Deployment

### Method 1: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### Method 2: GitHub Integration (Recommended)

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set **Framework Preset**: Next.js
4. Add all environment variables (see below)
5. Deploy

### Required Environment Variables on Vercel

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NEXT_PUBLIC_PAYFAST_MERCHANT_ID` | PayFast merchant dashboard |
| `NEXT_PUBLIC_PAYFAST_MERCHANT_KEY` | PayFast merchant dashboard |
| `PAYFAST_PASSPHRASE` | PayFast merchant settings |
| `NEXT_PUBLIC_PAYFAST_SANDBOX` | `false` for production |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.vercel.app` |

### After deployment

1. **Update Supabase Site URL**: Authentication → Settings → Site URL → set to your Vercel URL
2. **Update PayFast webhook URL**: Set to `https://yourdomain.vercel.app/api/payfast/webhook`
3. **Add redirect URLs** in Supabase: `https://yourdomain.vercel.app/**`

### Custom domain
1. In Vercel → Domains → Add domain
2. Follow DNS instructions for your registrar
3. Update Supabase Site URL to your custom domain

---

## 💳 PayFast Going Live

1. Create a **live PayFast merchant account** at [payfast.co.za](https://payfast.co.za)
2. Complete merchant verification (FICA documents)
3. Update environment variables:
   ```env
   NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_live_merchant_id
   NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=your_live_merchant_key
   PAYFAST_PASSPHRASE=your_live_passphrase
   NEXT_PUBLIC_PAYFAST_SANDBOX=false
   ```
4. Test with a real card (small amount)
5. Set webhook URL in live PayFast dashboard

---

## 🔐 Setting Up Platform Admin

To give yourself super-user access:

```sql
-- Run in Supabase SQL Editor
UPDATE profiles 
SET is_platform_admin = true 
WHERE email = 'your-email@domain.com';
```

Then navigate to `/admin` in the app.

---

## 📁 Project Structure

```
auditpilot/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, Register, Forgot Password
│   │   ├── (dashboard)/      # All protected app pages
│   │   │   ├── dashboard/    # Home dashboard
│   │   │   ├── policies/     # Policy management
│   │   │   ├── risks/        # Risk register + heat map
│   │   │   ├── compliance/   # Framework compliance
│   │   │   ├── audit/        # Audit & evidence
│   │   │   ├── ai-tools/     # AI features
│   │   │   ├── settings/     # Team, billing, integrations
│   │   │   └── admin/        # Platform admin
│   │   ├── api/              # API routes
│   │   │   ├── ai/           # Claude AI endpoints
│   │   │   ├── payfast/      # PayFast webhook + subscription
│   │   │   ├── policies/     # Policy CRUD
│   │   │   ├── risks/        # Risk CRUD
│   │   │   ├── compliance/   # Framework + controls
│   │   │   ├── evidence/     # Evidence repository
│   │   │   ├── audit-report/ # Report generator
│   │   │   └── notifications/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Sidebar, Topbar, DashboardContent
│   │   ├── policies/         # Policy management UI
│   │   ├── risks/            # Risk register + heat map UI
│   │   ├── compliance/       # Compliance framework UI
│   │   ├── audit/            # Audit & evidence UI
│   │   ├── ai/               # AI tools UI
│   │   ├── settings/         # Team, billing UI
│   │   ├── admin/            # Admin panel UI
│   │   ├── landing/          # Marketing landing page
│   │   └── shared/           # ThemeProvider, etc.
│   ├── lib/
│   │   ├── supabase/         # Supabase client, server, middleware
│   │   ├── payfast/          # PayFast utilities + pricing
│   │   ├── anthropic/        # Claude AI functions
│   │   └── utils/            # Helper utilities
│   ├── types/                # TypeScript type definitions
│   └── middleware.ts          # Auth route protection
├── supabase/
│   ├── schema.sql            # Complete database schema with RLS
│   └── seed.sql              # Demo data
├── public/
├── .env.example
├── vercel.json
└── README.md
```

---

## 🗄️ Database Schema

Key tables:
- `organisations` — multi-tenant root, isolated by RLS
- `profiles` — extends auth.users with role and org
- `subscriptions` — PayFast subscription tracking
- `compliance_frameworks` — seeded with 8 frameworks
- `organisation_frameworks` — which frameworks each org tracks
- `controls` — compliance controls per framework
- `evidence` — evidence repository
- `policies` + `policy_versions` + `policy_acknowledgements`
- `risks` — risk register with auto-calculated scores
- `audits` — audit scheduling and tracking
- `audit_logs` — immutable activity log
- `notifications` — realtime notifications
- `ai_interactions` — AI usage tracking

All tables have **Row Level Security** enabled. Tenants are completely isolated.

---

## 💰 Pricing Model

| Plan | Price | Users | Frameworks |
|---|---|---|---|
| Starter | Free | 5 | 2 |
| Pro | R799/mo | 25 | All |
| Enterprise | Custom | Unlimited | Custom |

PayFast recurring subscriptions via ITN (Instant Transaction Notification) webhook.

---

## 🤖 AI Features

All powered by **Claude claude-sonnet-5**:

1. **GRC Chat Assistant** — free for all users
2. **Policy Drafter** — Pro+, generates full policy documents
3. **Risk Assessor** — Pro+, scores risks and suggests mitigations
4. **Regulatory Scanner** — Pro+, simulates regulatory change alerts

---

## 🔒 Security

- Supabase RLS on every table
- Service role key only used server-side
- PayFast signature verification on webhooks
- JWT-based auth via Supabase
- No sensitive data in client-side code
- HTTPS enforced in production

---

## 📧 Support

- Email: support@auditpilot.co.za
- Enterprise: sales@auditpilot.co.za
- Integrations: integrations@auditpilot.co.za

---

## 📄 Licence

MIT — Built with ❤️ in 🇿🇦 South Africa

---

*AuditPilot is POPIA compliant. Personal information is processed in accordance with the Protection of Personal Information Act, 2013 (Act 4 of 2013).*
#   A u d i t - P i l o t - G R C  
 