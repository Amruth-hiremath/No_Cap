// Pre-render all known concept slugs at build time (static export)
import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/content';
import { getConceptGraph, calculateReadingMinutesLite } from '@/lib/content-graph';
import { ConceptView } from './concept-view';

export function generateStaticParams() {
  return getAllConcepts().map((c) => ({ slug: c.slug }));
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
