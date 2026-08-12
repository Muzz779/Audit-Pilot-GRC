import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role, organisations(name)')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only owners and admins can invite team members' }, { status: 403 });
  }

  const body: any = await req.json();
  const { email, role, full_name } = body;
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const orgName = (profile as any).organisations?.name || 'your organisation';

  // Use service role client — admin.inviteUserByEmail requires service role
  const adminClient = await createServiceRoleClient();

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: {
        full_name: full_name?.trim() || '',
        organisation_id: profile.organisation_id,
        invited_role: role || 'member',
        invited_by: user.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register?invited=true&org=${profile.organisation_id}`,
    }
  );

  if (inviteError) {
    if (inviteError.message?.includes('already been registered')) {
      return NextResponse.json({
        error: 'This email address is already registered. Ask them to log in — you can then update their role from the team page.',
      }, { status: 400 });
    }
    console.error('Invite error:', inviteError);
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `invited team member: ${email}`,
    resource_type: 'profile',
    resource_name: email,
  });

  return NextResponse.json({
    success: true,
    message: `Invitation email sent to ${email}. They will receive a link to join ${orgName}.`,
  });
}
