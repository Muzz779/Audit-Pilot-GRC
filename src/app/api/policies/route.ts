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
    .from('policies')
    .select('*, owner:profiles!policies_owner_id_fkey(id, full_name, email)')
    .eq('organisation_id', profile.organisation_id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { title, description, category, content, owner_id } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { data: policy, error } = await supabase
    .from('policies')
    .insert({
      organisation_id: profile.organisation_id,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || null,
      owner_id: owner_id || user.id,
      status: 'draft',
      current_version: 1,
    })
    .select('*, owner:profiles!policies_owner_id_fkey(id, full_name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Save first version if content provided
  if (content?.trim()) {
    await supabase.from('policy_versions').insert({
      policy_id: policy.id,
      organisation_id: profile.organisation_id,
      version_number: 1,
      content: content.trim(),
      change_summary: 'Initial version',
      created_by: user.id,
    });
  }

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: 'created policy',
    resource_type: 'policy',
    resource_id: policy.id,
    resource_name: policy.title,
  });

  return NextResponse.json({ data: policy }, { status: 201 });
}
