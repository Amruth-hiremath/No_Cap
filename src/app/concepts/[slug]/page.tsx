// Pre-render all known concept slugs at build time (static export)
import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/content';
import { ConceptView } from './concept-view';

export function generateStaticParams() {
  return getAllConcepts().map((c) => ({ slug: c.slug }));
}

export default function ConceptPage({
  params,
}: {
  params: { slug: string };
}) {
  const concept = getConcept(params.slug);
  if (!concept) notFound();
  return <ConceptView concept={concept} />;
}
