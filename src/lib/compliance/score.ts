// Shared framework compliance-score recalculation.
//
// Score = implemented / applicable controls, where "applicable" excludes
// not_applicable controls. This mirrors the original inline logic that lived in
// src/app/api/compliance/controls/[id]/route.ts so the manual-status path and the
// accepted-finding path (Phase 4) can never diverge.
//
// The score is recomputed from scratch on every call, so it is idempotent — calling
// it repeatedly (e.g. after re-accepting the same finding) produces the same result
// and cannot double-count.
export async function recalcFrameworkScore(
  supabase: any,
  organisationId: string,
  frameworkId: string
): Promise<number | null> {
  const { data: allControls } = await supabase
    .from('controls')
    .select('status')
    .eq('organisation_id', organisationId)
    .eq('framework_id', frameworkId);

  if (!allControls) return null;

  const applicable = allControls.filter((c: any) => c.status !== 'not_applicable');
  const implemented = applicable.filter((c: any) => c.status === 'implemented').length;
  const score = applicable.length > 0
    ? Math.round((implemented / applicable.length) * 100)
    : 0;

  await supabase
    .from('organisation_frameworks')
    .update({ compliance_score: score })
    .eq('organisation_id', organisationId)
    .eq('framework_id', frameworkId);

  return score;
}
