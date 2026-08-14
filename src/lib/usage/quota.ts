import { createServiceRoleClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────────────────────────────────────
// AI operation quota (Phase 6 cost guard).
//
// The free ("starter") tier is capped at a monthly number of AI operations so a
// user can't accidentally run huge audits and rack up Claude/Voyage bills.
// Pro and Enterprise are unlimited. Usage is metered via the `ai_interactions`
// table (one row per AI operation, org-scoped), counted with the service-role
// client so the count is accurate across every user in the org.
//
// The cap is env-configurable (STARTER_AI_MONTHLY_CAP) so you can tune it to your
// real pricing without a code change.
// ────────────────────────────────────────────────────────────────────────────

export const STARTER_AI_MONTHLY_CAP = Number(process.env.STARTER_AI_MONTHLY_CAP) || 100;

export type QuotaResult = {
  allowed: boolean;
  used: number;
  cap: number | null; // null = unlimited (pro/enterprise)
  tier: string;
};

function startOfMonthUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Is the org allowed to run another AI operation this month?
export async function checkAiQuota(organisationId: string): Promise<QuotaResult> {
  const svc = await createServiceRoleClient();

  const { data: sub } = await svc
    .from('subscriptions')
    .select('tier')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  const tier = (sub?.tier as string) || 'starter';

  // Paid tiers are unlimited.
  if (tier === 'pro' || tier === 'enterprise') {
    return { allowed: true, used: 0, cap: null, tier };
  }

  const { count } = await svc
    .from('ai_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .gte('created_at', startOfMonthUTC());

  const used = count || 0;
  return { allowed: used < STARTER_AI_MONTHLY_CAP, used, cap: STARTER_AI_MONTHLY_CAP, tier };
}

// Human-readable 429 payload for a route to return when the cap is hit.
export function quotaExceededResponse(quota: QuotaResult) {
  return {
    error: `Monthly AI limit reached (${quota.used}/${quota.cap} operations on the ${quota.tier} plan). Upgrade to Pro for unlimited AI analysis, or wait until next month.`,
    quota_exceeded: true,
    used: quota.used,
    cap: quota.cap,
  };
}

// Record one AI operation against the org's monthly usage.
// Uses the service-role client so batch/server contexts log reliably.
export async function logAiUsage(
  organisationId: string,
  userId: string | null,
  feature: string
): Promise<void> {
  const svc = await createServiceRoleClient();
  await svc.from('ai_interactions').insert({
    organisation_id: organisationId,
    user_id: userId,
    feature,
  });
}
