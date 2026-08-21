# NO CAP — Free-Tier Deployment Architecture

NO CAP is intentionally designed so the learning curriculum is served as static content and user state is the only part that needs the API/database layer.

## Runtime

- Next.js static export -> Cloudflare Pages
- `/auth/*` and `/v1/*` -> Pages Function proxy -> Cloudflare Worker
- Worker -> Cloudflare D1
- No Worker request is used for normal lesson/media/static asset delivery.

## Why this scales better on Free

1. Concept JSON is build-time content, not per-user API data.
2. Full concepts are loaded only on the concept route / when a practice item is opened.
3. Library/Roadmap/Progress/Search use the compact concept index.
4. Mermaid is dynamically loaded only when a diagram is rendered.
5. YouTube iframes are click-to-load.
6. Images use lazy loading and async decoding.
7. Static assets are long-cacheable and content-addressed.
8. Authenticated sync is debounced and rate-limited client + worker side.
9. Passive reading events, scroll position, theme and focus state do not trigger sync.
10. Sync writes are diffed to D1 instead of deleting/reinserting every row.
11. Failed/over-quota optional API features degrade without breaking the curriculum.

## Request discipline

Do not add polling loops. Do not call the Worker on page navigation. Do not use the Worker for concept rendering. Keep state mutations batched and debounced.

## D1 discipline

Read only the authenticated user's rows. Use indexed user_id columns. Avoid N+1 queries. Prefer one state read on session bootstrap and one debounced sync for multiple local mutations.

## Static delivery

Cloudflare Pages serves the generated site directly. The Worker proxy only receives `/auth/*` and `/v1/*` requests.

## Important

Free-tier survival means the app is deliberately optimized to stay efficient under the published limits; it does not mean unlimited traffic. When a hard quota is reached, optional or state-changing API requests should fail gracefully while static lessons remain available.
