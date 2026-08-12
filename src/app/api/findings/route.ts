import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { recalcFrameworkScore } from '@/lib/compliance/score';

// Phase 4: an ACCEPTED finding's determination maps to a control status.
// Anything not in this map (e.g. 'not_assessed') leaves the control untouched.
// Note: control_status enum has no 'gap' — gaps map to 'not_started', and the
// Compliance page shows a "from audit" tag so this isn't confused with a control
// that was simply never started.
const DETERMINATION_TO_CONTROL_STATUS: Record<string, string> = {
  satisfied: 'implemented',
  partial: 'in_progress',
  gap: 'not_started',
};

// GET — list findings for the org, optionally filtered
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const frameworkId = searchParams.get('framework_id');

  let query = supabase
    .from('findings')
    .select('*, control:controls(id, control_id, name, category), framework:compliance_frameworks(id, short_name, name)')
    .eq('organisation_id', profile.organisation_id)
    .order('generated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (frameworkId) query = query.eq('framework_id', frameworkId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PATCH — accept or dismiss a finding
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin', 'member'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body: any = await req.json();
  const { finding_id, action, review_note } = body;

  if (!finding_id || !['accept', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'finding_id and a valid action (accept/dismiss) are required' }, { status: 400 });
  }

  // Fetch current finding — need previous status for history, plus the control link
  // and determination so an accept can drive the control status (Phase 4).
  const { data: current } = await supabase
    .from('findings')
    .select('status, control_id, framework_id, determination')
    .eq('id', finding_id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (!current) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

  const newStatus = action === 'accept' ? 'accepted' : 'dismissed';

  const { data, error } = await supabase
    .from('findings')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: review_note || null,
    })
    .eq('id', finding_id)
    .eq('organisation_id', profile.organisation_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Phase 4: closing the loop ────────────────────────────────────────────────
  // Only an ACCEPT drives control state; dismiss never does. The determination maps
  // to a control status, and the framework score is recomputed from scratch (idempotent —
  // re-accepting the same finding cannot double-count). If two accepted findings target
  // the same control, the most recently accepted one wins. A control-update failure must
  // not corrupt the score, so we only recalc when the control update actually succeeded.
  let controlStatusApplied: string | null = null;
  if (action === 'accept' && current.control_id) {
    const mappedStatus = DETERMINATION_TO_CONTROL_STATUS[current.determination];
    if (mappedStatus) {
      const controlUpdate: Record<string, unknown> = { status: mappedStatus };
      if (mappedStatus === 'implemented') controlUpdate.last_reviewed_at = new Date().toISOString();

      const { error: controlError } = await supabase
        .from('controls')
        .update(controlUpdate)
        .eq('id', current.control_id)
        .eq('organisation_id', profile.organisation_id);

      if (!controlError) {
        controlStatusApplied = mappedStatus;
        if (current.framework_id) {
          await recalcFrameworkScore(supabase, profile.organisation_id, current.framework_id);
        }
      }
    }
  }

  // Log to history
  await supabase.from('finding_history').insert({
    finding_id,
    organisation_id: profile.organisation_id,
    action: action === 'accept' ? 'accepted' : 'dismissed',
    previous_status: current.status,
    new_status: newStatus,
    note: review_note || null,
    actor_id: user.id,
  });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `${action}ed finding`,
    resource_type: 'finding',
    resource_id: finding_id,
  });

  return NextResponse.json({ data, control_status_applied: controlStatusApplied });
}
