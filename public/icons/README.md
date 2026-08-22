# PWA Icons

Add these two PNG files here before deploying as a PWA:

- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px

Both should use the NO CAP warm palette:
- Background: `#FAF7F2` (warm cream)
- Foreground: `#B45309` (burnt amber) for the "NO CAP" wordmark or a simple geometric mark

You can generate them with any image editor, or use a tool like sharp/Pillow from a source SVG.

The `manifest.json` references these paths. Without them, PWA install will work but the icon will be a generic placeholder.
