import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';
import { ThemeBootstrap } from '@/components/shell/ThemeBootstrap';

export const metadata: Metadata = {
  title: 'NO CAP — Design it. Break it. Scale it.',
  description:
    'A purpose-built system-design learning cockpit. Learn a concept, see how it behaves, test your understanding, build mastery.',
  manifest: '/manifest.json',
  applicationName: 'NO CAP',
  authors: [{ name: 'NO CAP' }],
  keywords: ['system design', 'learning', 'interview prep', 'architecture', 'distributed systems'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f3ec' },
    { media: '(prefers-color-scheme: dark)', color: '#15130f' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline script applies the saved theme BEFORE React hydrates.
  // Prevents the flash of the wrong theme on first paint.
  const themeBoot = `(function(){try{var s=localStorage.getItem('nocap-state-v0.2');var t='system';if(s){var p=JSON.parse(s);t=p?.state?.theme||'system'}var r=t;if(r==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r}catch(e){}})();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
