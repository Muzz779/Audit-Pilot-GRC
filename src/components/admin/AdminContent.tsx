'use client';

import React from 'react';
import { Building2, TrendingUp, Bot, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/index';
import { formatDate, formatZAR, getStatusColor, cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface AdminContentProps {
  organisations: any[];
  orgCount: number;
  tierCounts: { starter: number; pro: number; enterprise: number };
  mrr: number;
  recentSignups: any[];
  aiUsage: any[];
}

export function AdminContent({
  organisations,
  orgCount,
  tierCounts,
  mrr,
  recentSignups,
  aiUsage,
}: AdminContentProps) {
  // Build AI feature usage chart data
  const aiFeatureCounts = aiUsage.reduce((acc: Record<string, number>, i: any) => {
    acc[i.feature] = (acc[i.feature] || 0) + 1;
    return acc;
  }, {});

  const aiChartData = Object.entries(aiFeatureCounts).map(([feature, count]) => ({
    feature: feature.replace(/_/g, ' '),
    count,
  }));

  const totalSubs = tierCounts.starter + tierCounts.pro + tierCounts.enterprise || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Admin warning banner */}
      <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 flex items-center gap-2">
        <span>⚠️</span>
        <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
          Platform Admin Mode — You have elevated access to all organisations. All actions are logged.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Organisations',
            value: orgCount,
            icon: Building2,
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
          },
          {
            label: 'Monthly Recurring Revenue',
            value: formatZAR(mrr * 100),
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20',
          },
          {
            label: 'Pro Subscribers',
            value: tierCounts.pro,
            icon: CreditCard,
            color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
          },
          {
            label: 'AI Interactions',
            value: aiUsage.length,
            icon: Bot,
            color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
          },
        ].map(s => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.color)}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan breakdown + AI usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { tier: 'Starter (Free)', count: tierCounts.starter, color: 'bg-gray-400', pct: Math.round((tierCounts.starter / totalSubs) * 100) },
              { tier: 'Pro (R799/mo)',   count: tierCounts.pro,     color: 'bg-brand-500', pct: Math.round((tierCounts.pro / totalSubs) * 100) },
              { tier: 'Enterprise',      count: tierCounts.enterprise, color: 'bg-purple-500', pct: Math.round((tierCounts.enterprise / totalSubs) * 100) },
            ].map(t => (
              <div key={t.tier}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">{t.tier}</span>
                  <span className="text-muted-foreground">{t.count} org{t.count !== 1 ? 's' : ''} ({t.pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', t.color)}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI feature usage chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">AI Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {aiChartData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No AI interactions yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={aiChartData} margin={{ left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="feature" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All organisations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            All Organisations{' '}
            <span className="text-muted-foreground font-normal">({orgCount})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {organisations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No organisations yet</p>
            )}
            {organisations.map((org: any) => {
              const sub = Array.isArray(org.subscription)
                ? org.subscription[0]
                : org.subscription;

              return (
                <div key={org.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {org.name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[org.industry, org.size, formatDate(org.created_at)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sub && (
                      <>
                        <Badge
                          variant={
                            sub.tier === 'pro' ? 'info' :
                            sub.tier === 'enterprise' ? 'purple' :
                            'secondary'
                          }
                          className="text-[10px] capitalize"
                        >
                          {sub.tier}
                        </Badge>
                        <Badge
                          variant={sub.status === 'active' ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {sub.status}
                        </Badge>
                      </>
                    )}
                    {!sub && (
                      <Badge variant="secondary" className="text-[10px]">starter</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent signups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentSignups.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No signups yet</p>
            )}
            {recentSignups.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.full_name || 'Unnamed User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{formatDate(u.created_at)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
