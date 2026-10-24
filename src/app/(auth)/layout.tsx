import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white p-12">
        <Link href="/" className="flex items-center gap-2 mb-16">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">AuditPilot</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center">
          <blockquote className="text-3xl font-light leading-snug mb-6 text-white">
            Compliance you can <span className="font-semibold">prove</span>, not just claim.
          </blockquote>
          <p className="text-sm leading-relaxed text-brand-100 max-w-sm">
            An evidence-based AI auditor for POPIA. Upload the policies you already have and get
            traceable, cited findings against the Act — reviewed and accepted by your team.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[['🇿🇦', 'POPIA-first'], ['📄', 'Cited findings'], ['✅', 'Human-reviewed']].map(([icon, label]) => (
            <div key={label} className="text-center p-3 rounded-xl bg-white/10">
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-xs text-brand-100">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth content */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">AuditPilot</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
