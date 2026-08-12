import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'POPIA Privacy Notice | AuditPilot' };

export default function POPIAPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">POPIA Privacy Notice</h1>
            <p className="text-sm text-muted-foreground">Protection of Personal Information Act, 4 of 2013</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Who We Are</h2>
            <p>AuditPilot is a South African technology company providing governance, risk and compliance (GRC) software. We are the Responsible Party as defined under POPIA.</p>
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-1">
              <p><strong className="text-foreground">Information Officer:</strong> privacy@auditpilot.co.za</p>
              <p><strong className="text-foreground">Country:</strong> South Africa</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Personal Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Name and surname</li>
              <li>Email address and phone number</li>
              <li>Company and organisation details</li>
              <li>Payment information (processed by PayFast — not stored by us)</li>
              <li>Usage data and activity within the platform</li>
              <li>IP address and device information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Purpose of Processing</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide and maintain the AuditPilot service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To communicate service updates and support</li>
              <li>To comply with legal obligations</li>
              <li>To improve our platform based on usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Your Rights Under POPIA</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access your personal information held by us</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to the processing of your personal information</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact: <a href="mailto:privacy@auditpilot.co.za" className="text-primary hover:underline">privacy@auditpilot.co.za</a></p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Third Party Processors</h2>
            <div className="space-y-2">
              {[
                ['Supabase', 'Database and authentication hosting'],
                ['PayFast', 'Payment processing (South African)'],
                ['Anthropic', 'AI processing for AI features'],
                ['Vercel', 'Application hosting and delivery'],
              ].map(([name, desc]) => (
                <div key={name} className="flex gap-3 p-2 bg-muted rounded">
                  <strong className="text-foreground w-24 shrink-0">{name}</strong>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Information Regulator</h2>
            <p>You have the right to lodge a complaint with the Information Regulator of South Africa:</p>
            <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
              <p><strong className="text-foreground">Website:</strong> <a href="https://www.justice.gov.za/inforeg/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.justice.gov.za/inforeg</a></p>
              <p><strong className="text-foreground">Email:</strong> inforeg@justice.gov.za</p>
              <p><strong className="text-foreground">Tel:</strong> 010 023 5207</p>
            </div>
          </section>

          <p className="text-xs text-muted-foreground/70 border-t border-border pt-6">
            Last updated: January 2025. This notice is reviewed annually.
          </p>
        </div>
      </div>
    </div>
  );
}
