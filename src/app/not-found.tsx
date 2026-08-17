import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
      <Link href="/concepts" className="mt-6">
        <Button>
          <Home className="h-4 w-4" /> Back to library
        </Button>
      </Link>
    </div>
  );
}
