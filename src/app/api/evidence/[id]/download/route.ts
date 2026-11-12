import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveEvidencePath } from '@/lib/evidence/storage-path';

// GET — issue a short-lived signed URL for an evidence file and redirect to it.
// The private `evidence` bucket is never exposed via public URLs (see CLAUDE.md gotcha).
// Access is authorised with the caller's session (RLS-scoped to their org); the signed
// URL is then minted with the service-role client.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  // Fetch via the session client so RLS confirms the evidence belongs to the caller's org.
  const { data: evidence } = await supabase
    .from('evidence')
    .select('file_url')
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (!evidence?.file_url) {
    return NextResponse.json({ error: 'Evidence file not found' }, { status: 404 });
  }

  // Only files inside the caller's own organisation folder can be signed.
  const storagePath = resolveEvidencePath(evidence.file_url, profile.organisation_id);
  if (!storagePath) {
    return NextResponse.json({ error: 'Evidence file not found' }, { status: 404 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: signed, error } = await serviceClient.storage
    .from('evidence')
    .createSignedUrl(storagePath, 60); // 60-second TTL — just long enough to open

  if (error || !signed?.signedUrl) {
    console.error('Signed URL failed:', error?.message);
    return NextResponse.json({ error: 'Could not generate a download link. Please try again.' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
