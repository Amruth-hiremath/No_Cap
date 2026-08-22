import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-text-primary">
        That concept doesn&apos;t exist.
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Maybe it hasn&apos;t been authored yet. Check the library.
      </p>
      <Link
        href="/concepts"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-text-inverse transition-all hover:bg-accent-hover border border-accent shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Home className="h-4 w-4" /> Back to library
      </Link>
    </div>
  );
}
