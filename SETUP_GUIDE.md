# NO CAP — Zero-Cost Production Setup (Windows-first)

This is the **current, supported deployment path** for NO CAP.

The previous Cloudflare Worker path has been removed. The API is now a normal **JavaScript Cloudflare Worker**, so you do **not** need:

- Python
- uv
- Wrangler
- Pyodide
- WSL2

The stack is:

```text
Next.js static export
        ↓
Cloudflare Pages (*.pages.dev)
        ↓
Pages Functions proxy
        ↓
Cloudflare Worker (*.workers.dev)
        ↓
Cloudflare D1
```

Cloudflare supports JavaScript/TypeScript Workers directly with Wrangler, and D1 is exposed as `env.DB`. citeturn237632search0turn237632search1

## 1. Prerequisites

Install:

- Node.js 22 LTS
- Git
- a free Cloudflare account
- a GitHub account
- Google account only if you want Google sign-in

Verify:

```powershell
node -v
npm -v
```

No Python installation is required for NO CAP.

## 2. Install dependencies

From:

```text
D:\College_Stuff\Sem-5\NoCap
```

run:

```powershell
npm install
```

Then:

```powershell
npm run type-check
npm run content:validate
npm run build
```

All three must pass before deployment.

## 3. Local development

### Terminal 1 — frontend

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

### Terminal 2 — Worker

```powershell
npm run worker:dev
```

The Worker runs at:

```text
http://localhost:8787
```

NO CAP automatically uses `http://localhost:8787` as its API during Next.js development, so you do not need to edit `.env.local`.

## 4. Local D1

From the project root:

```powershell
npx wrangler d1 migrations apply nocap --local --config worker/wrangler.toml
```

Then start the Worker:

```powershell
npm run worker:dev
```

The local Worker automatically receives the `DB` binding from `worker/wrangler.toml`.

## 5. Cloudflare login

```powershell
npx wrangler login
npx wrangler whoami
```

A browser opens. Authorize the Cloudflare account.

## 6. Create the production D1 database

```powershell
npx wrangler d1 create nocap --config worker/wrangler.toml
```

Cloudflare will print a database ID.

Open:

```text
worker/wrangler.toml
```

and replace:

```toml
database_id = "REPLACE_WITH_YOUR_D1_ID"
```

with the real ID.

D1 is then available inside the Worker as `env.DB`. citeturn237632search1turn237632search3

## 7. Apply production migrations

```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
```

Do not manually recreate tables.

The migration files in:

```text
worker/migrations/
```

must be applied in order.

## 8. GitHub OAuth — recommended first

For the first public deployment, GitHub is the easiest provider.

Create an OAuth App:

```text
https://github.com/settings/developers
```

For production, after Cloudflare Pages gives you its URL:

```text
Homepage:
https://YOUR-PROJECT.pages.dev

Callback:
https://YOUR-PROJECT.pages.dev/auth/callback/github
```

Keep the client ID/secret out of Git.

## 9. Google OAuth — optional

Create a Web Application OAuth credential in Google Cloud Console.

Production callback:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/google
```

Google may require additional verification before a broadly available production OAuth application is approved.

For the first live launch, GitHub login is enough.

## 10. Set Worker secrets

From the project root:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
```

If Google sign-in is enabled:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
```

After the Pages URL is known:

```powershell
npx wrangler secret put FRONTEND_ORIGIN --config worker/wrangler.toml
npx wrangler secret put APP_ORIGIN --config worker/wrangler.toml
```

For both values enter:

```text
https://YOUR-PROJECT.pages.dev
```

Never put these secrets inside frontend source code.

## 11. Deploy the Worker

```powershell
npm run worker:deploy
```

You will receive a URL similar to:

```text
https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

Keep this URL.

Wrangler is the normal deployment tool for a JavaScript/TypeScript Worker. citeturn237632search2turn237632search12

## 12. Deploy the frontend

Push the repository to GitHub.

In Cloudflare:

```text
Workers & Pages
→ Create application
→ Pages
→ Connect to Git
```

Use:

```text
Build command:
npm run build

Output directory:
out
```

The repository already contains:

```text
functions/[[path]].js
```

That function proxies:

```text
/auth/*
/v1/*
```

to the Worker.

## 13. Pages environment variable

In Cloudflare Pages project settings → Variables and Secrets, add:

```text
NO_CAP_API_URL=https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

Production should NOT set:

```text
NEXT_PUBLIC_API_BASE_URL
```

The browser should use the Pages-origin proxy in production.

## 14. Final OAuth callback URLs

Once the Pages deployment exists, configure:

GitHub:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/github
```

