import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@excalidraw/excalidraw/index.css';
import { AppShell } from '@/components/shell/AppShell';
import { ThemeBootstrap } from '@/components/shell/ThemeBootstrap';

export const metadata: Metadata = {
  title: 'NO CAP — Design it. Break it. Scale it.',
  description:
    'A purpose-built system-design learning cockpit. Learn a concept, see how it behaves, test your understanding, build mastery.',
  manifest: '/manifest.json',
  applicationName: 'NO CAP',
  authors: [{ name: 'NO CAP' }],
  keywords: ['system design', 'system design course', 'system design interview', 'distributed systems', 'software architecture', 'scalability', 'backend architecture'],
  category: 'education',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev'),
  openGraph: { title: 'NO CAP — System Design Workspace', description: 'Learn, visualize, practice and design real distributed systems.', type: 'website', siteName: 'NO CAP' },
  twitter: { card: 'summary_large_image', title: 'NO CAP — System Design Workspace', description: 'Learn system design by understanding, visualizing and designing it.' },
  icons: { icon: '/favicon.ico', shortcut: '/favicon.ico', apple: '/icons/icon-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef2eb' },
    { media: '(prefers-color-scheme: dark)', color: '#182119' },
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
  const themeBoot = `(function(){try{var s=localStorage.getItem('nocap-state-v0.2');var t='sage';if(s){var p=JSON.parse(s);t=p?.state?.theme||'sage'}var r=(t==='dark'||t==='charcoal')?'dark':'sage';document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r==='dark'?'dark':'light'}catch(e){document.documentElement.setAttribute('data-theme','sage');document.documentElement.style.colorScheme='light'}})();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBoot }} /></head>
      <body>
        <ThemeBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
