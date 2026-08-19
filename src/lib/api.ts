export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

// Production uses the same-origin Pages Function proxy by default. A separate
// API host is still supported for local development or direct Worker testing.

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
}

export function authUrl(provider: 'google' | 'github'): string {
  return apiUrl(`/auth/login?provider=${encodeURIComponent(provider)}`);
}

export async function fetchCurrentUser() {
  const response = await fetch(apiUrl('/auth/me'), { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error(`Auth request failed: ${response.status}`);
  return response.json() as Promise<{ user: { id: number; email: string; name: string; avatar_url?: string; auth_provider: string; timezone: string; onboarding_completed: boolean } | null }>;
}

export async function logoutCurrentUser() {
  await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
}

export async function updateProfile(payload: Record<string, unknown>) {
  const response = await fetch(apiUrl('/v1/profile'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Profile update failed: ${response.status}`);
  return response.json();
}
