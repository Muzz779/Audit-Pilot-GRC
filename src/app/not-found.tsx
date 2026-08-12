import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-6xl font-extrabold text-foreground mb-3">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  );
}
