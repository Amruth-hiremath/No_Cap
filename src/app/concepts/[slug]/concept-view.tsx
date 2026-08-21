'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Layers,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  Tag,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge, MasteryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LessonBlockRenderer, LessonSectionHeader } from '@/components/concept/LessonRenderer';
import { ReadingProgress } from '@/components/concept/ReadingProgress';
import { TableOfContents } from '@/components/concept/TableOfContents';
import { ReadingTools } from '@/components/concept/ReadingTools';
import { QuizBlock } from '@/components/concept/QuizCard';
import { ScenarioCard } from '@/components/concept/ScenarioCard';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { clearRenderedHighlights, wrapTextHighlight, scrollToText } from '@/lib/highlight-dom';
import type { Concept, LessonBlock, MasteryState } from '@/lib/types';
import { getAllConceptSummaries } from '@/lib/content-lite';
import type { ConceptGraph, ConceptSummary } from '@/lib/content-graph';

export function ConceptView({ concept, graph, readingMinutes }: { concept: Concept; graph: ConceptGraph; readingMinutes: number }) {
  const startConcept = useStore((s) => s.startConcept);
  const markUnderstood = useStore((s) => s.markConceptUnderstood);
  const recordQuizAttempt = useStore((s) => s.recordQuizAttempt);
  const recordScenarioAttempt = useStore((s) => s.recordScenarioAttempt);
  const setLastVisitedPosition = useStore((s) => s.setLastVisitedPosition);
  const getLastVisitedPosition = useStore((s) => s.getLastVisitedPosition);
  const getMasteryState = useStore((s) => s.getMasteryState);
  const toggleConfusing = useStore((s) => s.toggleConfusing);
  const isConfusing = useStore((s) => s.isConfusing);
  const allConcepts = getAllConceptSummaries();
  // Focus mode hides the TOC for distraction-free reading.
  const focusMode = useStore((s) => s.focus_mode);
  const highlights = useStore((s) => s.highlights);

  // Hydration guard: SSR and first client render produce identical deterministic markup.
  // Only read persisted mastery state after the component has mounted on the client.
  const [mounted, setMounted] = useState(false);
  const [masteryState, setMasteryState] = useState<MasteryState>('not_started');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setMasteryState(getMasteryState(concept.slug));
    }
  }, [mounted, concept.slug, getMasteryState]);

  const state = mounted ? masteryState : 'not_started';

  const scrollRef = useRef<HTMLDivElement>(null);

  // Record exposure EXACTLY ONCE per browser session.
  useEffect(() => {
    startConcept(concept.slug);
  }, [concept.slug, startConcept]);

  // Debounced scroll-position tracking. Persisted on unmount / on scroll stop.
  useEffect(() => {
    const el = scrollRef.current ?? document.documentElement;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const pos = el.scrollTop;
        setLastVisitedPosition(concept.slug, pos);
      }, 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [concept.slug, setLastVisitedPosition]);

  // Restore last scroll position after content renders.
  useEffect(() => {
    if (!mounted) return;
    const last = getLastVisitedPosition(concept.slug);
    if (last > 0 && last < 10000) {
      requestAnimationFrame(() => window.scrollTo({ top: last, behavior: 'instant' as ScrollBehavior }));
    }
  }, [concept.slug, mounted, getLastVisitedPosition]);

  // Re-apply persisted highlights directly to the rendered article.
  useEffect(() => {
    if (!mounted) return;
    const article = document.querySelector<HTMLElement>('[data-concept-article]');
    if (!article) return;
    clearRenderedHighlights(article);
    const items = highlights.filter((h) => h.concept_slug === concept.slug);
    for (const h of items) {
      const scope = h.block_id && h.block_id !== 'unknown'
        ? article.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(h.block_id)}"]`) || article
        : article;
      wrapTextHighlight(scope, h.selected_text, h.color);
    }
  }, [mounted, highlights, concept.slug]);

  // Deep-link into an exact note/highlight passage when returning from My Library.
  useEffect(() => {
    if (!mounted) return;
    const article = document.querySelector<HTMLElement>('[data-concept-article]');
    if (!article) return;
    const params = new URLSearchParams(window.location.search);
    const text = params.get('focus');
    const anchorStartRaw = params.get('start');
    const anchorEndRaw = params.get('end');
    const anchorStart = anchorStartRaw ? Number(anchorStartRaw) : undefined;
    const anchorEnd = anchorEndRaw ? Number(anchorEndRaw) : undefined;
    const block = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
    const scope = block ? article.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(block)}"]`) || article : article;
    if (block) {
      scope.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scope.classList.add('nocap-note-target');
      window.setTimeout(() => scope.classList.remove('nocap-note-target'), 1600);
    }
    if (text) {
      window.setTimeout(() => scrollToText(scope, text, 'smooth', anchorStart, anchorEnd), 120);
    }
  }, [mounted, concept.slug]);


  const prereqs = graph.prerequisites;
  const related = graph.related;
  const dependents = graph.dependents;

  const isUnderstood = ['understood', 'practiced', 'applied', 'mastered'].includes(state);

  return (
    <div ref={scrollRef} className="mx-auto w-full max-w-5xl space-y-6">
      {/* Reading progress bar — thin accent line pinned to viewport top */}
      <ReadingProgress />

      {/* Reading tools — contextual toolbar on text selection (also driven
          by the `h` / `n` keyboard shortcuts via useKeyboardShortcuts). */}
      <ReadingTools conceptSlug={concept.slug} />

      {/* Desktop: reading column + sticky TOC sidebar.
          On xl we break out of the AppShell's px-8 padding so the prose
          column can stay at max-w-3xl (768px) without being compressed
          by the TOC. */}
      <div className="flex gap-8 xl:-mx-8 xl:w-[calc(100%+4rem)]">
        <article
          data-concept-article
          className="mx-auto w-full min-w-0 max-w-3xl flex-1 space-y-6 xl:mx-0"
        >
          <Link
            href="/concepts"
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Library
          </Link>

          {/* Metadata header */}
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">
                <Clock className="h-3 w-3" />
                <span className="tnum">{readingMinutes}</span> MIN
              </Badge>
              <Badge variant="default">{concept.difficulty}</Badge>
              <Badge variant="info">{concept.area}</Badge>
              <MasteryBadge state={state} />
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
              {concept.title}
            </h1>
            <AccentRule className="mt-3" />
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
              {concept.summary}
            </p>

            {/* Why this matters — editorial aside, right after the summary. */}
            {concept.why_it_matters && (
              <aside
                className="mt-4 border-l-2 border-accent pl-4"
                aria-label="Why this matters"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
                  <Zap className="h-3 w-3" aria-hidden />
                  Why this matters
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">
                  {concept.why_it_matters}
                </p>
              </aside>
            )}
          </header>

          {/* Prereqs / Related / Dependents */}
          {(prereqs.length > 0 || related.length > 0 || dependents.length > 0) && (
            <Surface variant="inset" className="p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ConceptLinkGroup
                  icon={<Layers className="h-3 w-3" />}
                  label="Prerequisites"
                  concepts={prereqs}
                  emptyText="None — start here."
                />
                <ConceptLinkGroup
                  icon={<GitBranch className="h-3 w-3" />}
                  label="Related"
                  concepts={related}
                  emptyText="None yet."
                />
                <ConceptLinkGroup
                  icon={<BookOpen className="h-3 w-3" />}
                  label="Used in"
                  concepts={dependents}
                  emptyText="Foundational."
                />
              </div>
            </Surface>
          )}

          {/* Lesson body — structured article canvas with preserved content */}
          <div className="concept-reading-canvas page-section-reveal space-y-2">
            {/* Render blocks in order, with section headers for known semantic ids */}
            <LessonSectionHeader
              eyebrow="Lesson"
              title="How it works"
              icon={<BookOpen className="h-3 w-3" />}
            />
            {concept.blocks.map((block: LessonBlock) => {
              if (block.type === 'quiz') {
                return (
                  <QuizBlock
                    key={block.id}
                    block={block}
                    onSubmit={(score, response) =>
                      recordQuizAttempt(concept.slug, block.id, score, response)
                    }
                  />
                );
              }
              if (block.type === 'scenario') {
                return (
                  <ScenarioCard
                    key={block.id}
                    block={block}
                    onSubmit={(score, response) =>
                      recordScenarioAttempt(concept.slug, block.id, score, response)
                    }
                  />
                );
              }
              return <div key={block.id} data-block-id={block.id} className="animate-soft-rise lesson-block-virtualized"><LessonBlockRenderer block={block} /></div>;
            })}

            {/* Trade-offs */}
            {concept.trade_offs && (concept.trade_offs.pros.length > 0 || concept.trade_offs.cons.length > 0) && (
              <>
                <LessonSectionHeader
                  eyebrow="Trade-offs"
                  title="What you gain, what you pay"
                  icon={<AlertTriangle className="h-3 w-3" />}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Surface variant="solid" className="p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pros
                    </div>
                    <ul className="space-y-1.5 text-sm text-text-secondary">
                      {concept.trade_offs.pros.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-success">+</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Surface>
                  <Surface variant="solid" className="p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-danger">
                      <AlertTriangle className="h-3.5 w-3.5" /> Cons
                    </div>
                    <ul className="space-y-1.5 text-sm text-text-secondary">
                      {concept.trade_offs.cons.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-danger">−</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Surface>
                </div>
              </>
            )}

            {/* Failure modes */}
            {concept.failure_modes && concept.failure_modes.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Failure modes"
                  title="How this breaks in production"
                  icon={<AlertTriangle className="h-3 w-3" />}
                />
                <ul className="space-y-2">
                  {concept.failure_modes.map((fm, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                      <span>{fm}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Common mistakes */}
            {concept.common_mistakes.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Common mistakes"
                  title="Don't fall into these traps"
                  icon={<Lightbulb className="h-3 w-3" />}
                />
                <ul className="space-y-2">
                  {concept.common_mistakes.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text-secondary">
                      <span className="text-warning">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Where you see it */}
            {concept.where_you_see_it.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Where you see it"
                  title="Real systems using this"
                  icon={<BookOpen className="h-3 w-3" />}
                />
                <div className="flex flex-wrap gap-2">
                  {concept.where_you_see_it.map((w, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Real system mappings */}
            {concept.real_system_mappings && concept.real_system_mappings.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Teardowns"
                  title="How real systems implement this"
                  icon={<BookOpen className="h-3 w-3" />}
                />
                <ul className="space-y-2">
                  {concept.real_system_mappings.map((m, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-text-primary">{m.system}</span>
                      <span className="text-text-muted"> — </span>
                      <span className="text-text-secondary">{m.how}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Interview prompts */}
            {concept.interview_prompts.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Interview prompts"
                  title="Practice saying it out loud"
                  icon={<Target className="h-3 w-3" />}
                />
                <ul className="space-y-2.5">
                  {concept.interview_prompts.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text-secondary">
                      <span className="tnum text-xs font-semibold text-accent">Q{i + 1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Sources / research layer */}
            {concept.sources && concept.sources.length > 0 && (
              <>
                <LessonSectionHeader
                  eyebrow="Research"
                  title="Further reading & references"
                  icon={<BookOpen className="h-3 w-3" />}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {concept.sources.map((source, i) => (
                    <a
                      key={`${source.url}-${i}`}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-subtle"
                    >
                      <div className="text-sm font-medium text-text-primary group-hover:text-accent">{source.title}</div>
                      <div className="mt-1 text-[11px] text-text-muted">{source.publisher ?? 'Reference'}</div>
                    </a>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-text-faint">Core explanations are original NO CAP material. External references are provided for deeper study and standards.</p>
              </>
            )}

            {/* Cost note — v0.1 shows only metadata, calculator is v1.0 */}
            {concept.cost_metadata && (
              <>
                <LessonSectionHeader
                  eyebrow="Cost implications"
                  title="What this costs at scale"
                  icon={<Tag className="h-3 w-3" />}
                />
                <Surface variant="inset" className="p-4">
                  <p className="text-sm text-text-secondary">
                    At <span className="font-medium text-text-primary">{concept.cost_metadata.reference_scale}</span>,
                    this pattern typically adds ~
                    <span className="tnum font-semibold text-text-primary">
                      ${concept.cost_metadata.reference_monthly_cost_usd}/mo
                    </span>{' '}
                    on AWS. Dominant driver:{' '}
                    <span className="font-medium text-text-primary">
                      {concept.cost_metadata.dominant_cost_driver}
                    </span>
                    .
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    Cost calculator (with live pricing) ships in v1.0. For now, treat as a rough
                    order-of-magnitude estimate.
                  </p>
                </Surface>
              </>
            )}
          </div>

          {/* Action footer — proper mastery events */}
          <Surface variant="solid" className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">What next?</p>
                <p className="text-xs text-text-muted">
                  {isUnderstood
                    ? 'Marked as understood. Take the quiz or scenario to advance.'
                    : state === 'not_started'
                      ? 'Mark as understood once the mental model clicks.'
                      : 'Keep going — you\'re making progress.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleConfusing(concept.slug)}
                  className={cn(
                    'text-xs',
                    mounted && isConfusing(concept.slug)
                      ? 'text-warning border border-warning'
                      : 'text-text-muted'
                  )}
                >
                  {mounted && isConfusing(concept.slug) ? '✓ Confusing' : 'I\'m confused'}
                </Button>
                <Button
                  variant={isUnderstood ? 'secondary' : 'primary'}
                  onClick={() => markUnderstood(concept.slug)}
                  disabled={isUnderstood}
                >
                  {isUnderstood ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Understood
                    </>
                  ) : (
                    'Mark understood'
                  )}
                </Button>
              </div>
            </div>
          </Surface>

          {/* Next recommended concept */}
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              Next recommended
            </p>
            {(() => {
              const nextSlug = concept.related[0] ?? dependents[0]?.slug;
              const next = nextSlug ? allConcepts.find((c) => c.slug === nextSlug) : null;
              if (!next) {
                return (
                  <Link
                    href="/roadmap"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    View roadmap <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                );
              }
              return (
                <Link
                  href={`/concepts/${next.slug}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  {next.title} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              );
            })()}
          </div>
        </article>

        {/* Sticky table of contents — desktop only, hidden in focus mode. */}
        {!focusMode && <TableOfContents />}
      </div>
    </div>
  );
}

function ConceptLinkGroup({
  icon,
  label,
  concepts,
  emptyText,
}: {
  icon: React.ReactNode;
  label: string;
  concepts: ConceptSummary[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {icon}
        {label}
      </div>
      {concepts.length === 0 ? (
        <p className="mt-1.5 text-xs italic text-text-faint">{emptyText}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {concepts.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/concepts/${c.slug}`}
                className={cn(
                  'inline-flex items-center gap-1 text-xs text-accent hover:underline'
                )}
              >
                {c.title}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
