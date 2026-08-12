import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  // Fetch current finding to record previous status
  const { data: current } = await supabase
    .from('findings')
    .select('status')
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

  return NextResponse.json({ data });
}
