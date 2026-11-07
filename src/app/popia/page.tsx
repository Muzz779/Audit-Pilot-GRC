import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy & POPIA Notice',
  description: 'What personal information AuditPilot processes, where it goes, and your rights under POPIA.',
};

// DRAFT. Written to describe what the product actually does today; it has not
// been reviewed by an attorney. Keep it in step with /security.

const PROVIDERS: [string, string, string][] = [
  ['Supabase', 'Database, sign-in and file storage', 'Frankfurt, Germany'],
  ['Vercel', 'Runs the application', 'Frankfurt, Germany, with pages delivered through a worldwide network'],
  ['Anthropic (Claude)', 'Reads document text to draft findings and answers', 'Outside South Africa, including the United States'],
  ['Voyage AI', 'Turns document text into search data, so findings can cite the right page', 'Outside South Africa (the provider does not state where)'],
  ['PayFast', 'Takes payments. We receive confirmation of payment, never card numbers', 'South Africa'],
];

export default function POPIAPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy &amp; POPIA Notice</h1>
            <p className="text-sm text-muted-foreground">Protection of Personal Information Act, 4 of 2013</p>
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
          <strong>Draft, pending legal review.</strong> This notice describes how AuditPilot works today, but a
          qualified attorney has not yet reviewed it. Until we confirm our cross-border arrangements below, please
          don&rsquo;t upload real personal information. Use sample or non-sensitive documents.
        </div>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Who we are</h2>
            <p>
              AuditPilot is South African governance, risk and compliance software. Our registered company details
              will be published here before we take on paying customers.
            </p>
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-1">
              <p><strong className="text-foreground">Information Officer:</strong> privacy@auditpilot.co.za</p>
              <p><strong className="text-foreground">Country:</strong> South Africa</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Our two roles</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-foreground">Your account.</strong> For your name, email address, organisation
                and billing details, AuditPilot is the responsible party.
              </li>
              <li>
                <strong className="text-foreground">Documents your organisation uploads.</strong> Your organisation is
                the responsible party for any personal information in them. AuditPilot acts as its operator and
                processes that information only to provide the service your organisation asks for.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. What we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Name, email address and organisation details</li>
              <li>Payment confirmations from PayFast. We never receive or store card numbers.</li>
              <li>A record of actions taken in your workspace, such as uploads and accepted findings</li>
              <li>IP address and device details in server logs</li>
              <li>The documents and data your organisation uploads</li>
            </ul>
            <p className="mt-3">
              We use cookies only to keep you signed in. Your browser also remembers your light or dark display
              setting. There are no advertising or analytics trackers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Why we use it</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide the service, including the AI analysis you ask for</li>
              <li>To take payments and manage subscriptions</li>
              <li>To send service messages and give support</li>
              <li>To keep the service secure and meet legal obligations</li>
            </ul>
            <p className="mt-3">AuditPilot does not train AI models on your documents.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Who processes it, and where</h2>
            <div className="space-y-2">
              {PROVIDERS.map(([name, role, where]: [string, string, string]) => (
                <div key={name} className="p-3 bg-muted rounded">
                  <p><strong className="text-foreground">{name}</strong>: {role}</p>
                  <p className="text-xs mt-0.5">Where: {where}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">
              Anthropic does not use data sent through its commercial API to train its models by default. Voyage
              AI&rsquo;s standard terms allow it to use submitted text to improve its models unless an account opts
              out, and we have not yet completed that opt-out. This notice will say when we have.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Transfers outside South Africa</h2>
            <p>
              Using the providers above sends personal information outside South Africa. Section 72 of POPIA allows
              this only on specific grounds, such as the recipient being bound by protections comparable to POPIA. We
              are confirming those grounds with our attorney, including signed data processing terms with each
              provider. We can&rsquo;t currently keep data inside South Africa, because our database provider has no
              South African region.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Security and retention</h2>
            <p>
              Each organisation&rsquo;s data is kept separate from every other organisation&rsquo;s, files are served
              through short-lived private links, and data is encrypted in transit and at rest. Our{' '}
              <Link href="/security" className="text-primary hover:underline">Security page</Link> has the details.
            </p>
            <p className="mt-3">
              We keep your data while your account is open. Deleting a document removes the file and its search data.
              To close your account and delete your whole workspace, or to get a copy of your data, contact us; this
              isn&rsquo;t yet available in the app. Deleted data may remain in our providers&rsquo; systems for a short
              time afterwards.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Your rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Find out what personal information we hold about you, and get a copy</li>
              <li>Have inaccurate information corrected</li>
              <li>Have your personal information deleted</li>
              <li>Object to how we process it</li>
              <li>Complain to the Information Regulator</li>
            </ul>
            <p className="mt-3">
              Contact <a href="mailto:privacy@auditpilot.co.za" className="text-primary hover:underline">privacy@auditpilot.co.za</a>.
              If the information is in documents your organisation uploaded, please contact your organisation first,
              because it decides how that information is used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Information Regulator</h2>
            <p>You can lodge a complaint with the Information Regulator of South Africa:</p>
            <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
              <p><strong className="text-foreground">Website:</strong> <a href="https://inforegulator.org.za" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>, which has a section for lodging complaints</p>
              <p><strong className="text-foreground">Email:</strong> enquiries@inforegulator.org.za</p>
              <p><strong className="text-foreground">Tel:</strong> 010 023 5200 or toll-free 0800 017 160</p>
            </div>
          </section>

          <p className="text-xs text-muted-foreground/70 border-t border-border pt-6">
            Last updated: 7 November 2026. Draft, pending legal review.
          </p>
        </div>
      </div>
    </div>
  );
}
