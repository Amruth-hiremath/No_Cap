'use client';
import { BrandLogo } from '@/components/ui/BrandLogo';

import { Github, Chrome, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { authUrl } from '@/lib/api';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-primary"><ArrowLeft className="h-3.5 w-3.5"/> Back to NO CAP</Link>
        <div className="mt-6 rounded-3xl border border-border bg-surface-elevated p-6 shadow-xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark brand-mark--lg" aria-hidden><BrandLogo size={128} alt="" className="h-12 w-12" /></div>
            <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">NO CAP</div><div className="mt-0.5 text-sm text-text-muted">System design, without the fluff.</div></div>
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-text-primary">Save your learning across devices.</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">Sync progress, reviews, notes, highlights and bookmarks. You can explore the curriculum before signing in. Your saved learning syncs once you connect an account.</p>
          <div className="mt-6 space-y-2.5">
            <a href={authUrl('google')} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-text-primary transition-all hover:-translate-y-px hover:bg-surface-subtle"><Chrome className="h-4 w-4"/> Continue with Google</a>
            <a href={authUrl('github')} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-text-primary px-4 text-sm font-semibold text-text-inverse transition-all hover:-translate-y-px hover:bg-text-secondary"><Github className="h-4 w-4"/> Continue with GitHub</a>
          </div>
          <div className="mt-5 rounded-xl border border-accent/20 bg-accent-soft/35 p-3 text-xs leading-relaxed text-text-secondary"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-accent"/> NO CAP uses secure server-side sessions. OAuth client secrets never ship to the browser.</div>
          <p className="mt-5 text-center text-[11px] text-text-muted">You can explore the full curriculum without an account. Sign in when you are ready to sync progress, reviews, notes and bookmarks across devices.</p>
        </div>
      </div>
    </div>
  );
}
