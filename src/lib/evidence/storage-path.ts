// Turns an evidence row's file_url into a storage path the caller's organisation
// owns, or null. Every route that touches the private `evidence` bucket with the
// service-role client (which ignores RLS) must go through this, because file_url
// is written by the browser: without the prefix check, a member could point
// their own row at another organisation's file and download, analyse or delete it.
export function resolveEvidencePath(fileUrl: string | null | undefined, organisationId: string): string | null {
  if (!fileUrl || !organisationId) return null;

  // file_url stores the storage PATH; older rows stored a public URL that
  // embeds the path after "/evidence/". Handle both.
  const raw = fileUrl.includes('/evidence/') ? fileUrl.split('/evidence/')[1] : fileUrl;
  let path: string;
  try {
    path = decodeURIComponent(raw.split('?')[0]);
  } catch {
    return null;
  }

  if (!path.startsWith(`${organisationId}/`)) return null;
  if (path.includes('..') || path.includes('\\') || path.includes('//')) return null;
  return path;
}
