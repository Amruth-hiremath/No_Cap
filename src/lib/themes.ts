/**
 * NO CAP — theme registry (single source of truth).
 *
 * Used by:
 *   - src/lib/store.ts (Theme type)
 *   - src/components/shell/ThemeBootstrap.tsx (applyTheme)
 *   - src/app/layout.tsx (boot script, mirrored inline)
 *   - src/app/settings/page.tsx (theme picker UI)
 *   - src/components/concept/MermaidBlock.tsx (mermaid themeVariables)
 *
 * The boot script in layout.tsx is inlined as a string for SSR — it must
 * stay in sync with `LIGHT_THEMES`, `DARK_THEMES`, and `DEFAULT_THEME`
 * below. The exported `themeGroups` array is the canonical UI list.
 *
 * Theme tokens are defined in globals.css under `html[data-theme='<id>']`.
 *
 * Adding a new theme:
 *   1. Add the theme ID to LIGHT_THEMES or DARK_THEMES below.
 *   2. Add a matching `html[data-theme='<id>'] { ... }` block in globals.css
 *      with all 19 semantic tokens (--bg, --surface, --accent, etc.).
 *   3. Run `npm run type-check` then `npm run build` to verify.
 */

export type ThemeId =
  | 'sage'        | 'cyan'      | 'coffee'      | 'sand'
  | 'forest'      | 'cyan-night' | 'coffee-dark' | 'slate';

export const LIGHT_THEMES: ThemeId[] = ['sage', 'cyan', 'coffee', 'sand'];
export const DARK_THEMES:  ThemeId[] = ['forest', 'cyan-night', 'coffee-dark', 'slate'];

export const DEFAULT_THEME: ThemeId = 'sage';

export function isDarkTheme(t: ThemeId): boolean {
  return DARK_THEMES.includes(t);
}

export function resolveColorScheme(t: ThemeId): 'light' | 'dark' {
  return isDarkTheme(t) ? 'dark' : 'light';
}

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  group: 'light' | 'dark';
  /** Three swatch colors shown in the settings picker: bg, surface, accent. */
  swatches: { bg: string; surface: string; accent: string; text: string };
  hint: string;
}

/**
 * The canonical theme picker list. Order within each group matters — this
 * is the order shown in Settings → Appearance.
 */
export const themeGroups: { light: ThemeMeta[]; dark: ThemeMeta[] } = {
  light: [
    {
      id: 'sage',
      label: 'Sage',
      group: 'light',
      swatches: { bg: '#eef2eb', surface: '#f8faf7', accent: '#4d6b4f', text: '#182119' },
      hint: 'Soft light green · default',
    },
    {
      id: 'cyan',
      label: 'Cyan',
      group: 'light',
      swatches: { bg: '#eef4f6', surface: '#f6fbfc', accent: '#0e7490', text: '#0d1f24' },
      hint: 'Pale cyan · cool neutral',
    },
    {
      id: 'coffee',
      label: 'Coffee',
      group: 'light',
      swatches: { bg: '#f4ece1', surface: '#fbf5ec', accent: '#6f4518', text: '#1f140c' },
      hint: 'Warm paper · espresso accent',
    },
    {
      id: 'sand',
      label: 'Sand',
      group: 'light',
      swatches: { bg: '#f6efde', surface: '#fbf6e9', accent: '#7a6321', text: '#1f1810' },
      hint: 'Parchment · muted olive gold',
    },
  ],
  dark: [
    {
      id: 'forest',
      label: 'Forest',
      group: 'dark',
      swatches: { bg: '#131713', surface: '#1b211b', accent: '#7ba787', text: '#e6ede0' },
      hint: 'Dark green · graphite · sage accent',
    },
    {
      id: 'cyan-night',
      label: 'Cyan Night',
      group: 'dark',
      swatches: { bg: '#0d1418', surface: '#15202a', accent: '#5eb8d3', text: '#dde6ec' },
      hint: 'Charcoal blue · restrained cyan',
    },
    {
      id: 'coffee-dark',
      label: 'Coffee Dark',
      group: 'dark',
      swatches: { bg: '#1a1410', surface: '#241c15', accent: '#e0b070', text: '#f0e4d0' },
      hint: 'Espresso · warm cream accent',
    },
    {
      id: 'slate',
      label: 'Slate',
      group: 'dark',
      swatches: { bg: '#0f1316', surface: '#181d22', accent: '#8aa0a6', text: '#dde3e8' },
      hint: 'Neutral charcoal · cool muted accent',
    },
  ],
};

/** All themes flattened (light first, then dark) — used by tests + boot script generation. */
export const allThemes: ThemeMeta[] = [...themeGroups.light, ...themeGroups.dark];

/** Set of valid theme IDs — used by boot script for fast validation. */
export const THEME_IDS: readonly ThemeId[] = allThemes.map((t) => t.id);

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return allThemes.find((t) => t.id === id) ?? allThemes[0];
}
