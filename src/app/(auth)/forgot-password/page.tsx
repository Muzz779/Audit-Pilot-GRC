'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/index';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Password reset instructions have been sent to <strong>{email}</strong>.
        </p>
        <Link href="/login">
          <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-sm mt-1">Enter your email and we'll send you a reset link</p>
      </div>
      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email" placeholder="you@company.co.za"
              value={email} onChange={e => setEmail(e.target.value)}
              className="pl-9" required autoFocus
            />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Send Reset Link <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
