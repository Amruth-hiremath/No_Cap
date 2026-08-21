'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Cloud, Target, Timer, Map, FlaskConical, RotateCcw, Library, Sparkles, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/lib/api';
import { useStore } from '@/lib/store';

const goals = ['System design interviews', 'Build stronger fundamentals', 'Design production systems', 'Cloud architecture'];
const pace = [15, 30, 45, 60];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const setOnboarding = useStore((s) => s.setOnboarding);
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(user?.goals ?? []);
  const [minutes, setMinutes] = useState(user?.weekly_minutes ?? 30);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (user?.onboarding_completed) router.replace('/'); }, [user?.onboarding_completed, router]);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const steps: { eyebrow: string; title: string; body: string; icon: LucideIcon }[] = useMemo(() => [
    { eyebrow: 'Welcome', title: `Let’s build your system-design edge, ${firstName}.`, body: 'NO CAP turns system design into a repeatable loop: learn, visualize, design, break, review.', icon: Target },
    { eyebrow: 'Your focus', title: 'What are you optimizing for?', body: 'Pick the outcomes that should influence your Daily Dose and recommendations.', icon: Cloud },
    { eyebrow: 'Your pace', title: 'How much time feels realistic?', body: 'This is used to keep Daily Dose sessions practical, not punishing.', icon: Timer },
    { eyebrow: 'Tour', title: 'Your new system-design cockpit.', body: 'Today is your guided home. Roadmap is the curriculum. Learn is the deep reading layer. Labs make systems interactive. Review keeps the memory alive. Library holds your notes and highlights.', icon: Sparkles },
  ], [firstName]);
  const current = steps[Math.min(step, steps.length - 1)];
  const Icon = current.icon;

  async function finish() {
    setSaving(true);
    const payload = { goals: selectedGoals, weekly_minutes: minutes, onboarding_complete: true, completed: true };
    setOnboarding(payload);
    try { if (user) await updateProfile(payload); } catch { /* keep local state and retry via sync */ }
    router.replace('/');
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted"><span>NO CAP setup</span><span>{step + 1}/{steps.length}</span></div>
        <div className="rounded-3xl border border-border bg-surface-elevated p-6 shadow-xl sm:p-9">
          <div className="brand-mark brand-mark--lg"><img src="/brand/no-cap-logo.png" alt="" /></div>
          <div className="mt-8 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon className="h-5 w-5"/></div>
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{current.eyebrow}</div>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-text-primary">{current.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">{current.body}</p>
          {step === 1 && (
            <div className="mt-7 grid gap-2 sm:grid-cols-2">{goals.map((goal) => { const active = selectedGoals.includes(goal); return <button key={goal} onClick={() => setSelectedGoals((g) => active ? g.filter(x=>x!==goal) : [...g, goal])} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all ${active ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text-secondary hover:border-border-strong'}`}><span>{goal}</span>{active && <Check className="h-4 w-4"/>}</button>})}</div>
          )}
          {step === 2 && (
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">{pace.map((m) => <button key={m} onClick={() => setMinutes(m)} className={`rounded-xl border p-4 text-center transition-all ${minutes === m ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text-secondary hover:border-border-strong'}`}><div className="text-lg font-semibold">{m}</div><div className="mt-1 text-[11px]">min/day</div></button>)}</div>
          )}
          {step === 3 && (
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              {([
                ['Today', 'Your guided daily session.', Target],
                ['Roadmap', 'The full curriculum and dependencies.', Map],
                ['Labs', 'Interactive system behavior.', FlaskConical],
                ['Review', 'Spaced repetition and mastery.', RotateCcw],
                ['Library', 'Notes, highlights and bookmarks.', Library],
                ['Learn', 'Deep, visual technical lessons.', Sparkles],
              ] as const).map(([label, copy, TourIcon]) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 transition-transform hover:-translate-y-px">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><TourIcon className="h-4 w-4" /></div>
                  <div><div className="text-sm font-semibold text-text-primary">{label}</div><div className="mt-0.5 text-xs leading-relaxed text-text-muted">{copy}</div></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <button onClick={async () => { if (step === 0) { setOnboarding({ completed: true }); try { if (user) await updateProfile({ onboarding_complete: true, completed: true, goals: selectedGoals, weekly_minutes: minutes }); } catch {} router.replace('/'); } else { setStep((s) => s - 1); } }} className="text-sm text-text-muted hover:text-text-primary">{step === 0 ? 'Skip for now' : 'Back'}</button>
            {step < steps.length - 1 ? <button onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-text-inverse transition-all hover:-translate-y-px hover:bg-accent-hover">Continue <ArrowRight className="h-4 w-4"/></button> : <button onClick={finish} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-text-inverse transition-all hover:-translate-y-px hover:bg-accent-hover disabled:opacity-60">{saving ? 'Saving…' : 'Enter NO CAP'} <ArrowRight className="h-4 w-4"/></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
