import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only owners and admins can change roles' }, { status: 403 });
  }

  const body: any = await req.json();
  const { member_id, role } = body;

  if (!member_id || !role) return NextResponse.json({ error: 'member_id and role are required' }, { status: 400 });

  const validRoles = ['admin', 'member', 'auditor'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
  }

  // Cannot change your own role
  if (member_id === user.id) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }

  // Confirm target user is in same org
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, role, organisation_id, email')
    .eq('id', member_id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (!targetProfile) return NextResponse.json({ error: 'Member not found in your organisation' }, { status: 404 });
  if (targetProfile.role === 'owner') return NextResponse.json({ error: 'Cannot change the owner role' }, { status: 403 });

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', member_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `changed role for ${targetProfile.email} to ${role}`,
    resource_type: 'profile',
    resource_id: member_id,
    resource_name: targetProfile.email,
  });

  return NextResponse.json({ data, message: `Role updated to ${role}` });
}
