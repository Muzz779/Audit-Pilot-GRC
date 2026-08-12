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
          <blockquote className="text-2xl font-light leading-relaxed mb-8 text-brand-100">
            "The only GRC platform that truly understands South African compliance requirements."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">NK</div>
            <div>
              <p className="font-semibold text-sm">Nomsa Khumalo</p>
              <p className="text-xs text-brand-200">Chief Compliance Officer, Old Mutual</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[['🇿🇦', 'POPIA Ready'], ['🔒', 'ISO 27001'], ['🛡️', 'SOC 2']].map(([icon, label]) => (
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
