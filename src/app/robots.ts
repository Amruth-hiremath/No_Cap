import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Public educational content is fully crawlable.
      { userAgent: '*', allow: '/', disallow: ['/account', '/settings', '/api', '/auth'] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}