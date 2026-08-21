import conceptIndex from '@content/concepts/index.json';

export type ConceptSummary = typeof conceptIndex[number];

const concepts = conceptIndex as ConceptSummary[];
const bySlug = new Map(concepts.map((c) => [c.slug, c]));

export function getConceptGraph(slug: string) {
  const concept = bySlug.get(slug);
  if (!concept) return { prerequisites: [], related: [], dependents: [] };
  const summary = (s: string) => bySlug.get(s);
  return {
    prerequisites: concept.prerequisites.map(summary).filter(Boolean),
    related: concept.related.map(summary).filter(Boolean),
    dependents: concepts.filter((c) => c.prerequisites.includes(slug)),
  };
}

export function calculateReadingMinutesLite(concept: { summary: string; why_it_matters?: string; blocks: unknown[]; interview_prompts?: string[]; common_mistakes?: string[] }) {
  const text = [concept.summary, concept.why_it_matters, ...(concept.blocks ?? []).map((b) => JSON.stringify(b)), ...(concept.interview_prompts ?? []), ...(concept.common_mistakes ?? [])].join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const interactive = (concept.blocks ?? []).filter((b: any) => ['quiz','scenario','simulation','mermaid','image','video'].includes(b?.type)).length;
  return Math.max(4, Math.min(18, Math.round(words / 220 + interactive * 0.22)));
}
