import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://auditpilot.co.za';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.9 },
    { url: `${base}/popia`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ];
}
