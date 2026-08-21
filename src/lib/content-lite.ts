import type { GlossaryEntry } from './types';
import glossaryData from '@content/glossary.json';
import conceptIndex from '@content/concepts/index.json';

export type ConceptSummary = typeof conceptIndex[number];

const concepts = conceptIndex as ConceptSummary[];
const glossary = glossaryData as GlossaryEntry[];

export function getAllConceptSummaries(): ConceptSummary[] { return concepts; }
export function getConceptSummary(slug: string): ConceptSummary | null { return concepts.find((c) => c.slug === slug) ?? null; }
export function getGlossaryLite(): GlossaryEntry[] { return glossary; }

export function universalSearchLite(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const conceptResults = concepts.filter((c) => [c.title,c.summary,c.area,c.slug,...(c.tags ?? [])].some((v) => String(v ?? '').toLowerCase().includes(q))).slice(0, 30).map((c) => ({ type: 'concept' as const, title: c.title, subtitle: c.summary, href: `/concepts/${c.slug}`, group: 'Concepts' }));
  const glossaryResults = glossary.filter((g) => [g.term,g.definition].some((v) => String(v ?? '').toLowerCase().includes(q))).slice(0, 18).map((g) => ({ type: 'glossary' as const, title: g.term, subtitle: g.definition, href: `/glossary?term=${encodeURIComponent(g.term)}`, group: 'Glossary' }));
  return [...conceptResults, ...glossaryResults];
}


export function pickDailyDoseSummary(
  mastery: Record<string, { state?: string; recall_score?: number; apply_score?: number }>,
  reviewItems: Record<string, { due_at: string }>,
  events: Array<{ concept_slug: string; created_at: string }> = []
): ConceptSummary | null {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let best: { concept: ConceptSummary; score: number } | null = null;

  for (const concept of concepts) {
    const m = mastery[concept.slug];
    const r = reviewItems[concept.slug];
    let score = 0;
    if (r && Number.isFinite(Date.parse(r.due_at)) && Date.parse(r.due_at) <= now) score += 40;
    if (m && ((m.recall_score ?? 1) < 0.6 || (m.apply_score ?? 1) < 0.5)) score += 25;
    if (!m || m.state === 'not_started') score += 20;
    if (concept.prerequisites.every((p) => {
      const pm = mastery[p];
      return pm && ['understood','practiced','applied','mastered'].includes(pm.state ?? '');
    })) score += 10;
    if (events.some((e) => e.concept_slug === concept.slug && e.created_at.slice(0,10) === yesterday)) score -= 15;
    if (events.some((e) => e.concept_slug === concept.slug && e.created_at.slice(0,10) === today)) score = -100;
    if (concept.difficulty === 'core') score += 5;
    if (!best || score > best.score) best = { concept, score };
  }

  return best?.score && best.score > 0 ? best.concept : concepts[0] ?? null;
}

export function getLiteRecommendations(
  mastery: Record<string, { state?: string; learn_score?: number; recall_score?: number; apply_score?: number }>,
  reviewItems: Record<string, { due_at: string }>,
  lastVisited: string | null,
  limit = 3
) {
  const out: Array<{ concept: ConceptSummary; reason: string }> = [];
  const seen = new Set<string>();
  const now = Date.now();
  for (const [slug, r] of Object.entries(reviewItems)) {
    if (Date.parse(r.due_at) <= now) {
      const c = getConceptSummary(slug);
      if (c && !seen.has(c.slug)) { out.push({ concept: c, reason: 'Review due — recall decays fast.' }); seen.add(c.slug); }
      if (out.length >= limit) return out;
    }
  }
  for (const c of concepts) {
    if (seen.has(c.slug)) continue;
    const m = mastery[c.slug];
    if (m && ['exposed','understood','practiced'].includes(m.state ?? '') && ((m.recall_score ?? 1) < 0.5 || (m.apply_score ?? 1) < 0.3)) {
      out.push({ concept: c, reason: 'Weak recall — strengthen it before moving on.' }); seen.add(c.slug);
      if (out.length >= limit) return out;
    }
  }
  if (lastVisited) {
    const c = getConceptSummary(lastVisited);
    if (c && !seen.has(c.slug)) out.push({ concept: c, reason: 'Continue from where you left off.' });
  }
  if (out.length < limit) {
    for (const c of concepts) {
      if (seen.has(c.slug)) continue;
      if (!mastery[c.slug] || mastery[c.slug].state === 'not_started') { out.push({ concept: c, reason: 'Next concept in the curriculum.' }); seen.add(c.slug); }
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}
