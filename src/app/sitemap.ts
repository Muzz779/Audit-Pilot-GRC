import { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/app-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.9 },
    { url: `${base}/security`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/popia`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