Google:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/google
```

The redirect URI must exactly match the configured provider value.

## 15. Live smoke test

Open:

```text
https://YOUR-PROJECT.pages.dev
```

Then test:

```text
Sign in
→ complete onboarding
→ open a concept
→ take a quiz
→ create a note
→ create a highlight
→ bookmark
→ open Notes
→ create a document
→ draw on Canvas
→ refresh
→ verify everything remains
→ open another device
→ sign in
→ verify sync
→ sign out
```

## 16. If something fails

### Frontend

Run:

```powershell
npm run type-check
npm run build
```

### Worker

Run:

```powershell
npm run worker:check
npm run worker:dev
```

### Database

Run:

```powershell
npx wrangler d1 migrations list nocap --remote --config worker/wrangler.toml
```

### Authentication

Check:

- callback URL
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `FRONTEND_ORIGIN`
- `APP_ORIGIN`

### Sync

Check:

```text
/v1/health
/v1/profile
/v1/state
```

in the browser network panel and Worker logs.

## 17. Important

The current NO CAP Worker is JavaScript. The only deployment tool you need from the list below is Wrangler:

```text
Node.js + npm
Wrangler
Cloudflare account
```

You do NOT need:

```text
uv
workers-py
pywrangler
Pyodide
Python
WSL2
```

Use the project scripts instead of typing custom Wrangler flags:

```powershell
npm run worker:dev
npm run worker:deploy
npm run worker:check
```

## 18. Why this architecture

NO CAP is a static-heavy educational application.

The lesson content is bundled into the Next.js static export.

The Worker only handles:

- authentication
- sessions
- profiles
- learning state
- notes
- highlights
- bookmarks
- sync

The D1 binding is a standard Cloudflare Worker binding. citeturn237632search3turn237632search9

This keeps the deployment simple, fast and free-tier-friendly.

## 19. No custom domain required

You can launch using:

```text
https://YOUR-PROJECT.pages.dev
```

and:

```text
https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

A custom domain can be added later.

## 20. Recommended final verification

Run:

```powershell
npm install
npm run type-check
npm run worker:check
npm run content:validate
npm run build
npm run worker:dev
```

Then deploy:

```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
npm run worker:deploy
```

Then deploy Pages.

Cloudflare's current Worker documentation supports Wrangler directly on Windows, and D1 is available via standard Worker bindings. citeturn237632search2turn237632search3


## Free-tier deployment guardrails (NO CAP v0.2)

The architecture is intentionally split so that public lesson pages are static and do not invoke the Worker. Only `/auth/*` and `/v1/*` are proxied to the API Worker. Static assets remain on the Pages static path.

Application guardrails:
- Client concept content is loaded per page; the shell never imports all 144 full lesson JSON files.
- Search uses the compact concept index rather than full lesson content.
- Mermaid and Excalidraw are lazy-loaded.
- Video iframes are loaded only after the user presses Play.
- Authenticated state is bootstrapped once per session, not once per component.
- Sync is debounced and throttled; passive reading position changes do not trigger sync.
- Worker sync writes only changed rows and removes deleted rows instead of deleting and reinserting every collection on every sync.
- Sync payloads are capped and requests are locally rate-limited.
- The service worker never caches `/auth/*` or `/v1/*`.
- Static assets use long-lived immutable caching.

Cloudflare Workers Free currently has a 100,000-request/day limit and 10 ms CPU/request; static asset requests are free and unlimited. D1 Free currently includes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Exceeding the Free limits causes the affected operations to fail rather than automatically becoming paid usage.

## 13. Free-tier deployment discipline

NO CAP is intentionally static-first. The 144 lesson pages, diagrams, images, and public resources are generated into the Next.js static export and served by Cloudflare Pages. The Worker is used only for authentication, user state, and synchronization.

That means normal reading/navigation does not consume the Worker request budget.

The application also uses:

- lazy-loaded full concept payloads
- compact concept metadata for library/roadmap/home/search
- no Next.js prefetching for the large 144-concept lists
- lazy Mermaid rendering
- click-to-load YouTube embeds
- lazy images
- long-lived immutable caching for static assets
- content visibility for long lesson pages
- lazy command palette loading
- debounced, batched sync instead of per-action API calls
- server-side diffing before D1 writes
- server-side row limits on sync payloads
- best-effort sync/state rate limiting
- no API polling loop

### Current platform limits to design around

Cloudflare's Workers Free plan currently allows 100,000 requests/day. D1 Free currently includes 5 GB storage, 5 million rows read/day and 100,000 rows written/day. Static asset delivery is handled separately from Worker execution, so the static curriculum is intentionally kept out of the Worker path.

Free-tier usage is a hard design constraint, not an unlimited-traffic promise. If the application reaches the free quota, state-changing API calls should degrade gracefully while the public static curriculum remains accessible.
