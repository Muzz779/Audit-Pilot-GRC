import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/app-url';

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

  const invitedRole = role || 'member';
  if (!['admin', 'member', 'auditor'].includes(invitedRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const orgName = (profile as any).organisations?.name || 'your organisation';

  // Use service role client — admin.inviteUserByEmail requires service role
  const adminClient = await createServiceRoleClient();

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: {
        full_name: full_name?.trim() || '',
        invited_by: user.id,
      },
      redirectTo: `${getAppUrl(req)}/register?invited=true`,
    }
  );

  if (inviteError) {
    if (inviteError.message?.includes('already been registered')) {
      return NextResponse.json({
        error: 'This email address is already registered. Ask them to log in — you can then update their role from the team page.',
      }, { status: 400 });
    }
    console.error('Invite error:', inviteError);
    return NextResponse.json({ error: 'The invitation could not be sent. Please check the email address and try again.' }, { status: 500 });
  }

  // Joining happens here on the server, because the browser can't be trusted
  // to say which organisation an account belongs to. The signup trigger has
  // already created the profile row. Only an account with no organisation yet
  // can be linked, so an invite can never pull someone out of another company.
  const { data: linked, error: linkError } = await adminClient
    .from('profiles')
    .update({
      organisation_id: profile.organisation_id,
      role: invitedRole,
      onboarding_completed: true,
    })
    .eq('id', invited.user.id)
    .is('organisation_id', null)
    .select('id');

  if (!linkError && (!linked || linked.length === 0)) {
    return NextResponse.json({
      error: 'This person already belongs to an organisation, so they could not be added to yours.',
    }, { status: 400 });
  }

  if (linkError) {
    console.error('Invite link error:', linkError);
    return NextResponse.json({ error: 'The invitation was sent but the account could not be linked. Please contact support.' }, { status: 500 });
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
