'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusy(true);
    const id = window.setTimeout(() => setBusy(false), 180);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return <div className="route-transition-wrap">{busy && <div className="route-progress" aria-hidden />}<div className="route-page">{children}</div></div>;
}
