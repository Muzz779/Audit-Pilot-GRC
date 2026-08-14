'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckSquare, BookOpen, ClipboardList,
  TrendingUp, TrendingDown, ArrowRight, Zap, Shield,
} from 'lucide-react';
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Progress } from '@/components/ui/index';
import {
  cn, formatDate, timeAgo, getRiskLevel, getRiskLevelColor,
  getComplianceBgColor, getComplianceColor,
} from '@/lib/utils';
import type { Subscription } from '@/types';

interface DashboardContentProps {
  stats: {
    overall_risk_score: number;
    open_risks: number;
    critical_risks: number;
    compliance_percentage: number;
    avg_framework_score: number;
    active_policies: number;
    upcoming_audits: number;
  };
  controlStats: {
    implemented: number;
    in_progress: number;
    not_started: number;
    not_applicable: number;
  };
  onboarding: {
    hasFramework: boolean;
    hasEvidence: boolean;
    hasAnalyzed: boolean;
    hasFindings: boolean;
  };
  risks: any[];
  policies: any[];
  frameworks: any[];
  recentActivity: any[];
  subscription: Subscription | null;
  orgName: string;
}

const RISK_COLORS: Record<string, string> = {
  critical: '#f43f5e',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
};

export function DashboardContent({
  stats, controlStats, onboarding, risks, policies, frameworks, recentActivity, subscription, orgName,
}: DashboardContentProps) {
  // First-run checklist — shown until the org has completed the core setup flow
  const onboardingSteps = [
    { done: onboarding.hasFramework, label: 'Add a compliance framework',   hint: 'Start with POPIA',            href: '/compliance', cta: 'Add framework' },
    { done: onboarding.hasEvidence,  label: 'Upload a compliance document', hint: 'Your policy, contract, etc.',  href: '/audit',      cta: 'Upload evidence' },
    { done: onboarding.hasAnalyzed,  label: 'Analyze the document',         hint: 'Extracts & indexes evidence', href: '/audit',      cta: 'Analyze' },
    { done: onboarding.hasFindings,  label: 'Run an audit',                 hint: 'Generate cited findings',     href: '/findings',   cta: 'Run audit' },
  ];
  const onboardingComplete = onboardingSteps.every(s => s.done);
  const onboardingDoneCount = onboardingSteps.filter(s => s.done).length;
  const topRisks = [...risks]
    .filter(r => r.status !== 'resolved' && r.status !== 'accepted')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  // Real control-status breakdown — the compliance overview bar (no fabricated trend)
  const controlSegments = [
    { key: 'implemented',    label: 'Implemented', value: controlStats.implemented,    cls: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'in_progress',    label: 'In progress', value: controlStats.in_progress,    cls: 'bg-amber-500',   dot: 'bg-amber-500'   },
    { key: 'not_started',    label: 'Not started', value: controlStats.not_started,    cls: 'bg-gray-400',    dot: 'bg-gray-400'    },
    { key: 'not_applicable', label: 'N/A',         value: controlStats.not_applicable, cls: 'bg-gray-200 dark:bg-gray-700', dot: 'bg-gray-300 dark:bg-gray-600' },
  ];
  const totalControls = controlSegments.reduce((s, seg) => s + seg.value, 0);
  const applicableTotal = totalControls - controlStats.not_applicable;

  // Real risk distribution from actual data
  const riskDist = [
    { name: 'Critical', value: risks.filter(r => r.risk_score >= 17).length,                          color: RISK_COLORS.critical },
    { name: 'High',     value: risks.filter(r => r.risk_score >= 10 && r.risk_score <= 16).length,    color: RISK_COLORS.high     },
    { name: 'Medium',   value: risks.filter(r => r.risk_score >= 5  && r.risk_score <= 9).length,     color: RISK_COLORS.medium   },
    { name: 'Low',      value: risks.filter(r => r.risk_score <= 4).length,                           color: RISK_COLORS.low      },
  ].filter(d => d.value > 0);

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* First-run onboarding checklist — disappears once setup is complete */}
      {!onboardingComplete && (
        <Card className="border-brand-200 dark:border-brand-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Get started with AuditPilot</CardTitle>
                <CardDescription className="text-xs">
                  {onboardingDoneCount} of {onboardingSteps.length} steps complete — finish setup to run your first audit
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">{onboardingDoneCount}/{onboardingSteps.length}</Badge>
            </div>
            <Progress
              value={(onboardingDoneCount / onboardingSteps.length) * 100}
              indicatorColor="bg-brand-500"
              className="h-1.5 mt-2"
            />
          </CardHeader>
          <CardContent className="space-y-1.5">
            {onboardingSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3 p-2 rounded-lg">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                  step.done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-muted text-muted-foreground'
                )}>
                  {step.done ? <CheckSquare className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', step.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{step.hint}</p>
                </div>
                {!step.done && (
                  <Link href={step.href}>
                    <Button variant="outline" size="sm" className="text-xs h-7 shrink-0">{step.cta} →</Button>
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upgrade banner */}
      {!isPro && (
        <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 p-4 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Upgrade to Pro for full AI features</p>
              <p className="text-xs text-white/80">AI Policy Drafter, Risk Assessor, unlimited frameworks and more</p>
            </div>
          </div>
          <Link href="/settings/billing">
            <Button size="sm" className="bg-white text-brand-700 hover:bg-white/90 shrink-0">
              Upgrade — R799/mo
            </Button>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Risk Score',
            value: stats.overall_risk_score || 0,
            unit: '/25',
            subtitle: `${stats.open_risks} open risks`,
            icon: AlertTriangle,
            color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
            trend: stats.critical_risks > 0 ? `${stats.critical_risks} critical` : 'No critical',
            trendUp: false,
            className: 'stagger-1',
          },
          {
            title: 'Compliance',
            value: `${stats.compliance_percentage}%`,
            unit: '',
            subtitle: `Avg framework: ${stats.avg_framework_score}%`,
            icon: CheckSquare,
            color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20',
            trend: stats.avg_framework_score >= 70 ? 'On track' : 'Needs work',
            trendUp: stats.avg_framework_score >= 70,
            className: 'stagger-2',
          },
          {
            title: 'Active Policies',
            value: stats.active_policies,
            unit: '',
            subtitle: 'Approved & in force',
            icon: BookOpen,
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
            trend: null,
            trendUp: true,
            className: 'stagger-3',
          },
          {
            title: 'Upcoming Audits',
            value: stats.upcoming_audits,
            unit: '',
            subtitle: 'Scheduled',
            icon: ClipboardList,
            color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
            trend: null,
            trendUp: true,
            className: 'stagger-4',
          },
        ].map(s => (
          <Card key={s.title} className={cn('card-hover', s.className)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                  <s.icon className="w-4 h-4" />
                </div>
                {s.trend && (
                  <div className={cn('flex items-center gap-1 text-xs font-medium', s.trendUp ? 'text-emerald-600' : 'text-rose-600')}>
                    {s.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {s.trend}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                  {s.unit && <span className="text-sm text-muted-foreground">{s.unit}</span>}
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.title}</p>
                {s.subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{s.subtitle}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Compliance overview — real control-status breakdown (no fabricated history) */}
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Compliance Overview</CardTitle>
                <CardDescription className="text-xs">Control implementation across all frameworks</CardDescription>
              </div>
              <Badge variant="success" className="text-xs">
                {stats.compliance_percentage}% implemented
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {totalControls === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No controls yet — add a framework to start tracking compliance</p>
                <Link href="/compliance">
                  <Button variant="ghost" size="sm" className="mt-2 text-xs">Add framework →</Button>
                </Link>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center space-y-5 py-2">
                {/* Stacked proportion bar — real counts */}
                <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
                  {controlSegments.map(seg => seg.value > 0 && (
                    <div
                      key={seg.key}
                      className={seg.cls}
                      style={{ width: `${(seg.value / totalControls) * 100}%` }}
                      title={`${seg.label}: ${seg.value}`}
                    />
                  ))}
                </div>

                {/* Legend with counts */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {controlSegments.map(seg => (
                    <div key={seg.key} className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', seg.dot)} />
                      <span className="text-xs text-muted-foreground">
                        {seg.label}: <strong className="text-foreground">{seg.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {controlStats.implemented} of {applicableTotal} applicable control{applicableTotal === 1 ? '' : 's'} implemented
                  {' '}across {frameworks.length} framework{frameworks.length === 1 ? '' : 's'}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk distribution */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Risk Distribution</CardTitle>
            <CardDescription className="text-xs">{risks.length} total risks</CardDescription>
          </CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Shield className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No risks registered yet</p>
                <Link href="/risks">
                  <Button variant="ghost" size="sm" className="mt-2 text-xs">Add first risk →</Button>
                </Link>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={riskDist}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={62}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {riskDist.map((entry: any, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [v, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {riskDist.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">
                        {d.name}: <strong className="text-foreground">{d.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Framework compliance */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Framework Status</CardTitle>
              <Link href="/compliance">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {frameworks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No frameworks added yet</p>
                <Link href="/compliance">
                  <Button variant="outline" size="sm" className="mt-2 text-xs">+ Add Framework</Button>
                </Link>
              </div>
            ) : (
              frameworks.slice(0, 5).map((f: any) => (
                <div key={f.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{f.framework?.icon}</span>
                      <span className="text-xs font-medium truncate max-w-[110px]">{f.framework?.short_name}</span>
                    </div>
                    <span className={cn('text-xs font-bold', getComplianceColor(f.compliance_score))}>
                      {f.compliance_score}%
                    </span>
                  </div>
                  <Progress
                    value={f.compliance_score}
                    indicatorColor={getComplianceBgColor(f.compliance_score)}
                    className="h-1.5"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top risks */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Top Risks</CardTitle>
              <Link href="/risks">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRisks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No open risks</p>
                <Link href="/risks">
                  <Button variant="ghost" size="sm" className="mt-1 text-xs">Add risk →</Button>
                </Link>
              </div>
            ) : (
              topRisks.map((risk: any) => {
                const level = getRiskLevel(risk.risk_score);
                return (
                  <Link key={risk.id} href="/risks">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{risk.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{risk.status}</p>
                      </div>
                      <span className={cn('status-badge ml-2 shrink-0', getRiskLevelColor(level))}>
                        {risk.risk_score}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              recentActivity.slice(0, 7).map((log: any) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-tight">
                      <span className="font-medium">{log.user?.full_name || 'System'}</span>{' '}
                      {log.action}
                      {log.resource_name && (
                        <span className="text-muted-foreground"> · {log.resource_name}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/policies', label: 'Create Policy',  icon: BookOpen,    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'     },
          { href: '/risks',    label: 'Log Risk',        icon: AlertTriangle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20' },
          { href: '/audit',    label: 'Upload Evidence', icon: ClipboardList, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20' },
          { href: '/ai-tools', label: 'AI Assistant',   icon: Zap,         color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20' },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-all cursor-pointer card-hover">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', action.color)}>
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
