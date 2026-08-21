# NO CAP — Production Deployment

## Architecture

- **Frontend:** Next.js static export on Cloudflare Pages
- **API:** JavaScript Cloudflare Worker
- **Database:** Cloudflare D1
- **Auth:** Google + GitHub OAuth
- **Browser API origin:** `https://no-cap.pages.dev`
- **Worker origin:** your `workers.dev` URL
- **Pages proxy:** `/auth/*` and `/v1/*` keep browser sessions first-party on the Pages origin

Cloudflare Pages Git integration can automatically deploy the frontend when `main` changes. The GitHub Action in this repository validates/builds the site and deploys the separate Worker. NO CAP v0.x has no production cron workload, so no Cron Trigger is configured.

## One-time setup

### 1. Cloudflare
```powershell
npx wrangler login
npx wrangler d1 create nocap --config worker/wrangler.toml
```
Copy the returned `database_id` into `worker/wrangler.toml`, then:
```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
```

### 2. Worker secrets
```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put FRONTEND_ORIGIN --config worker/wrangler.toml
npx wrangler secret put APP_ORIGIN --config worker/wrangler.toml
```

Set:
- `FRONTEND_ORIGIN=https://no-cap.pages.dev`
- `APP_ORIGIN=https://no-cap.pages.dev`

### 3. Deploy Worker
```powershell
npm run worker:deploy
```

### 4. Cloudflare Pages
Connect the GitHub repository to the existing **no-cap** Pages project.

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `out`
- Environment variable:
  - `NO_CAP_API_URL=https://YOUR-WORKER.workers.dev`
  - `NEXT_PUBLIC_SITE_URL=https://no-cap.pages.dev`

Do not configure the repository as an OpenNext/Workers Build project; this app is a static Pages deployment.

### 5. OAuth callbacks

GitHub:
`https://no-cap.pages.dev/auth/callback/github`

Google:
`https://no-cap.pages.dev/auth/callback/google`

The Worker derives the callback from the public Pages origin forwarded by the Pages proxy, so stale worker hostname URLs do not become OAuth redirect URIs.

## Verification

```powershell
npm ci
npm run type-check
npm run content:validate
npm run build
npm run worker:check
```

Production smoke test:

1. Open `https://no-cap.pages.dev`
2. Sign in with GitHub
3. Create a note
4. Add a highlight
5. Complete a quiz
6. Refresh
7. Confirm the state remains
8. Repeat with Google if configured
9. Check Worker health at `/v1/health`

## Free-tier discipline

The core curriculum is static and served by Pages. The committed `public/_routes.json` restricts Pages Functions invocation to `/auth/*` and `/v1/*`, so normal lesson reads do not hit the Worker/D1 path. Cloudflare documents this routing pattern for preserving the free static-request allocation. https://developers.cloudflare.com/pages/functions/routing/

The app also:
- lazy-loads heavy modules
- avoids eager loading of all concepts
- disables unnecessary route prefetching for large lesson libraries
- batches and debounces sync
- rate-limits auth/state APIs
- writes only changed records to D1
- avoids polling
- does not cache authenticated API responses
- keeps media lazy-loaded

Hard platform quotas still apply; no architecture can guarantee unlimited traffic on a free plan.
