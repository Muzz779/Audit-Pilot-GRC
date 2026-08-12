import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { status, implementation_notes, assigned_to, due_date } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined)               update.status = status;
  if (implementation_notes !== undefined) update.implementation_notes = implementation_notes;
  if (assigned_to !== undefined)          update.assigned_to = assigned_to;
  if (due_date !== undefined)             update.due_date = due_date;
  if (status === 'implemented')           update.last_reviewed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('controls')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate compliance score for this framework
  if (status && data.framework_id) {
    const { data: allControls } = await supabase
      .from('controls')
      .select('status')
      .eq('organisation_id', profile.organisation_id)
      .eq('framework_id', data.framework_id);

    if (allControls) {
      const applicable = allControls.filter(c => c.status !== 'not_applicable');
      const implemented = applicable.filter(c => c.status === 'implemented').length;
      const score = applicable.length > 0
        ? Math.round((implemented / applicable.length) * 100)
        : 0;

      await supabase
        .from('organisation_frameworks')
        .update({ compliance_score: score })
        .eq('organisation_id', profile.organisation_id)
        .eq('framework_id', data.framework_id);
    }
  }

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `updated control status to ${status}`,
    resource_type: 'control',
    resource_id: data.id,
    resource_name: data.name,
  });

  return NextResponse.json({ data });
}
