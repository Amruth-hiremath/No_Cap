import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { MasteryState } from '@/lib/types';
type GraphConcept = { slug: string; title: string; area: string; prerequisites: string[]; related: string[] };
import { ArrowRight, CircleDot, Layers3 } from 'lucide-react';

const stateColor: Record<MasteryState,string> = {
  not_started: 'var(--color-border-strong)', exposed: 'var(--color-accent)', understood: 'var(--color-accent)',
  practiced: 'var(--color-accent)', applied: 'var(--color-success)', review_due: 'var(--color-warning)', mastered: 'var(--color-success)',
};

export function RoadmapGraph({ concepts, states }: { concepts: GraphConcept[]; states: Record<string, MasteryState> }) {
  const [selected, setSelected] = useState(concepts[0]?.slug ?? '');
  const bySlug = useMemo(() => new Map(concepts.map(c => [c.slug, c])), [concepts]);
  const focus = bySlug.get(selected) ?? concepts[0];
  const prereqs = useMemo(() => focus ? focus.prerequisites.map(s => bySlug.get(s)).filter((x): x is GraphConcept => Boolean(x)).slice(-4) : [], [focus, bySlug]);
  const dependents = useMemo(() => focus ? concepts.filter(c => c.prerequisites.includes(focus.slug)).slice(0, 6) : [], [focus, concepts]);
  const related = useMemo(() => focus ? focus.related.map(s => bySlug.get(s)).filter((x): x is GraphConcept => Boolean(x)).slice(0, 6) : [], [focus, bySlug]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Layers3 className="h-4 w-4 text-accent" /> Learning neighborhood</div>
          <p className="mt-1 max-w-2xl text-xs text-text-muted">Choose a concept. Instead of rendering the entire curriculum at once, NO CAP shows the smallest useful neighborhood: prerequisites → focus → next concepts.</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
          {concepts.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}
        </select>
      </div>

      {focus && (
        <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <Lane title="Prerequisites" items={prereqs} states={states} empty="Start here — no prerequisites." />
          <div className="flex flex-col items-center justify-center px-2 py-2">
            <Link prefetch={false} href={`/concepts/${focus.slug}`} className="group w-full min-w-[190px] rounded-xl border-2 border-accent bg-accent-soft p-4 transition-all hover:-translate-y-0.5 hover:shadow-md md:w-[230px]">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"><CircleDot className="h-3.5 w-3.5" /> Focus</div>
              <div className="mt-2 text-sm font-semibold text-text-primary">{focus.title}</div>
              <div className="mt-1 text-xs text-text-secondary">{focus.area} · {states[focus.slug] ?? 'not_started'}</div>
            </Link>
          </div>
          <Lane title="Next concepts" items={dependents.length ? dependents : related} states={states} empty="No downstream concepts yet." />
        </div>
      )}

      {related.length > 0 && (
        <div className="rounded-xl border border-border-faint bg-surface-subtle/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Related, not required</div>
          <div className="flex flex-wrap gap-2">
            {related.map(c => <Link key={c.slug} prefetch={false} href={`/concepts/${c.slug}`} className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary transition-all hover:-translate-y-0.5 hover:border-border-strong hover:text-text-primary"><span className="h-1.5 w-1.5 rounded-full" style={{background: stateColor[states[c.slug] ?? 'not_started']}} />{c.title}<ArrowRight className="h-3 w-3 text-text-faint" /></Link>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Lane({ title, items, states, empty }: { title: string; items: GraphConcept[]; states: Record<string,MasteryState>; empty:string }) {
  return <div className="space-y-2"><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">{title}</div>{items.length ? <div className="space-y-2">{items.map(c => <Link key={c.slug} prefetch={false} href={`/concepts/${c.slug}`} className="group flex items-center gap-3 rounded-lg border border-border bg-surface-subtle/70 p-3 transition-all hover:-translate-y-0.5 hover:border-border-strong"><span className="h-2 w-2 shrink-0 rounded-full" style={{background:stateColor[states[c.slug] ?? 'not_started']}} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-text-primary">{c.title}</span><span className="mt-0.5 block text-[10px] text-text-muted">{c.area}</span></span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5" /></Link>)}</div> : <div className="rounded-lg border border-dashed border-border p-3 text-xs text-text-muted">{empty}</div>}</div>;
}
