'use client';

import {
  Github,
  Monitor,
  Moon,
  Sun,
  Shield,
  Cpu,
  Database,
  HardDrive,
  Activity,
  Cloud,
  CloudOff,
  Info,
} from 'lucide-react';
import { Surface, SectionHeader } from '@/components/ui/Surface';
import { AccentRule } from '@/components/ui/AccentRule';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const themeOptions = [
  { value: 'system' as const, label: 'System', icon: Monitor },
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export default function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const focusMode = useStore((s) => s.focus_mode);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h1>
        <AccentRule className="mt-3" />
      </div>

      {/* Mode indicator — local vs synced */}
      <Surface variant="inset" className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
            {isAuthenticated ? (
              <Cloud className="h-4 w-4 text-accent-2" />
            ) : (
              <CloudOff className="h-4 w-4 text-text-muted" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {isAuthenticated ? 'Synced mode' : 'Local mode'}
              </span>
              <Badge variant={isAuthenticated ? 'success' : 'default'}>
                {isAuthenticated ? 'Cloud sync active' : 'localStorage only'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {isAuthenticated
                ? 'Your progress, mastery, and review schedule sync to Cloudflare D1. Available across devices.'
                : 'All progress is stored in this browser. No account needed. Wire up the Worker to enable cross-device sync.'}
            </p>
          </div>
        </div>
      </Surface>

      {/* Appearance — theme */}
      <Surface variant="solid" className="p-5">
        <SectionHeader
          eyebrow="Appearance"
          title="Theme"
          description="Follows system by default. No flash on reload."
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-all',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-secondary hover:border-border-strong'
                )}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </Surface>

      {/* Focus mode toggle */}
      <Surface variant="solid" className="p-5">
        <SectionHeader
          eyebrow="Learning"
          title="Focus mode"
          description="Distraction-free surface with Pomodoro timer. Hides sidebar and top bar."
        />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-text-primary">
              {focusMode ? 'Active' : 'Inactive'}
            </span>
            <p className="text-xs text-text-muted">
              Toggle with the focus button in the top bar, or press <kbd className="rounded border border-border bg-surface-inset px-1 text-[10px]">F</kbd> on any concept page.
            </p>
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              focusMode ? 'bg-accent' : 'bg-border-strong'
            )}
            role="switch"
            aria-checked={focusMode}
            aria-label="Toggle focus mode"
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                focusMode ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </Surface>

      {/* Account / Auth */}
      <Surface variant="solid" className="p-5">
        <SectionHeader
          eyebrow="Account"
          title="Authentication"
          description="GitHub OAuth for single-user sync. Optional — local mode works without it."
        />
        <div className="mt-4">
          {isAuthenticated ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-inset p-3">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-text-secondary" />
                <span className="text-sm text-text-primary">Signed in</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => useStore.getState().signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <div>
              <div className="rounded-lg border border-dashed border-border bg-surface-inset p-4">
                <div className="flex items-center gap-2 text-text-muted">
                  <Github className="h-4 w-4" />
                  <span className="text-sm">Not connected</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Wire up the Cloudflare Worker to enable GitHub OAuth. Until then, your
                  progress stays in localStorage — which is perfectly fine for a personal app.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="mt-3 opacity-50" disabled>
                <Github className="h-3.5 w-3.5" /> Connect GitHub (requires Worker)
              </Button>
            </div>
          )}
        </div>
      </Surface>

      {/* System Health — honest, no fake zeros */}
      <Surface variant="solid" className="p-5">
        <SectionHeader
          eyebrow="System Health"
          title="Platform status"
          description={isAuthenticated ? 'Live Cloudflare free-tier quota.' : 'Not connected to cloud infrastructure.'}
          icon={<Activity className="h-3.5 w-3.5" />}
          action={
            <Badge variant={isAuthenticated ? 'success' : 'default'}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isAuthenticated ? 'bg-success' : 'bg-text-faint')} />
              {isAuthenticated ? 'healthy' : 'local'}
            </Badge>
          }
        />
        {isAuthenticated ? (
          <>
            <div className="mt-4 space-y-3">
              <QuotaRow icon={Cpu} label="Worker requests" used={0} limit={100_000} unit="req" />
              <QuotaRow icon={Database} label="D1 rows read" used={0} limit={5_000_000} unit="rows" />
              <QuotaRow icon={HardDrive} label="R2 storage" used={0} limit={10 * 1024} unit="MB" />
              <QuotaRow icon={Cpu} label="Workers AI neurons" used={0} limit={10_000} unit="neurons" tier="C" />
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface-inset p-3 text-xs text-text-muted">
              <Shield className="mr-1 inline h-3 w-3" />
              No paid dependency. No accidental billing. Core learning remains usable at free-tier exhaustion.
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-inset p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
              <div className="text-xs text-text-muted">
                <p className="font-medium text-text-secondary">Running in local mode.</p>
                <p className="mt-1">
                  No cloud quota to display. Your data lives in <code className="rounded bg-surface px-1 py-0.5 text-accent">localStorage</code> under
                  the key <code className="rounded bg-surface px-1 py-0.5 text-accent">nocap-state-v0.2</code>.
                  Clear it to reset all progress.
                </p>
                <p className="mt-2">
                  When the Worker is wired up, this panel shows real Cloudflare free-tier usage with fail-closed quota guards.
                </p>
              </div>
            </div>
          </div>
        )}
      </Surface>

      {/* About */}
      <Surface variant="solid" className="p-5">
        <SectionHeader eyebrow="About" title="NO CAP v0.1" description="The Learning Engine" />
        <div className="mt-3 space-y-1 text-sm text-text-secondary">
          <p>A purpose-built system-design learning cockpit.</p>
          <p className="text-xs text-text-muted">
            Personal app · Cloudflare-native architecture · zero-cost · PWA installable
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border bg-surface-inset p-2">
            <span className="text-text-muted">Next.js</span>
            <span className="ml-1 font-medium text-text-primary">16.3</span>
          </div>
          <div className="rounded-lg border border-border bg-surface-inset p-2">
            <span className="text-text-muted">Tailwind</span>
            <span className="ml-1 font-medium text-text-primary">4.0</span>
          </div>
          <div className="rounded-lg border border-border bg-surface-inset p-2">
            <span className="text-text-muted">Storage</span>
            <span className="ml-1 font-medium text-text-primary">D1 / localStorage</span>
          </div>
          <div className="rounded-lg border border-border bg-surface-inset p-2">
            <span className="text-text-muted">Deploy</span>
            <span className="ml-1 font-medium text-text-primary">Cloudflare Pages</span>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function QuotaRow({
  icon: Icon,
  label,
  used,
  limit,
  unit,
  tier,
}: {
  icon: typeof Cpu;
  label: string;
  used: number;
  limit: number;
  unit: string;
  tier?: string;
}) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const color = pct > 95 ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success';
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            {label} {tier && <Badge variant="default">Tier {tier}</Badge>}
          </span>
          <span className="tnum text-xs text-text-muted">
            {used.toLocaleString()} / {limit.toLocaleString()} {unit}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-inset">
          <div className={cn('h-full', color)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
