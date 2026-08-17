/* ═══════════════════════════════════════════════════════════════════
   Recommendation engine — deterministic, prerequisite-aware.
   Priority: due review → prerequisite bottleneck → weak concept
            → next roadmap concept → optional exploration.
   ═══════════════════════════════════════════════════════════════════ */

import type { Concept, MasteryRecord, ReviewItem } from './types';
import { computeMasteryScore } from './mastery';
import { getAllConcepts, getConcept, getPhases } from './content';

export interface Recommendation {
  concept: Concept;
  reason: string;
  priority: number; // 0 (highest) → 4 (lowest)
  kind: 'review' | 'prerequisite' | 'weak' | 'next' | 'explore';
}

export interface RecommendationContext {
  mastery: Record<string, MasteryRecord>;
  review_items: Record<string, ReviewItem>;
  last_visited_concept: string | null;
}

export function getRecommendations(ctx: RecommendationContext, limit = 5): Recommendation[] {
  const all = getAllConcepts();
  const recs: Recommendation[] = [];
  const seen = new Set<string>();

  // 1. Due reviews
  const now = new Date();
  for (const r of Object.values(ctx.review_items)) {
    if (new Date(r.due_at) <= now) {
      const c = getConcept(r.concept_slug);
      if (c && !seen.has(c.slug)) {
        recs.push({
          concept: c,
          reason: 'Review due — recall decays fast.',
          priority: 0,
          kind: 'review',
        });
        seen.add(c.slug);
      }
    }
  }

  // 2. Prerequisite bottlenecks — concepts whose prereqs aren't yet understood
  for (const c of all) {
    if (seen.has(c.slug)) continue;
    const myMastery = ctx.mastery[c.slug];
    if (myMastery && myMastery.state !== 'not_started') continue;
    const blockedBy = c.prerequisites.find((p) => {
      const pm = ctx.mastery[p];
      return !pm || (pm.learn_score < 0.7 && pm.state !== 'understood');
    });
    if (blockedBy) {
      const bp = getConcept(blockedBy);
      if (bp) {
        recs.push({
          concept: bp,
          reason: `Prerequisite for ${c.title}.`,
          priority: 1,
          kind: 'prerequisite',
        });
        seen.add(bp.slug);
      }
    }
  }

  // 3. Weak concepts — exposed but recall/apply scores are low
  for (const c of all) {
    if (seen.has(c.slug)) continue;
    const m = ctx.mastery[c.slug];
    if (!m) continue;
    if (m.state === 'understood' || m.state === 'exposed' || m.state === 'practiced') {
      if (m.recall_score < 0.5 || m.apply_score < 0.3) {
        recs.push({
          concept: c,
          reason: 'Weak recall — quiz yourself before it fades.',
          priority: 2,
          kind: 'weak',
        });
        seen.add(c.slug);
      }
    }
  }

  // 4. Next roadmap concept (first not-started concept in track order)
  for (const phase of getPhases()) {
    for (const slug of phase.concepts) {
      if (seen.has(slug)) continue;
      const c = getConcept(slug);
      if (!c) continue;
      const m = ctx.mastery[slug];
      if (!m || m.state === 'not_started') {
        // Make sure all prereqs are understood first.
        const ready = c.prerequisites.every((p) => {
          const pm = ctx.mastery[p];
          return pm && pm.learn_score >= 0.7;
        });
        if (ready) {
          recs.push({
            concept: c,
            reason: `Next in ${phase.title}.`,
            priority: 3,
            kind: 'next',
          });
          seen.add(c.slug);
        }
      }
    }
  }

  // 5. Explore — anything not yet started
  for (const c of all) {
    if (seen.has(c.slug)) continue;
    const m = ctx.mastery[c.slug];
    if (!m || m.state === 'not_started') {
      recs.push({
        concept: c,
        reason: 'Open up a new mental model.',
        priority: 4,
        kind: 'explore',
      });
      seen.add(c.slug);
    }
  }

  recs.sort((a, b) => a.priority - b.priority);
  return recs.slice(0, limit);
}

export function topWeakAreas(
  mastery: Record<string, MasteryRecord>,
  limit = 3
): { area: string; avgScore: number; conceptCount: number }[] {
  const all = getAllConcepts();
  const byArea: Record<string, MasteryRecord[]> = {};
  for (const c of all) {
    const m = mastery[c.slug];
    if (!m) continue;
    if (!byArea[c.area]) byArea[c.area] = [];
    byArea[c.area].push(m);
  }
  return Object.entries(byArea)
    .map(([area, records]) => ({
      area,
      avgScore:
        records.reduce((s, r) => s + computeMasteryScore(r), 0) / records.length,
      conceptCount: records.length,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, limit);
}
