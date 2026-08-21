'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Cloud, Github, LogOut, Mail, Save, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { updateProfile, logoutCurrentUser } from '@/lib/api';
import { useSync } from '@/lib/useSync';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';

export default function AccountPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const setAuthState = useStore((s) => s.setAuthState);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [saved, setSaved] = useState(false);
  const { status, lastSynced } = useSync();

  useEffect(() => {
    if (!hydrated) return;
    setName(user?.name ?? '');
    try {
      setTimezone(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    } catch {
      setTimezone(user?.timezone || 'UTC');
    }
  }, [hydrated, user?.id, user?.name, user?.timezone]);

  async function save() {
    if (!user) return;
    setSaved(false);
    const result = await updateProfile({ name: name.trim() || 'NO CAP learner', timezone });
    setAuthState(result.user);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function logout() {
    await logoutCurrentUser().catch(() => undefined);
    setAuthState(null);
    router.replace('/');
  }

  if (!hydrated) return <div className="page-loading" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-hero account-hero--guest">
          <div className="account-brand-orb"><img src="/brand/no-cap-logo.png" alt="" /></div>
          <div className="min-w-0">
            <div className="account-eyebrow">Account</div>
            <h1>Keep your learning with you.</h1>
            <p>Sign in once and NO CAP can sync progress, reviews, notes, highlights and bookmarks across your devices.</p>
          </div>
        </div>
        <Surface variant="solid" className="account-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="text-sm font-semibold text-text-primary">Ready to connect?</div><div className="mt-1 text-xs leading-relaxed text-text-muted">Connect an account to sync your learning across browsers and devices. GitHub and Google are supported.</div></div>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-text-inverse hover:-translate-y-px transition-transform">Sign in <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Surface>
        <div className="grid gap-4 md:grid-cols-2">
          <Surface variant="solid" className="account-card p-5">
            <div className="flex items-center gap-3"><div className="account-card-icon"><Cloud className="h-4 w-4" /></div><div><div className="text-sm font-semibold">Read first, sync when ready</div><div className="mt-1 text-xs text-text-muted">Explore the curriculum freely, then sign in to carry your learning history everywhere.</div></div></div>
          </Surface>
          <Surface variant="solid" className="account-card p-5">
            <div className="flex items-center gap-3"><div className="account-card-icon"><ShieldCheck className="h-4 w-4" /></div><div><div className="text-sm font-semibold">Private by design</div><div className="mt-1 text-xs text-text-muted">OAuth secrets stay on the backend. Your learning state belongs to your account.</div></div></div>
          </Surface>
        </div>
      </div>
    );
  }

  const providerLabel = user.auth_provider === 'google' ? 'Google' : 'GitHub';
  const syncLabel = status === 'synced' ? 'Synced' : status === 'syncing' ? 'Syncing' : status === 'offline' ? 'Offline' : 'Connected';

  return (
    <div className="account-page">
      <div className="account-hero">
        <div className="account-avatar-large">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="account-eyebrow">Your account</div>
          <div className="flex flex-wrap items-center gap-2"><h1>{user.name || 'NO CAP learner'}</h1><Badge variant="success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> {syncLabel}</Badge></div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted"><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span><span>•</span><span>{providerLabel} identity</span></div>
        </div>
        <Link href="/settings" className="account-hero-link"><Settings className="h-4 w-4" /> Settings</Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Surface variant="solid" className="account-card p-6">
          <div className="section-kicker">Profile</div>
          <h2 className="mt-1 text-lg font-semibold">How NO CAP knows you</h2>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">Keep your display name and timezone accurate so streaks, Daily Dose and review scheduling stay consistent.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="field-label">Display name</span><input value={name} onChange={(e) => setName(e.target.value)} className="field-input" /></label>
            <label className="block"><span className="field-label">Timezone</span><input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="field-input" /></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs text-success">{saved ? <><Check className="mr-1 inline h-3.5 w-3.5" /> Saved</> : 'Changes sync automatically after save.'}</span><Button onClick={save}><Save className="h-3.5 w-3.5" /> Save changes</Button></div>
        </Surface>

        <Surface variant="solid" className="account-card p-6">
          <div className="section-kicker">Sync</div>
          <h2 className="mt-1 text-lg font-semibold">Your learning, everywhere</h2>
          <div className="mt-5 rounded-2xl border border-border bg-surface-inset p-4">
            <div className="flex items-center gap-3"><div className="account-card-icon"><Cloud className="h-4 w-4" /></div><div className="min-w-0"><div className="text-sm font-semibold">Cloud sync</div><div className="text-xs text-text-muted">{lastSynced ? `Last synced ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : 'Waiting for first sync.'}</div></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="account-metric"><div className="text-sm font-semibold">Mastery</div><div className="text-[10px] text-text-muted">progress</div></div><div className="account-metric"><div className="text-sm font-semibold">Reviews</div><div className="text-[10px] text-text-muted">schedule</div></div><div className="account-metric"><div className="text-sm font-semibold">Notes</div><div className="text-[10px] text-text-muted">library</div></div></div>
          </div>
          <Link href="/settings/sync" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline">Open setup & sync guide <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Surface>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Surface variant="solid" className="account-card p-6"><div className="section-kicker">Identity</div><h2 className="mt-1 text-lg font-semibold">Connected provider</h2><div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-inset p-4"><div className="account-card-icon">{providerLabel === 'Google' ? <span className="text-sm font-bold">G</span> : <Github className="h-4 w-4" />}</div><div><div className="text-sm font-semibold">{providerLabel}</div><div className="text-xs text-text-muted">Used only for sign-in and basic profile information.</div></div></div></Surface>
        <Surface variant="solid" className="account-card p-6 border-danger/20"><div className="section-kicker text-danger">Session</div><h2 className="mt-1 text-lg font-semibold">Sign out</h2><p className="mt-2 text-xs leading-relaxed text-text-muted">Your server data stays in the account. Device cache is cleared on sign out to prevent cross-account leakage.</p><Button variant="danger" className="mt-4" onClick={logout}><LogOut className="h-3.5 w-3.5" /> Sign out</Button></Surface>
      </div>
    </div>
  );
}
