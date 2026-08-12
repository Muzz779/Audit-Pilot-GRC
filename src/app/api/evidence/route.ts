import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const controlId = searchParams.get('control_id');

  let query = supabase
    .from('evidence')
    .select('*')
    .eq('organisation_id', profile.organisation_id)
    .order('created_at', { ascending: false });

  if (controlId) query = query.eq('control_id', controlId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { name, description, control_id, file_url, file_name, file_size, file_type, tags } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Status is 'uploaded' if we have a file_url, otherwise 'pending'
  const status = file_url ? 'uploaded' : 'pending';

  const { data, error } = await supabase
    .from('evidence')
    .insert({
      organisation_id: profile.organisation_id,
      name: name.trim(),
      description: description?.trim() || null,
      control_id: control_id || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_type: file_type || null,
      status,
      collected_by: user.id,
      tags: tags || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `uploaded evidence: ${name}`,
    resource_type: 'evidence',
    resource_id: data.id,
    resource_name: data.name,
  });

  return NextResponse.json({ data }, { status: 201 });
}
