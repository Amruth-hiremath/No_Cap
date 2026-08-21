'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookText, Search, ArrowRight } from 'lucide-react';
import { Surface, EmptyState } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { getGlossary } from '@/lib/glossary';
import { getConceptSummary } from '@/lib/content-lite';

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  const all = getGlossary();

  const filtered = query
    ? all.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.term.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q)) ||
          e.definition.toLowerCase().includes(q)
        );
      })
    : all;

  const grouped = filtered.reduce(
    (acc, e) => {
      const letter = e.term[0].toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(e);
      return acc;
    },
    {} as Record<string, typeof all>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Glossary</h1>
        <AccentRule className="mt-3" />
        <p className="mt-3 text-sm text-text-secondary">
          {all.length} terms with aliases and cross-links. Search across terms, aliases, and definitions.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, aliases, definitions..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        {query && (
          <span className="tnum text-xs text-text-muted">{filtered.length}</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={`No terms match "${query}"`}
          description="Try a shorter query or browse all terms."
          icon={<BookText className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, entries]) => (
              <div key={letter}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {letter}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {entries.map((e) => {
                    const linkedConcept = e.concept_slug ? getConceptSummary(e.concept_slug) : null;
                    return (
                      <Surface key={e.term} variant="solid" className="p-4">
                        <div className="flex items-center gap-2">
                          <BookText className="h-3.5 w-3.5 text-text-muted" />
                          <h3 className="text-sm font-semibold text-text-primary">{e.term}</h3>
                        </div>
                        {e.aliases.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.aliases.map((a) => (
                              <span
                                key={a}
                                className="rounded bg-surface-inset px-1.5 py-0.5 text-[10px] text-text-muted"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs leading-relaxed text-text-secondary">{e.definition}</p>
                        {linkedConcept && (
                          <Link
                            href={`/concepts/${linkedConcept.slug}`}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                          >
                            Learn: {linkedConcept.title} <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </Surface>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
