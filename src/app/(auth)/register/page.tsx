'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Building2, Globe, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { createClient } from '@/lib/supabase/client';
import { generateSlug, INDUSTRIES, COMPANY_SIZES } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'account' | 'organisation';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvited = searchParams.get('invited') === 'true';
  const invitedOrgId = searchParams.get('org');

  const [step, setStep] = useState<Step>('account');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({ email: '', password: '', full_name: '' });
  const [orgForm, setOrgForm] = useState({ name: '', industry: '', size: '' });

  const supabase = createClient();

  // If invited user — they already have an org, skip org creation step
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.email || !accountForm.password || !accountForm.full_name) {
      return toast.error('All fields are required');
    }
    if (accountForm.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: accountForm.email,
        password: accountForm.password,
        options: {
          data: { full_name: accountForm.full_name },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from signup');

      const newUserId = data.user.id;
      setUserId(newUserId);

      // Update profile with full name
      await supabase
        .from('profiles')
        .update({ full_name: accountForm.full_name.trim() })
        .eq('id', newUserId);

      // If this is an invited user — link them to the org directly
      if (isInvited && invitedOrgId) {
        const invitedRole = data.user.user_metadata?.invited_role || 'member';
        await supabase
          .from('profiles')
          .update({
            organisation_id: invitedOrgId,
            role: invitedRole,
            full_name: accountForm.full_name.trim(),
            onboarding_completed: true,
          })
          .eq('id', newUserId);

        toast.success('Account created! You have been added to your organisation.');
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // Normal signup — go to org step
      setStep('organisation');
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('An account with this email already exists. Please sign in.');
      } else {
        toast.error(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) return toast.error('Organisation name is required');
    setLoading(true);
    try {
      // Get current user to be safe
      const { data: { user } } = await supabase.auth.getUser();
      const uid = userId || user?.id;
      if (!uid) throw new Error('No user session — please sign in again');

      const slug = `${generateSlug(orgForm.name)}-${Date.now()}`;

      // Create organisation
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .insert({
          name: orgForm.name.trim(),
          slug,
          industry: orgForm.industry || null,
          size: orgForm.size || null,
          country: 'ZA',
          timezone: 'Africa/Johannesburg',
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile — owner role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organisation_id: org.id,
          role: 'owner',
          onboarding_completed: true,
        })
        .eq('id', uid);

      if (profileError) throw profileError;

      // Create starter subscription
      await supabase.from('subscriptions').insert({
        organisation_id: org.id,
        tier: 'starter',
        status: 'active',
        amount_cents: 0,
        billing_cycle: 'monthly',
      });

      // Welcome notification
      await supabase.from('notifications').insert({
        organisation_id: org.id,
        user_id: uid,
        type: 'system',
        title: 'Welcome to AuditPilot! 🎉',
        message: `Your workspace "${orgForm.name}" is ready. Start by adding your compliance frameworks.`,
      });

      toast.success('Workspace created! Taking you to your dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Invited banner */}
      {isInvited && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            You have been invited to join an organisation on AuditPilot. Create your account to accept.
          </p>
        </div>
      )}

      {/* Step indicator — only show if not invited */}
      {!isInvited && (
        <div className="flex items-center gap-2 mb-8">
          {(['account', 'organisation'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step === s ? 'text-primary' : step === 'organisation' && s === 'account' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step === 'organisation' && s === 'account'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step === 'organisation' && s === 'account' ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium capitalize hidden sm:block">
                  {s === 'account' ? 'Your Account' : 'Organisation'}
                </span>
              </div>
              {i < 1 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* STEP 1: Account */}
      {step === 'account' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {isInvited ? 'Create your account' : 'Create your account'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isInvited
                ? 'Set up your login to accept the invitation'
                : 'Start your free GRC workspace — no credit card required'}
            </p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                placeholder="Thabo Mokoena"
                value={accountForm.full_name}
                onChange={e => setAccountForm(p => ({ ...p, full_name: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="thabo@company.co.za"
                value={accountForm.email}
                onChange={e => setAccountForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={accountForm.password}
                  onChange={e => setAccountForm(p => ({ ...p, password: e.target.value }))}
                  className="pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              {isInvited ? 'Create Account & Accept Invite' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By registering you agree to our{' '}
            <a href="/popia" className="text-primary hover:underline">Privacy Policy</a>
            {' '}(POPIA compliant)
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}

      {/* STEP 2: Organisation */}
      {step === 'organisation' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Set up your organisation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              This creates your isolated GRC workspace
            </p>
          </div>

          <form onSubmit={handleCreateOrganisation} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org_name">Organisation Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="org_name"
                  placeholder="Acme Financial Services"
                  value={orgForm.name}
                  onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))}
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={orgForm.industry} onValueChange={v => setOrgForm(p => ({ ...p, industry: v }))}>
                <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Company Size</Label>
              <Select value={orgForm.size} onValueChange={v => setOrgForm(p => ({ ...p, size: v }))}>
                <SelectTrigger><SelectValue placeholder="Number of employees" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground flex items-start gap-2">
              <Globe className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Your workspace is completely isolated — other organisations cannot see your data.
                POPIA compliant, hosted securely.
              </span>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Create Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
