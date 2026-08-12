import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('policies')
    .select('*, owner:profiles!policies_owner_id_fkey(id, full_name, email), versions:policy_versions(*)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { status, title, description, category, content, change_summary } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined)      update.status = status;
  if (title !== undefined)       update.title = title;
  if (description !== undefined) update.description = description;
  if (category !== undefined)    update.category = category;

  if (status === 'approved') {
    update.approved_by = user.id;
    update.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('policies')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If content provided, create a new version
  if (content?.trim()) {
    const newVersion = (data.current_version || 1) + 1;
    await supabase.from('policy_versions').insert({
      policy_id: data.id,
      organisation_id: data.organisation_id,
      version_number: newVersion,
      content: content.trim(),
      change_summary: change_summary || `Version ${newVersion}`,
      created_by: user.id,
    });
    await supabase
      .from('policies')
      .update({ current_version: newVersion })
      .eq('id', id);
  }

  await supabase.from('audit_logs').insert({
    organisation_id: data.organisation_id,
    user_id: user.id,
    action: `updated policy${status ? ` — ${status}` : ''}`,
    resource_type: 'policy',
    resource_id: data.id,
    resource_name: data.title,
  });

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id, role').eq('id', user.id).single();
  if (!['owner', 'admin'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get policy name for audit log
  const { data: policy } = await supabase
    .from('policies').select('title, organisation_id').eq('id', id).single();

  const { error } = await supabase.from('policies').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: policy?.organisation_id || profile?.organisation_id,
    user_id: user.id,
    action: 'deleted policy',
    resource_type: 'policy',
    resource_name: policy?.title,
  });

  return NextResponse.json({ success: true });
}
