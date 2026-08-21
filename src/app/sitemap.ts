import type { MetadataRoute } from 'next';
import { getAllConcepts } from '@/lib/content';

export const dynamic = 'force-static';

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const concepts = getAllConcepts();

  const staticRoutes = [
    '',
    '/roadmap',
    '/concepts',
    '/practice',
    '/review',
    '/labs',
    '/progress',
    '/glossary',
    '/resources',
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE}${route}`,
      changeFrequency:
        route === '/concepts' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : 0.7,
    })),

    ...concepts.map((concept) => ({
      url: `${SITE}/concepts/${concept.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
      lastModified: new Date(),
    })),
  ];
}