'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/index';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required');
    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: form.email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        setMagicLinkSent(true);
        toast.success('Check your email for a magic link!');
      } else {
        if (!form.password) return toast.error('Password is required');
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-muted-foreground text-sm mb-6">
          We sent a magic link to <strong>{form.email}</strong>. Click the link to sign in.
        </p>
        <Button variant="outline" onClick={() => setMagicLinkSent(false)}>Try again</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your AuditPilot workspace</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email" type="email" placeholder="you@company.co.za"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="pl-9" required autoFocus
            />
          </div>
        </div>

        {mode === 'password' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="pl-9 pr-9" required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {mode === 'magic' ? 'Send Magic Link' : 'Sign In'} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs text-muted-foreground uppercase bg-background px-2">or</div>
        </div>
        <button
          onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Mail className="w-4 h-4" />
          {mode === 'password' ? 'Sign in with Magic Link' : 'Sign in with Password'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/register" className="text-brand-600 font-semibold hover:underline">Create workspace →</Link>
      </p>
    </div>
  );
}
