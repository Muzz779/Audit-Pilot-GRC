import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { data, error } = await supabase
    .from('risks')
    .select('*, owner:profiles!risks_owner_id_fkey(id, full_name, email)')
    .eq('organisation_id', profile.organisation_id)
    .order('risk_score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { title, description, category, likelihood, impact, mitigation_plan, owner_id } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const { data: profile } = await supabase.from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { data, error } = await supabase
    .from('risks')
    .insert({
      organisation_id: profile.organisation_id,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || null,
      likelihood: likelihood || 'possible',
      impact: impact || 'moderate',
      mitigation_plan: mitigation_plan?.trim() || null,
      owner_id: owner_id || user.id,
      status: 'identified',
    })
    .select('*, owner:profiles!risks_owner_id_fkey(id, full_name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: 'added risk to register',
    resource_type: 'risk',
    resource_id: data.id,
    resource_name: data.title,
  });

  return NextResponse.json({ data }, { status: 201 });
}
