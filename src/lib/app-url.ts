// The site's public address, for links in emails, PayFast return and
// notification addresses, the sitemap and social previews.
//
// NEXT_PUBLIC_APP_URL was set to a localhost address on the live site, which
// sent PayFast notifications and invitation links nowhere. A local address is
// therefore ignored on Vercel, in favour of the site's real address.

const FALLBACK = 'https://audit-pilot-grc.vercel.app';
const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(url);

export function getAppUrl(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  const onVercel = Boolean(process.env.VERCEL);

  if (configured && !(onVercel && isLocal(configured))) return configured;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (onVercel && production) return `https://${production}`;
  if (req) return new URL(req.url).origin;
  return onVercel ? FALLBACK : configured || 'http://localhost:3000';
}
