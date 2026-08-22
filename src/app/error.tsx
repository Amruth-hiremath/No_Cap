'use client';
import { BrandLogo } from '@/components/ui/BrandLogo';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the error to dev tooling only — production users get a clean
    // recovery UI instead of a noisy console stack trace.
    if (process.env.NODE_ENV !== 'production') console.error(error);
  }, [error]);
  return (
    <main className="min-h-screen grid place-items-center px-6 bg-app">
      <div className="max-w-md text-center">
        <BrandLogo size={128} alt="NO CAP" className="mx-auto h-12 w-12 rounded-2xl object-contain p-1.5" />
        <h1 className="mt-5 text-2xl font-bold text-text-primary">Something went sideways.</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">Your learning data is preserved. Try the page again, or return to Today.</p>
        <div className="mt-6 flex justify-center gap-2"><button className="notes-new-btn" onClick={() => reset()}>Try again</button><a className="notes-secondary-btn" href="/">Go home</a></div>
      </div>
    </main>
  );
}
