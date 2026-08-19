'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchCurrentUser } from './api';
import { useStore } from './store';

export function useAuthBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const setAuthState = useStore((s) => s.setAuthState);
  const authLoaded = useStore((s) => s.auth_loaded);

  useEffect(() => {
    let cancelled = false;
    if (authLoaded) return;
    (async () => {
      try {
        const data = await fetchCurrentUser();
        if (cancelled) return;
        setAuthState(data.user);
        if (data.user?.onboarding_completed === false && pathname !== '/onboarding') {
          router.replace('/onboarding');
        }
      } catch {
        if (!cancelled) setAuthState(null);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoaded, pathname, router, setAuthState]);
}
