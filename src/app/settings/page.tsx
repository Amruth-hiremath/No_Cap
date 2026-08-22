'use client';

import { Download, Focus, Palette, RotateCcw, ShieldCheck, WandSparkles, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { Surface } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { themeGroups, type ThemeId } from '@/lib/themes';

const sections = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'learning', label: 'Learning' },
  { id: 'data', label: 'Data & backup' },
] as const;

export default function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const [sidebarAutoPeek, setSidebarAutoPeek] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('appearance');

  useEffect(() => {
    try { setSidebarAutoPeek(localStorage.getItem('nocap-sidebar-auto-peek') !== '0'); } catch {}
  }, []);

  // Scroll-spy: highlight the section currently in view. Route-aware (hash changes
  // from clicking nav links also update active state) and works for future nested
  // settings routes because each section is anchored by id.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) {
      setActiveSection(window.location.hash.slice(1));
    }
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((t) => observer.observe(t));
    const onHash = () => window.location.hash && setActiveSection(window.location.hash.slice(1));
    window.addEventListener('hashchange', onHash);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const setSidebarMode = (value: boolean) => {
    setSidebarAutoPeek(value);
    try {
      localStorage.setItem('nocap-sidebar-auto-peek', value ? '1' : '0');
      window.dispatchEvent(new Event('nocap:sidebar-mode'));
    } catch {}
  };

  return (
    <div className="settings-page">
      <div className="settings-hero">
        <div><div className="account-eyebrow">Workspace controls</div><h1>Settings</h1><p>Shape how NO CAP looks and behaves.</p></div>
        <Link href="/settings/sync" className="settings-guide-button"><ShieldCheck className="h-4 w-4" /> Setup & sync guide</Link>
      </div>

      <div className="settings-layout">
        <aside className="settings-index" aria-label="Settings sections">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(activeSection === s.id && 'is-active')}
              aria-current={activeSection === s.id ? 'true' : undefined}
            >
              {s.label}
            </a>
          ))}
        </aside>

        <div className="settings-content">
          <section id="appearance" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><Palette className="h-4 w-4" /></div><div><h2>Appearance</h2><p>Eight deliberate, premium palettes. Pick the workspace that fits your eyes and the time of day.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              {/* LIGHT THEMES */}
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"><Sun className="h-3 w-3" /> Light</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {themeGroups.light.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ThemeId)}
                    className={cn('theme-choice', theme === t.id && 'theme-choice--active')}
                    aria-pressed={theme === t.id}
                    aria-label={`Use ${t.label} theme — ${t.hint}`}
                  >
                    <span className="theme-swatch-stack" aria-hidden>
                      <span className="theme-swatch-bar" style={{ background: t.swatches.bg }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.surface }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.accent }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.text }} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-semibold text-text-primary">{t.label}</span>
                      <span className="mt-0.5 block text-[10px] text-text-muted">{t.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* DARK THEMES */}
              <div className="mb-2 mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"><Moon className="h-3 w-3" /> Dark</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {themeGroups.dark.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ThemeId)}
                    className={cn('theme-choice', theme === t.id && 'theme-choice--active')}
                    aria-pressed={theme === t.id}
                    aria-label={`Use ${t.label} theme — ${t.hint}`}
                  >
                    <span className="theme-swatch-stack" aria-hidden>
                      <span className="theme-swatch-bar" style={{ background: t.swatches.bg }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.surface }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.accent }} />
                      <span className="theme-swatch-bar" style={{ background: t.swatches.text }} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-semibold text-text-primary">{t.label}</span>
                      <span className="mt-0.5 block text-[10px] text-text-muted">{t.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Surface>
          </section>

          <section id="learning" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><Focus className="h-4 w-4" /></div><div><h2>Learning</h2><p>Control focus mode and your reading experience.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              <div className="settings-row"><div><div className="text-sm font-semibold text-text-primary">Focus mode</div><div className="mt-1 text-xs text-text-muted">Hide navigation and secondary chrome while reading a deep lesson.</div></div><button type="button" onClick={() => setFocusMode(!focusMode)} className={cn('focus-toggle', focusMode && 'focus-toggle--on')} role="switch" aria-checked={focusMode} aria-label="Toggle focus mode"><span className="focus-toggle__thumb" /></button></div>
              <div className="settings-hint"><WandSparkles className="h-3.5 w-3.5" /> Press <kbd>F</kbd> anywhere outside a text field.</div>
              <div className="settings-row mt-3 border-t border-border pt-4"><div><div className="text-sm font-semibold text-text-primary">Auto-hide sidebar</div><div className="mt-1 text-xs text-text-muted">Keep a slim navigation rail and expand it only when your pointer reaches the edge, like a browser side tab.</div></div><button type="button" onClick={() => setSidebarMode(!sidebarAutoPeek)} className={cn('focus-toggle', sidebarAutoPeek && 'focus-toggle--on')} role="switch" aria-checked={sidebarAutoPeek} aria-label="Toggle auto-hide sidebar"><span className="focus-toggle__thumb" /></button></div>
            </Surface>
          </section>

          <section id="data" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><RotateCcw className="h-4 w-4" /></div><div><h2>Data & backup</h2><p>Reset learning signals or export a portable backup.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              <div className="settings-row"><div><div className="text-sm font-semibold text-text-primary">Reset learning progress</div><div className="mt-1 text-xs leading-relaxed text-text-muted">Clears mastery, review queue, attempts, streak and learning history. Notes, highlights, bookmarks and confusing items remain.</div></div><Button variant="danger" size="sm" onClick={() => { if (window.confirm('Reset all learning progress? This cannot be undone.')) useStore.getState().resetLearningProgress(); }}>Reset</Button></div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-text-primary">Backup your workspace</div><div className="mt-1 text-xs text-text-muted">Download a portable JSON backup of progress, notes, highlights, bookmarks and settings.</div></div><Button variant="ghost" size="sm" onClick={() => { const s = useStore.getState(); const payload = { exported_at: new Date().toISOString(), version: 2, state: { mastery: s.mastery, review_items: s.review_items, attempts: s.attempts, streak: s.streak, notes: s.notes, highlights: s.highlights, bookmarks: s.bookmarks, workspace_notes: s.workspace_notes, confusing_concepts: s.confusing_concepts, theme: s.theme } }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nocap-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }}><Download className="h-3.5 w-3.5"/> Export backup</Button></div>
              </div>
            </Surface>
          </section>
        </div>
      </div>
    </div>
  );
}
