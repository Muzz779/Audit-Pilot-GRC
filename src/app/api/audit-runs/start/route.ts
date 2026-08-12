import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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
  const { framework_id } = body;
  if (!framework_id) return NextResponse.json({ error: 'framework_id is required' }, { status: 400 });

  // Get all controls for this framework
  const { data: controls, error: controlsError } = await supabase
    .from('controls')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .eq('framework_id', framework_id)
    .order('control_id');

  if (controlsError) return NextResponse.json({ error: controlsError.message }, { status: 500 });
  if (!controls || controls.length === 0) {
    return NextResponse.json({ error: 'No controls found for this framework. Add the framework in Compliance first.' }, { status: 400 });
  }

  // Find controls that ALREADY have a finding — we skip these so we don't
  // wipe drafts a human may have already reviewed.
  const { data: existingFindings } = await supabase
    .from('findings')
    .select('control_id')
    .eq('organisation_id', profile.organisation_id)
    .eq('framework_id', framework_id);

  const controlsWithFindings = new Set((existingFindings || []).map((f: any) => f.control_id));

  const pendingControlIds = controls
    .map((c: any) => c.id)
    .filter((id: string) => !controlsWithFindings.has(id));

  const skippedCount = controls.length - pendingControlIds.length;

  // If everything is already analyzed, nothing to do
  if (pendingControlIds.length === 0) {
    return NextResponse.json({
      error: `All ${controls.length} controls already have findings. Re-analyze individual controls if you want to regenerate them.`,
      all_analyzed: true,
    }, { status: 400 });
  }

  // Check there's actually evidence to analyze against
  const { count: analyzedDocsCount } = await supabase
    .from('document_analysis')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', profile.organisation_id)
    .eq('status', 'completed');

  if ((analyzedDocsCount || 0) === 0) {
    return NextResponse.json({
      error: 'No analyzed documents found. Upload and analyze evidence in Audit & Evidence before running a full audit.',
    }, { status: 400 });
  }

  // Create the run record with the work queue
  const { data: run, error: runError } = await supabase
    .from('audit_runs')
    .insert({
      organisation_id: profile.organisation_id,
      framework_id,
      status: 'in_progress',
      total_controls: controls.length,
      processed_controls: 0,
      skipped_controls: skippedCount,
      pending_control_ids: pendingControlIds,
      started_by: user.id,
    })
    .select()
    .single();

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `started full audit run (${pendingControlIds.length} controls to analyze, ${skippedCount} skipped)`,
    resource_type: 'audit_run',
    resource_id: run.id,
  });

  return NextResponse.json({
    run_id: run.id,
    total_controls: controls.length,
    to_process: pendingControlIds.length,
    skipped: skippedCount,
  });
}
