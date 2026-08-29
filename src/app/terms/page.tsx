export const metadata = { title: 'Terms of Service — AuditPilot' };

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT Terms of Service. This is a starting template, NOT legal advice and NOT a
// finalised agreement. A qualified South African attorney must review and adapt it
// (company details, liability caps, POPIA/privacy specifics, consumer-protection
// compliance) before it is used with real customers. Placeholders are in [brackets].
// ─────────────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  const updated = '29 August 2026';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-800 dark:text-gray-200">
      <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="text-sm font-semibold">DRAFT — pending legal review</p>
        <p className="mt-1 text-xs">
          This document is a template and has not yet been reviewed by a qualified legal practitioner.
          It is provided for internal preparation only and does not constitute legal advice. Do not
          rely on it as a binding agreement until a South African attorney has reviewed and adapted it.
        </p>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
      <p className="mt-1 text-sm text-gray-500">Last updated: {updated}</p>

      <p className="mt-6 text-sm leading-relaxed">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of AuditPilot (the
        &ldquo;Service&rdquo;), operated by [Company Legal Name] (&ldquo;AuditPilot&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>

      <Section n="1" title="What AuditPilot is (and is not)">
        AuditPilot is an AI-assisted governance, risk and compliance (GRC) tool. It analyses documents
        you upload and produces <strong>draft, decision-support findings</strong> against compliance
        frameworks. AuditPilot is <strong>not a law firm, not a compliance certification body, and does
        not provide legal advice</strong>. Findings, scores, and reports are informational aids to be
        reviewed by a qualified person within your organisation. They are not a determination that you
        are, or are not, compliant with any law or standard.
      </Section>

      <Section n="2" title="AI-generated content and human review">
        The Service uses artificial intelligence to generate findings and other content. AI output can
        be incomplete, inaccurate, or wrong. Every AI-generated finding is a <strong>draft requiring
        human review and acceptance</strong> before it forms part of your records. You are responsible
        for reviewing all output and for any decisions you make based on it.
      </Section>

      <Section n="3" title="Regulation data is unverified">
        The regulatory knowledge base used by the Service (including POPIA content) is
        <strong> AI-drafted and has not been verified by a qualified legal practitioner</strong>.
        Frameworks other than POPIA currently have <strong>no regulation knowledge base</strong>, and
        findings generated for them are AI general-knowledge only and are labelled as illustrative. You
        must independently verify all findings against the official text of any applicable law or
        standard and obtain professional advice before acting.
      </Section>

      <Section n="4" title="Your responsibilities">
        You are responsible for: (a) the accuracy, legality, and rights to the documents and data you
        upload; (b) obtaining any consents required to process personal information contained in your
        uploads; (c) reviewing all AI output before relying on it; and (d) keeping your account
        credentials secure. You must not use the Service unlawfully, to infringe others&rsquo; rights,
        or to attempt to breach its security or access other organisations&rsquo; data.
      </Section>

      <Section n="5" title="Data protection and privacy">
        Your use of the Service is also governed by our Privacy Policy [link]. You remain the
        responsible party (data controller) for personal information you upload. We process it on your
        behalf to provide the Service, in accordance with the Protection of Personal Information Act,
        2013 (POPIA) and our Privacy Policy. [A separate data-processing agreement may be required.]
      </Section>

      <Section n="6" title="Fees and billing">
        Paid plans are billed in South African Rand (ZAR) via our payment provider, PayFast.
        Fees, billing cycles, and any usage limits (including AI-operation caps on free plans) are as
        described at sign-up or on the billing page. Unless required by law, fees are non-refundable.
        We may change fees on reasonable notice.
      </Section>

      <Section n="7" title="Intellectual property">
        The Service, including its software and content (excluding your uploaded data and generated
        outputs relating to it), is owned by AuditPilot and its licensors. You retain ownership of the
        documents you upload. You grant us a limited licence to process them solely to provide the
        Service.
      </Section>

      <Section n="8" title="Disclaimer of warranties">
        The Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>,
        without warranties of any kind, whether express or implied, including fitness for a particular
        purpose, accuracy, or non-infringement. We do not warrant that findings are accurate or that
        use of the Service will result in compliance with any law or standard.
      </Section>

      <Section n="9" title="Limitation of liability">
        To the maximum extent permitted by law, AuditPilot will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or for any loss of profits, data, or
        goodwill, arising from your use of or reliance on the Service or its output. Our total
        aggregate liability for any claim will not exceed the amount you paid us for the Service in the
        [three (3)] months preceding the event giving rise to the claim. Nothing in these Terms
        excludes liability that cannot be excluded under South African law, including under the Consumer
        Protection Act where applicable.
      </Section>

      <Section n="10" title="Indemnity">
        You agree to indemnify and hold AuditPilot harmless from claims arising out of your uploaded
        data, your use of the Service, or your breach of these Terms, except to the extent caused by our
        own unlawful conduct.
      </Section>

      <Section n="11" title="Termination">
        You may stop using the Service at any time. We may suspend or terminate access if you breach
        these Terms or to protect the Service or other users. On termination, your right to use the
        Service ends; provisions that by their nature should survive (including disclaimers and
        limitations of liability) will survive.
      </Section>

      <Section n="12" title="Changes to these Terms">
        We may update these Terms from time to time. Material changes will be notified through the
        Service or by email. Continued use after changes take effect constitutes acceptance.
      </Section>

      <Section n="13" title="Governing law">
        These Terms are governed by the laws of the Republic of South Africa, and you submit to the
        jurisdiction of the South African courts.
      </Section>

      <Section n="14" title="Contact">
        Questions about these Terms: [support@auditpilot.co.za] · [Company Legal Name] · [Registered
        address].
      </Section>

      <p className="mt-10 text-xs text-gray-500">
        Reminder: this is a draft template and must be reviewed by a qualified South African attorney
        before use with customers.
      </p>
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{n}. {title}</h2>
      <p className="mt-2 text-sm leading-relaxed">{children}</p>
    </section>
  );
}
