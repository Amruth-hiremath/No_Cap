/* ═══════════════════════════════════════════════════════════════════
   Content loader — registry/manifest pattern.

   To add a concept: drop a JSON in /content/concepts/<slug>.json and
   append the slug to /content/concepts/manifest.json. No edits to the
   application code. The validator (`npm run content:validate`)
   enforces schema + reference integrity.
   ═══════════════════════════════════════════════════════════════════ */

import type { Concept, Track, GlossaryEntry } from './types';
import tracksData from '@content/tracks.json';
import glossaryData from '@content/glossary.json';
import manifest from '@content/concepts/manifest.json';

// Import every concept in the manifest. Next.js statically analyses
// these imports at build time, so the JSON ends up bundled in the
// final JS — no network fetch needed for offline use.
import howInternetWorks from '@content/concepts/how-the-internet-works.json';
import dns from '@content/concepts/dns.json';
import loadBalancing from '@content/concepts/load-balancing.json';
import caching from '@content/concepts/caching.json';
import capTheorem from '@content/concepts/cap-theorem.json';

const conceptModules: Record<string, Concept> = {
  'how-the-internet-works': howInternetWorks as unknown as Concept,
  'dns': dns as unknown as Concept,
  'load-balancing': loadBalancing as unknown as Concept,
  'caching': caching as unknown as Concept,
  'cap-theorem': capTheorem as unknown as Concept,
};

export const CONCEPT_SLUGS: string[] = manifest as string[];

const conceptMap: Record<string, Concept> = CONCEPT_SLUGS.reduce(
  (acc, slug) => {
    const mod = conceptModules[slug];
    if (mod) acc[slug] = mod;
    return acc;
  },
  {} as Record<string, Concept>
);

export function getAllConcepts(): Concept[] {
  return CONCEPT_SLUGS.map((s) => conceptMap[s]).filter(Boolean);
}

export function getConcept(slug: string): Concept | null {
  return conceptMap[slug] ?? null;
}

export function getConceptsByArea(area: string): Concept[] {
  return getAllConcepts().filter((c) => c.area === area);
}

export function getConceptsByPhase(phase: string): Concept[] {
  return getAllConcepts().filter((c) => c.phase === phase);
}

export function getTracks(): Track[] {
  return tracksData as Track[];
}

export function getTrack(slug: string): Track | null {
  return (tracksData as Track[]).find((t) => t.slug === slug) ?? null;
}

export function getPhases() {
  return getTracks()[0]?.phases ?? [];
}

export function getGlossary(): GlossaryEntry[] {
  return glossaryData as GlossaryEntry[];
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase();
  return getGlossary().filter(
    (e) =>
      e.term.toLowerCase().includes(q) ||
      e.aliases.some((a) => a.toLowerCase().includes(q)) ||
      e.definition.toLowerCase().includes(q)
  );
}

export function searchConcepts(query: string): Concept[] {
  const q = query.toLowerCase();
  return getAllConcepts().filter((c) => {
    const summary = c.summary ?? '';
    return (
      c.title.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q) ||
      c.phase.toLowerCase().includes(q) ||
      c.slug.includes(q) ||
      summary.toLowerCase().includes(q)
    );
  });
}

export interface SearchResult {
  type: 'concept' | 'glossary' | 'action';
  title: string;
  subtitle?: string;
  href?: string;
  group: string;
}

export function universalSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];
  results.push(
    ...searchConcepts(query).map((c) => ({
      type: 'concept' as const,
      title: c.title,
      subtitle: `${c.area} · ${c.estimated_minutes} min`,
      href: `/concepts/${c.slug}`,
      group: 'Concepts',
    }))
  );
  results.push(
    ...searchGlossary(query).map((g) => ({
      type: 'glossary' as const,
      title: g.term,
      subtitle: g.definition,
      href: g.concept_slug ? `/concepts/${g.concept_slug}` : '/glossary',
      group: 'Glossary',
    }))
  );
  return results;
}

/**
 * Returns the prerequisites (transitively) for a concept — useful for
 * the roadmap Guided view and the recommendation engine.
 */
export function getPrerequisiteChain(slug: string): Concept[] {
  const seen = new Set<string>();
  const out: Concept[] = [];
  const visit = (s: string) => {
    if (seen.has(s)) return;
    seen.add(s);
    const c = getConcept(s);
    if (!c) return;
    for (const p of c.prerequisites) visit(p);
    if (s !== slug) out.push(c);
  };
  visit(slug);
  return out;
}

/**
 * Concepts that depend on this one (used in "used_in" / "where you'll use it" sections).
 */
export function getDependents(slug: string): Concept[] {
  return getAllConcepts().filter((c) => c.prerequisites.includes(slug));
}
