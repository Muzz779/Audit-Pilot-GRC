import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { policy_id, version_number, organisation_id } = body;

  if (!policy_id || !version_number) {
    return NextResponse.json({ error: 'policy_id and version_number are required' }, { status: 400 });
  }

  // Check if already acknowledged this version
  const { data: existing } = await supabase
    .from('policy_acknowledgements')
    .select('id')
    .eq('policy_id', policy_id)
    .eq('user_id', user.id)
    .eq('version_number', version_number)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You have already acknowledged this version of the policy' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('policy_acknowledgements')
    .insert({
      policy_id,
      organisation_id: profile.organisation_id,
      user_id: user.id,
      version_number,
      acknowledged_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: 'acknowledged policy',
    resource_type: 'policy',
    resource_id: policy_id,
  });

  return NextResponse.json({ data, message: 'Policy acknowledged successfully' }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const policyId = searchParams.get('policy_id');

  let query = supabase
    .from('policy_acknowledgements')
    .select('*, user:profiles(id, full_name, email)')
    .eq('organisation_id', profile.organisation_id)
    .order('acknowledged_at', { ascending: false });

  if (policyId) query = query.eq('policy_id', policyId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
