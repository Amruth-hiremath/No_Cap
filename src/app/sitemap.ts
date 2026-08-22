import type { MetadataRoute } from 'next';
import { getAllConcepts } from '@/lib/content';

export const dynamic = 'force-static';

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const concepts = getAllConcepts();
  const now = new Date();

  // All top-level routes that should be crawlable. Includes lab pages and
  // library sub-pages so they are not orphaned from the index.
  const staticRoutes: { path: string; freq: 'weekly' | 'monthly'; priority: number }[] = [
    { path: '',                 freq: 'weekly',  priority: 1.0 },
    { path: '/roadmap',        freq: 'monthly', priority: 0.7 },
    { path: '/concepts',       freq: 'weekly',  priority: 0.9 },
    { path: '/practice',       freq: 'weekly',  priority: 0.7 },
    { path: '/review',         freq: 'weekly',  priority: 0.6 },
    { path: '/daily',          freq: 'weekly',  priority: 0.6 },
    { path: '/labs',           freq: 'monthly', priority: 0.7 },
    { path: '/labs/caching',          freq: 'monthly', priority: 0.5 },
    { path: '/labs/capacity',         freq: 'monthly', priority: 0.5 },
    { path: '/labs/cdn',              freq: 'monthly', priority: 0.5 },
    { path: '/labs/circuit-breaker',  freq: 'monthly', priority: 0.5 },
    { path: '/labs/consistent-hashing', freq: 'monthly', priority: 0.5 },
    { path: '/labs/load-balancer',    freq: 'monthly', priority: 0.5 },
    { path: '/labs/message-queue',    freq: 'monthly', priority: 0.5 },
    { path: '/labs/rate-limiter',     freq: 'monthly', priority: 0.5 },
    { path: '/labs/replication',      freq: 'monthly', priority: 0.5 },
    { path: '/labs/sharding',         freq: 'monthly', priority: 0.5 },
    { path: '/progress',      freq: 'monthly', priority: 0.4 },
    { path: '/library',       freq: 'monthly', priority: 0.5 },
    { path: '/library/notes',      freq: 'monthly', priority: 0.4 },
    { path: '/library/notes/new',  freq: 'monthly', priority: 0.3 },
    { path: '/library/highlights',  freq: 'monthly', priority: 0.4 },
    { path: '/library/bookmarks',   freq: 'monthly', priority: 0.4 },
    { path: '/library/confusing',   freq: 'monthly', priority: 0.4 },
    { path: '/notes',         freq: 'monthly', priority: 0.4 },
    { path: '/glossary',      freq: 'monthly', priority: 0.6 },
    { path: '/resources',     freq: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${SITE}${r.path}`,
      changeFrequency: r.freq,
      priority: r.priority,
      lastModified: now,
    })),

    ...concepts.map((concept) => ({
      url: `${SITE}/concepts/${concept.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      lastModified: now,
    })),
  ];
}
