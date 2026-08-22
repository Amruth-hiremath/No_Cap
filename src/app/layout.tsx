import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';
import { ThemeBootstrap } from '@/components/shell/ThemeBootstrap';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://no-cap.pages.dev';

export const metadata: Metadata = {
  title: {
    default: 'NO CAP — Design it. Break it. Scale it.',
    template: '%s · NO CAP',
  },
  description:
    'A purpose-built system-design learning cockpit. Learn a concept, see how it behaves, test your understanding, build mastery.',
  manifest: '/manifest.json',
  applicationName: 'NO CAP',
  authors: [{ name: 'NO CAP' }],
  keywords: ['system design', 'system design course', 'system design interview', 'distributed systems', 'software architecture', 'scalability', 'backend architecture'],
  category: 'education',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NO CAP — System Design Workspace',
    description: 'Learn, visualize, practice and design real distributed systems.',
    type: 'website',
    siteName: 'NO CAP',
    url: siteUrl,
    images: [
      { url: '/brand/no-cap-mark-256.png', width: 256, height: 256, alt: 'NO CAP' },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'NO CAP — System Design Workspace',
    description: 'Learn system design by understanding, visualizing and designing it.',
    images: ['/brand/no-cap-mark-256.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
  //
  // IMPORTANT: This script must stay in sync with src/lib/themes.ts.
  // The list of valid theme IDs is hardcoded here because this script
  // runs before any module loads. If you add a theme, update BOTH files.
  const themeBoot = `(function(){
    try {
      var VALID = {'sage':1,'cyan':1,'coffee':1,'sand':1,'forest':1,'cyan-night':1,'coffee-dark':1,'slate':1};
      var DARK   = {'forest':1,'cyan-night':1,'coffee-dark':1,'slate':1};
      var s = localStorage.getItem('nocap-state-v0.2');
      var t = 'sage';
      if (s) {
        try {
          var p = JSON.parse(s);
          var pt = p && p.state && p.state.theme;
          if (pt && VALID[pt]) t = pt;
          else if (pt === 'dark') t = 'forest'; /* legacy v3 dark */
        } catch (e) {}
      }
      document.documentElement.setAttribute('data-theme', t);
      var isDark = !!DARK[t];
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      document.documentElement.dataset.themeDark = isDark ? '1' : '0';
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'sage');
      document.documentElement.style.colorScheme = 'light';
      document.documentElement.dataset.themeDark = '0';
    }
  })();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBoot }} /></head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <ThemeBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
