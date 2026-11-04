import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Deletes one evidence document: the stored file, then the record. Its search
// chunks and analysis row go with the record through ON DELETE CASCADE.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  }
  if (!['owner', 'admin', 'member'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Scoped to the user's org. The service-role client below bypasses RLS, so
  // this lookup is what stops one organisation deleting another's evidence.
  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence')
    .select('id, name, file_url')
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (evidenceError || !evidence) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  const serviceClient = await createServiceRoleClient();

  // File first: if this fails the record survives, so the user can retry
  // rather than leaving an orphaned file nothing points to.
  if (evidence.file_url) {
    const storagePath = evidence.file_url.includes('/evidence/')
      ? evidence.file_url.split('/evidence/')[1]
      : evidence.file_url;

    const { error: storageError } = await serviceClient.storage.from('evidence').remove([storagePath]);
    if (storageError) {
      return NextResponse.json(
        { error: `The stored file could not be deleted: ${storageError.message}` },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await serviceClient
    .from('evidence')
    .delete()
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `deleted evidence: ${evidence.name}`,
    resource_type: 'evidence',
    resource_id: id,
    resource_name: evidence.name,
  });

  return NextResponse.json({ success: true });
}
