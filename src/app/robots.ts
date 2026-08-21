import type { MetadataRoute } from 'next';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://YOUR-PROJECT.pages.dev';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${SITE}/sitemap.xml` };
}
