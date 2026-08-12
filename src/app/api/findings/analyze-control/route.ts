import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeControl } from '@/lib/findings/engine';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  }
  if (!['owner', 'admin', 'member'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body: any = await req.json();
  const { control_id } = body;

  if (!control_id) {
    return NextResponse.json({ error: 'control_id is required' }, { status: 400 });
  }

  // Fetch the control — must belong to the user's org
  const { data: control, error: controlError } = await supabase
    .from('controls')
    .select('*')
    .eq('id', control_id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (controlError || !control) {
    return NextResponse.json({ error: 'Control not found' }, { status: 404 });
  }

  try {
    // ── Run the findings engine ────────────────────────────────────
    const result = await analyzeControl(supabase, profile.organisation_id, {
      id: control.id,
      control_id: control.control_id || control.id,
      name: control.name,
      description: control.description || '',
      category: control.category || 'General',
      framework_id: control.framework_id,
    });

    // ── Save as a DRAFT finding (pending review) ───────────────────
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

    if (findingError) {
      throw new Error(`Failed to save finding: ${findingError.message}`);
    }

    // ── Log to finding history ─────────────────────────────────────
    await supabase.from('finding_history').insert({
      finding_id: finding.id,
      organisation_id: profile.organisation_id,
      action: 'generated',
      new_status: 'draft_pending_review',
      actor_id: user.id,
    });

    await supabase.from('audit_logs').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      action: `generated finding for control: ${control.name} (${result.determination})`,
      resource_type: 'finding',
      resource_id: finding.id,
      resource_name: result.title,
    });

    return NextResponse.json({ data: finding });

  } catch (err: any) {
    console.error('Finding generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze control' },
      { status: 500 }
    );
  }
}
