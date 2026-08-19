'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

/**
 * TableOfContents — sticky mini-TOC for concept pages.
 * Shows section headings with progress indicators.
 * Desktop: right-side sticky panel.
 * Mobile: hidden (concept page already has enough density).
 */
export function TableOfContents() {
  const [activeId, setActiveId] = useState<string>('');
  const [items, setItems] = useState<TOCItem[]>([]);

  // Collect headings from the article after mount.
  useEffect(() => {
    const article = document.querySelector('article[data-concept-article]');
    if (!article) return;
    const headings = article.querySelectorAll('h2, h3, h4');
    const collected: TOCItem[] = [];
    headings.forEach((h, i) => {
      const text = h.textContent?.trim() || '';
      if (!text) return;
      const id = h.id || `heading-${i}`;
      if (!h.id) h.id = id;
      collected.push({
        id,
        text,
        level: h.tagName === 'H2' ? 2 : h.tagName === 'H3' ? 3 : 4,
      });
    });
    setItems(collected);
  }, []);

  // Track which heading is currently in view.
  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null; // Don't show for short articles

  return (
    <nav className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto xl:block">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        On this page
      </div>
      <ul className="space-y-0.5 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top, behavior: 'smooth' });
                }
              }}
              className={cn(
                'block border-l-2 py-1 text-xs transition-colors',
                item.level === 2 ? 'pl-3' : item.level === 3 ? 'pl-5' : 'pl-7',
                activeId === item.id
                  ? 'border-accent font-medium text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              {item.text.length > 40 ? item.text.slice(0, 37) + '…' : item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
