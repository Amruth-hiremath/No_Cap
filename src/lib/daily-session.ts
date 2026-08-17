/* ═══════════════════════════════════════════════════════════════════
   Daily Dose — derives a guided session from user state + content.
   No hardcoded concept. Picks the highest-priority recommendation
   that hasn't been touched today.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  Concept,
  DailyDoseSession,
  DailyDoseStep,
  MasteryRecord,
  ReviewItem,
} from './types';
import { getAllConcepts, getConcept } from './content';

/** Returns a stable YYYY-MM-DD string in the user's local timezone. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deterministic concept-of-the-day from a date string. */
function pickConceptOfDay(
  date: string,
  mastery: Record<string, MasteryRecord>,
  reviewItems: Record<string, ReviewItem>
): { concept: Concept; isReview: boolean } | null {
  // Priority 1: anything due for review
  const now = new Date();
  const due = Object.values(reviewItems).filter((r) => new Date(r.due_at) <= now);
  if (due.length > 0) {
    // Stable pick — sort by slug, hash date to index.
    due.sort((a, b) => a.concept_slug.localeCompare(b.concept_slug));
    const idx = simpleHash(date) % due.length;
    const c = getConcept(due[idx].concept_slug);
    if (c) return { concept: c, isReview: true };
  }

  // Priority 2: next un-started concept (in track order)
  const all = getAllConcepts();
  for (const c of all) {
    const m = mastery[c.slug];
    if (!m || m.state === 'not_started') {
      return { concept: c, isReview: false };
    }
  }

  // Priority 3: concept with weakest recall
  const weak = all
    .map((c) => ({ c, m: mastery[c.slug] }))
    .filter((x) => x.m && x.m.recall_score < 0.6)
    .sort((a, b) => (a.m?.recall_score ?? 1) - (b.m?.recall_score ?? 1));
  if (weak.length > 0) return { concept: weak[0].c, isReview: true };

  // Priority 4: cycle through concepts deterministically
  if (all.length === 0) return null;
  const idx = simpleHash(date) % all.length;
  return { concept: all[idx], isReview: false };
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function buildDailyDose(
  mastery: Record<string, MasteryRecord>,
  reviewItems: Record<string, ReviewItem>
): DailyDoseSession {
  const date = todayLocal();
  const pick = pickConceptOfDay(date, mastery, reviewItems);
  if (!pick) {
    // Edge case — no content at all. Should never happen but keep types happy.
    return { date, concept_slug: '', steps: [] };
  }

  const { concept, isReview } = pick;
  const steps: DailyDoseStep[] = [];

  steps.push({
    id: 'intro',
    kind: 'concept_intro',
    title: 'Today\'s concept',
    description: concept.summary,
    completed: false,
  });

  // Mental model — first prose block after "why"
  const whyBlock = concept.blocks.find((b) => b.id === 'why' && b.type === 'prose');
  if (whyBlock) {
    steps.push({
      id: 'mental_model',
      kind: 'mental_model',
      title: 'Mental model',
      description: 'Build the picture in your head.',
      block_ref: whyBlock.id,
      completed: false,
    });
  }

  // Visual — first diagram block
  const diagram = concept.blocks.find((b) => b.type === 'diagram' || b.type === 'flow');
  if (diagram) {
    steps.push({
      id: 'visual',
      kind: 'visual',
      title: 'Visual',
      description: 'See the concept drawn out.',
      block_ref: diagram.id,
      completed: false,
    });
  }

  // Prediction — first scenario block (interactive apply)
  const scenario = concept.blocks.find((b) => b.type === 'scenario');
  if (scenario) {
    steps.push({
      id: 'prediction',
      kind: 'prediction',
      title: 'Try this',
      description: 'Predict what happens, then check.',
      block_ref: scenario.id,
      completed: false,
    });
  }

  // Quiz
  const quiz = concept.blocks.find((b) => b.type === 'quiz');
  if (quiz) {
    steps.push({
      id: 'quiz',
      kind: 'quiz',
      title: 'Check yourself',
      description: 'One quick question to anchor it.',
      block_ref: quiz.id,
      completed: false,
    });
  }

  // Recall — quick glossary recall
  steps.push({
    id: 'recall',
    kind: 'recall',
    title: 'Recall',
    description: isReview
      ? 'You\'ve seen this before — pull it back up.'
      : 'In your own words: what is this?',
    completed: false,
  });

  return { date, concept_slug: concept.slug, review_slug: isReview ? concept.slug : undefined, steps };
}
