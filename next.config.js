// Env vars come from .env.local (local dev) and Vercel env vars (production).
// Never hardcode secrets here — this file is committed to git.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint config references @typescript-eslint rules that next/core-web-vitals doesn't
  // load; lint is not the deploy gate (type-checking still runs). Keep builds green.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['@anthropic-ai/sdk'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Security headers on every page and API route.
  // No CORS headers: the API is only called by this site itself (same origin),
  // and PayFast's webhook is server-to-server, which CORS doesn't affect.
  // The CSP is deliberately narrow (framing, <base>, plugins) so it can't break
  // Next.js scripts, Supabase calls or the PayFast checkout form.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
