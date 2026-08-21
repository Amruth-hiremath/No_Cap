'use client';

import { Chrome, Cloud, CloudOff, Download, Focus, Github, Monitor, Moon, Palette, RotateCcw, ShieldCheck, Sun, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import { Surface } from '@/components/ui/Surface';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { authUrl, logoutCurrentUser } from '@/lib/api';

const themeOptions = [
  ['system', 'System', 'Device default'], ['light', 'Warm Paper', 'Editorial light'], ['sage', 'Sage', 'Soft green'], ['sand', 'Sand', 'Warm neutral'],
  ['slate', 'Slate', 'Cool neutral'], ['forest', 'Forest', 'Deep green'], ['dark', 'Night', 'Warm dark'], ['charcoal', 'Charcoal', 'Neutral dark'],
  ['clay', 'Clay', 'Terracotta'], ['olive', 'Olive', 'Quiet green'], ['mist', 'Mist', 'Soft grey'],
] as const;

type Theme = typeof themeOptions[number][0];

export default function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const currentUser = useStore((s) => s.user);
  const [sidebarAutoPeek, setSidebarAutoPeek] = useState(true);

  useEffect(() => {
    try { setSidebarAutoPeek(localStorage.getItem('nocap-sidebar-auto-peek') !== '0'); } catch {}
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
        <div><div className="account-eyebrow">Workspace controls</div><h1>Settings</h1><p>Shape how NO CAP looks, behaves and syncs.</p></div>
        <Link href="/settings/sync" className="settings-guide-button"><ShieldCheck className="h-4 w-4" /> Setup & sync guide</Link>
      </div>

      <div className="settings-layout">
        <aside className="settings-index">
          <a href="#appearance" className="is-active">Appearance</a>
          <a href="#learning">Learning</a>
          <a href="#account">Account & sync</a>
          <a href="#data">Data</a>
        </aside>

        <div className="settings-content">
          <section id="appearance" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><Palette className="h-4 w-4" /></div><div><h2>Appearance</h2><p>Keep the workspace calm, readable and easy on the eyes.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {themeOptions.map(([value, label, hint]) => (
                  <button key={value} onClick={() => setTheme(value as Theme)} className={cn('theme-choice', theme === value && 'theme-choice--active')} aria-pressed={theme === value}>
                    <span className={cn('theme-swatch', `theme-swatch--${value}`)} />
                    <span className="min-w-0 flex-1 text-left"><span className="block text-xs font-semibold text-text-primary">{label}</span><span className="mt-0.5 block text-[10px] text-text-muted">{hint}</span></span>
                  </button>
                ))}
              </div>
            </Surface>
          </section>

          <section id="learning" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><Focus className="h-4 w-4" /></div><div><h2>Learning</h2><p>Control focus mode and your local learning data.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              <div className="settings-row"><div><div className="text-sm font-semibold text-text-primary">Focus mode</div><div className="mt-1 text-xs text-text-muted">Hide navigation and secondary chrome while reading a deep lesson.</div></div><button type="button" onClick={() => setFocusMode(!focusMode)} className={cn('focus-toggle', focusMode && 'focus-toggle--on')} role="switch" aria-checked={focusMode} aria-label="Toggle focus mode"><span className="focus-toggle__thumb" /></button></div>
              <div className="settings-hint"><WandSparkles className="h-3.5 w-3.5" /> Press <kbd>F</kbd> anywhere outside a text field.</div>
              <div className="settings-row mt-3 border-t border-border pt-4"><div><div className="text-sm font-semibold text-text-primary">Auto-hide sidebar</div><div className="mt-1 text-xs text-text-muted">Keep a slim navigation rail and expand it only when your pointer reaches the edge, like a browser side tab.</div></div><button type="button" onClick={() => setSidebarMode(!sidebarAutoPeek)} className={cn('focus-toggle', sidebarAutoPeek && 'focus-toggle--on')} role="switch" aria-checked={sidebarAutoPeek} aria-label="Toggle auto-hide sidebar"><span className="focus-toggle__thumb" /></button></div>
            </Surface>
          </section>

          <section id="account" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><Cloud className="h-4 w-4" /></div><div><h2>Account & sync</h2><p>Connect once and carry your learning to another device.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              {isAuthenticated ? (
                <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">{currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="font-semibold">{currentUser?.name?.slice(0, 1) || 'N'}</span>}</div><div className="min-w-0"><div className="truncate text-sm font-semibold text-text-primary">{currentUser?.name || currentUser?.email}</div><div className="truncate text-xs text-text-muted">{currentUser?.email}</div></div></div><div className="flex items-center gap-2"><Badge variant="success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Cloud sync active</Badge><Link href="/account" className="settings-secondary-button">Account</Link></div></div>
              ) : (
                <div><div className="flex items-start gap-3"><div className="settings-cloud-icon"><CloudOff className="h-4 w-4" /></div><div><div className="text-sm font-semibold text-text-primary">Local for now</div><p className="mt-1 text-xs leading-relaxed text-text-muted">Your learning stays on this device until you connect an account. GitHub is the easiest no-domain route.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={authUrl('github')} className="provider-button provider-button--github"><Github className="h-4 w-4" /> Continue with GitHub</a><a href={authUrl('google')} className="provider-button"><Chrome className="h-4 w-4" /> Continue with Google</a></div><Link href="/settings/sync" className="mt-4 inline-flex items-center text-xs font-semibold text-accent hover:underline">See the no-domain setup steps →</Link></div>
              )}
            </Surface>
          </section>

          <section id="data" className="settings-section">
            <div className="settings-section-head"><div className="settings-section-icon"><RotateCcw className="h-4 w-4" /></div><div><h2>Data</h2><p>Reset learning signals without destroying your study library.</p></div></div>
            <Surface variant="solid" className="settings-card p-5">
              <div className="settings-row"><div><div className="text-sm font-semibold text-text-primary">Reset learning progress</div><div className="mt-1 text-xs leading-relaxed text-text-muted">Clears mastery, review queue, attempts, streak and learning history. Notes, highlights, bookmarks and confusing items remain.</div></div><Button variant="danger" size="sm" onClick={() => { if (window.confirm('Reset all learning progress? This cannot be undone.')) useStore.getState().resetLearningProgress(); }}>Reset</Button></div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-text-primary">Backup your workspace</div><div className="mt-1 text-xs text-text-muted">Download a portable JSON backup of progress, notes, highlights, bookmarks and settings.</div></div><Button variant="ghost" size="sm" onClick={() => { const s = useStore.getState(); const payload = { exported_at: new Date().toISOString(), version: 2, state: { mastery: s.mastery, review_items: s.review_items, attempts: s.attempts, streak: s.streak, notes: s.notes, highlights: s.highlights, bookmarks: s.bookmarks, workspace_notes: s.workspace_notes, confusing_concepts: s.confusing_concepts, theme: s.theme } }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nocap-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }}><Download className="h-3.5 w-3.5"/> Export backup</Button></div>
                {isAuthenticated && <div className="mt-4"><Button variant="ghost" size="sm" onClick={async () => { await logoutCurrentUser().catch(() => undefined); useStore.getState().signOut(); }}>Sign out</Button></div>}
              </div>
            </Surface>
          </section>
        </div>
      </div>
    </div>
  );
}
