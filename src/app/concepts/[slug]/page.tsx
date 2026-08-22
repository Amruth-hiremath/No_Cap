// Pre-render all known concept slugs at build time (static export)
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/content';
import { getConceptGraph, calculateReadingMinutesLite } from '@/lib/content-graph';
import { ConceptView } from './concept-view';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev';

export function generateStaticParams() {
  return getAllConcepts().map((c) => ({ slug: c.slug }));
}

// Per-concept metadata — fixes the duplicate-content SEO blocker where all
// 144 concept pages previously shared the root layout's title/description.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) {
    return {
      title: 'Concept not found',
      robots: { index: false, follow: false },
    };
  }
  const description = concept.summary?.slice(0, 155)
    || `${concept.title} — a NO CAP system-design concept in the ${concept.area} area.`;
  const title = `${concept.title} (${concept.area})`;
  return {
    title,
    description,
    alternates: { canonical: `/concepts/${concept.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE}/concepts/${concept.slug}`,
      siteName: 'NO CAP',
      images: [{ url: `/learning-visuals/${concept.slug}.svg`, alt: concept.title }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [`/learning-visuals/${concept.slug}.svg`],
    },
    keywords: [concept.area, concept.difficulty, 'system design'],
  };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) notFound();
  const graph = getConceptGraph(slug);
  const readingMinutes = calculateReadingMinutesLite(concept);
  return <ConceptView concept={concept} graph={graph} readingMinutes={readingMinutes} />;
}
