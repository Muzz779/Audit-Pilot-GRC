import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeControl } from '@/lib/findings/engine';

export const maxDuration = 60; // one control comfortably fits in 60s

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { run_id, cancel } = body;
  if (!run_id) return NextResponse.json({ error: 'run_id is required' }, { status: 400 });

  // Load the run
  const { data: run, error: runError } = await supabase
    .from('audit_runs')
    .select('*')
    .eq('id', run_id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (runError || !run) return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });

  // Explicit cancel request from the frontend
  if (cancel) {
    const { data: updated } = await supabase
      .from('audit_runs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', run_id)
      .select()
      .single();
    return NextResponse.json({ done: true, cancelled: true, run: updated });
  }

  if (run.status === 'cancelled') {
    return NextResponse.json({ done: true, cancelled: true, run });
  }

  const pending: string[] = run.pending_control_ids || [];

  // Queue empty → mark complete
  if (pending.length === 0) {
    const { data: updated } = await supabase
      .from('audit_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', run_id)
      .select()
      .single();
    return NextResponse.json({ done: true, run: updated });
  }

  // Take the next control off the queue
  const controlId = pending[0];
  const remaining = pending.slice(1);

  // Load the control
  const { data: control } = await supabase
    .from('controls')
    .select('*')
    .eq('id', controlId)
    .eq('organisation_id', profile.organisation_id)
    .single();

  // If control vanished, skip it and continue
  if (!control) {
    const { data: updated } = await supabase
      .from('audit_runs')
      .update({
        pending_control_ids: remaining,
        failed_controls: run.failed_controls + 1,
      })
      .eq('id', run_id)
      .select()
      .single();
    return NextResponse.json({ done: false, run: updated, last_control: 'skipped (not found)' });
  }

  try {
    // Run the validated per-control engine
    const result = await analyzeControl(supabase, profile.organisation_id, {
      id: control.id,
      control_id: control.control_id || control.id,
      name: control.name,
      description: control.description || '',
      category: control.category || 'General',
      framework_id: control.framework_id,
    });

    // Save the finding (draft, pending review) — this is the partial-save point
    const { data: finding, error: findingError } = await supabase
      .from('findings')
      .insert({
        organisation_id: profile.organisation_id,
        control_id: control.id,
        framework_id: control.framework_id,
        determination: result.determination,
        confidence: result.confidence,
        severity: result.severity,
        status: 'draft_pending_review',
        title: result.title,
        summary: result.summary,
        reasoning: result.reasoning,
        recommendation: result.recommendation,
        evidence_chunk_ids: result.evidence_chunk_ids,
        regulation_chunk_ids: result.regulation_chunk_ids,
        evidence_summary: result.evidence_summary,
        used_unverified_regulation: result.used_unverified_regulation,
        generated_by: user.id,
      })
      .select()
      .single();

    if (findingError) throw new Error(findingError.message);

    await supabase.from('finding_history').insert({
      finding_id: finding.id,
      organisation_id: profile.organisation_id,
      action: 'generated',
      new_status: 'draft_pending_review',
      actor_id: user.id,
    });

    // Update run counters + advance the queue (commit before returning = partial-save)
    const determinationCounter =
      result.determination === 'satisfied' ? { satisfied_count: run.satisfied_count + 1 } :
      result.determination === 'partial'   ? { partial_count: run.partial_count + 1 } :
      result.determination === 'gap'       ? { gap_count: run.gap_count + 1 } : {};

    const { data: updated } = await supabase
      .from('audit_runs')
      .update({
        pending_control_ids: remaining,
        processed_controls: run.processed_controls + 1,
        ...determinationCounter,
      })
      .eq('id', run_id)
      .select()
      .single();

    return NextResponse.json({
      done: false,
      run: updated,
      last_control: control.name,
      last_determination: result.determination,
    });

  } catch (err: any) {
    // A single control failed — record it, advance the queue, keep going.
    // The batch does NOT die because of one control.
    console.error(`Audit run ${run_id}: control ${controlId} failed:`, err.message);

    const { data: updated } = await supabase
      .from('audit_runs')
      .update({
        pending_control_ids: remaining,
        failed_controls: run.failed_controls + 1,
      })
      .eq('id', run_id)
      .select()
      .single();

    return NextResponse.json({
      done: false,
      run: updated,
      last_control: control.name,
      last_error: err.message,
    });
  }
}
