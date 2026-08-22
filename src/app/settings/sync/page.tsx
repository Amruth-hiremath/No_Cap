'use client';

import { Check, Cloud, ExternalLink, Github, Globe2, KeyRound, Server, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Surface } from '@/components/ui/Surface';
import { useStore } from '@/lib/store';

const steps = [
  { n: '01', title: 'Create a free Cloudflare account', body: 'You do not need to buy a domain. Cloudflare can give the Worker a workers.dev URL and Pages a pages.dev URL.', icon: Globe2 },
  { n: '02', title: 'Deploy the NO CAP frontend', body: 'Build the static Next.js export and publish it to Cloudflare Pages. Your app will receive a free pages.dev address.', icon: Server },
  { n: '03', title: 'Deploy the API Worker + D1', body: 'Create the D1 database, run the migrations, then deploy the Worker. Keep the Worker on its free workers.dev address.', icon: Cloud },
  { n: '04', title: 'Create your OAuth apps', body: 'Register GitHub and/or Google web OAuth clients. Point their callback URL at your public NO CAP origin so the browser stays on the same site.', icon: KeyRound },
  { n: '05', title: 'Connect the frontend to the API', body: 'Set the frontend API URL and the Worker FRONTEND_ORIGIN / APP_ORIGIN values. The included Pages proxy keeps authentication on the same origin.', icon: ShieldCheck },
  { n: '06', title: 'Sign in and verify sync', body: 'Open NO CAP, sign in, create a note, refresh, then open the app on another device. Your D1-backed state should return.', icon: Check },
];

export default function SyncSetupPage() {
  const user = useStore((s) => s.user);
  return (
    <div className="setup-page">
      <div className="setup-hero"><div className="setup-brand"><span className="setup-brand__mark"><img src="/brand/no-cap-mark-128.png" alt="" width={32} height={32} /></span><span>NO CAP</span></div><div className="account-eyebrow">Setup guide</div><h1>Connect your workspace.</h1><p>Your public workspace is live on Cloudflare. Connect OAuth and D1 to keep progress, notes and reviews synced across devices.</p></div>

      <div className="setup-grid">
        <div className="space-y-3">
          {steps.map((step) => { const Icon = step.icon; return <Surface key={step.n} variant="solid" className="setup-step"><div className="setup-step__num">{step.n}</div><div className="setup-step__icon"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><h2>{step.title}</h2><p>{step.body}</p></div></Surface>; })}
        </div>

        <div className="space-y-4">
          <Surface variant="solid" className="setup-card"><div className="section-kicker">What you need</div><div className="mt-3 space-y-2 text-xs text-text-secondary"><div className="setup-check"><Check className="h-3.5 w-3.5" /> Free Cloudflare account</div><div className="setup-check"><Check className="h-3.5 w-3.5" /> GitHub account (recommended for no-domain auth)</div><div className="setup-check"><Check className="h-3.5 w-3.5" /> Optional Google Cloud project for Google Sign-In</div><div className="setup-check"><Check className="h-3.5 w-3.5" /> Your Cloudflare account ID</div></div></Surface>

          <Surface variant="solid" className="setup-card"><div className="section-kicker">Exact callback shape</div><p className="mt-2 text-xs leading-relaxed text-text-muted">The production callback should point at your Pages URL, not the Worker URL.</p><div className="mt-3 space-y-2 font-mono text-[11px] text-text-primary"><div className="code-line">https://no-cap.pages.dev/auth/callback/github</div><div className="code-line">https://no-cap.pages.dev/auth/callback/google</div></div></Surface>

          <Surface variant="solid" className="setup-card border-warning/30"><div className="flex items-start gap-3"><div className="setup-warning-icon">!</div><div><div className="text-sm font-semibold text-text-primary">Important Google note</div><p className="mt-1 text-xs leading-relaxed text-text-muted">A completely public Google OAuth production app can require domain verification and a verified homepage. Without a domain, use Google in testing/personal-use mode for a small set of users; GitHub is the cleanest no-domain production path.</p></div></div></Surface>

          <Surface variant="solid" className="setup-card"><div className="section-kicker">Where to start</div><div className="mt-3 space-y-2"><a className="setup-link" href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer"><Cloud className="h-4 w-4" /> Cloudflare dashboard <ExternalLink className="ml-auto h-3.5 w-3.5" /></a><a className="setup-link" href="https://github.com/settings/developers" target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> GitHub OAuth apps <ExternalLink className="ml-auto h-3.5 w-3.5" /></a><a className="setup-link" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"><KeyRound className="h-4 w-4" /> Google OAuth credentials <ExternalLink className="ml-auto h-3.5 w-3.5" /></a></div></Surface>

          <Link href={user ? '/account' : '/login'} className="setup-cta">{user ? 'Back to account' : 'Sign in to NO CAP'} <span>→</span></Link>
        </div>
      </div>

      <Surface variant="solid" className="mt-6 p-5"><div className="section-kicker">Deployment commands</div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div><div className="text-xs font-semibold text-text-primary">Worker</div><pre className="setup-code">{`cd worker\nnpx wrangler d1 create nocap\nnpx wrangler d1 migrations apply nocap --remote\nnpx wrangler secret put GITHUB_CLIENT_ID\nnpx wrangler secret put GITHUB_CLIENT_SECRET\nnpx wrangler secret put GOOGLE_CLIENT_ID\nnpx wrangler secret put GOOGLE_CLIENT_SECRET\nnpx wrangler secret put FRONTEND_ORIGIN\nnpx wrangler secret put APP_ORIGIN\nnpx wrangler deploy`}</pre></div><div><div className="text-xs font-semibold text-text-primary">Pages</div><pre className="setup-code">{`npm install\nnpm run build\n# Push to GitHub and connect the repo to Cloudflare Pages\n# Build command: npm run build\n# Build output: out\n# Pages Function secret: NO_CAP_API_URL=<worker-workers.dev-url>`}</pre></div></div></Surface>

      <p className="mt-4 text-[11px] leading-relaxed text-text-muted">This guide uses Cloudflare's free Pages static hosting, a workers.dev Worker endpoint and D1's Workers Free allocation. Free usage is quota-bound, so the app should remain within those limits for personal/small-scale use.</p>
    </div>
  );
}
