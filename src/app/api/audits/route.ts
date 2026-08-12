import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { data, error } = await supabase
    .from('audits')
    .select('*, framework:compliance_frameworks(id, name, short_name, icon)')
    .eq('organisation_id', profile.organisation_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { title, description, framework_id, start_date, end_date, status, lead_id } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('audits')
    .insert({
      organisation_id: profile.organisation_id,
      title: title.trim(),
      description: description?.trim() || null,
      framework_id: (framework_id && framework_id !== 'none') ? framework_id : null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'planned',
      lead_id: lead_id || user.id,
      auditor_id: user.id,
    })
    .select('*, framework:compliance_frameworks(id, name, short_name, icon)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: 'created audit',
    resource_type: 'audit',
    resource_id: data.id,
    resource_name: data.title,
  });

  return NextResponse.json({ data }, { status: 201 });
}
