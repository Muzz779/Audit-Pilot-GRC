import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { status, likelihood, impact, mitigation_plan, title, description, category, owner_id } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined)           update.status = status;
  if (likelihood !== undefined)       update.likelihood = likelihood;
  if (impact !== undefined)           update.impact = impact;
  if (mitigation_plan !== undefined)  update.mitigation_plan = mitigation_plan;
  if (title !== undefined)            update.title = title;
  if (description !== undefined)      update.description = description;
  if (category !== undefined)         update.category = category;
  if (owner_id !== undefined)         update.owner_id = owner_id;

  const { data, error } = await supabase
    .from('risks')
    .update(update)
    .eq('id', id)
    .select('*, owner:profiles!risks_owner_id_fkey(id, full_name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: data.organisation_id,
    user_id: user.id,
    action: `updated risk${status ? ` — status: ${status}` : ''}`,
    resource_type: 'risk',
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

  const { data: profile } = await supabase.from('profiles').select('role, organisation_id').eq('id', user.id).single();
  if (!['owner', 'admin'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Fetch risk name for audit log before deleting
  const { data: risk } = await supabase.from('risks').select('title, organisation_id').eq('id', id).single();

  const { error } = await supabase.from('risks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: risk?.organisation_id || profile?.organisation_id,
    user_id: user.id,
    action: 'deleted risk',
    resource_type: 'risk',
    resource_name: risk?.title,
  });

  return NextResponse.json({ success: true });
}
