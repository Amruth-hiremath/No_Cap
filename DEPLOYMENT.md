# NO CAP — Deployment

## Goal

Deploy NO CAP at:

```text
https://YOUR-PROJECT.pages.dev
```

with:

```text
Pages → Pages Functions → Worker → D1
```

No custom domain is required.

## Current backend

The backend is a **JavaScript Cloudflare Worker**.

There is intentionally no Python runtime in the release.

You do not need:

- Python
- uv
- workers-py
- pywrangler
- Pyodide
- WSL2

Cloudflare recommends Wrangler directly for Worker development/deployment and supports D1 via Worker bindings. citeturn237632search2turn237632search3

## Preflight

```powershell
npm install
npm run type-check
npm run content:validate
npm run build
npm run worker:check
```

`worker:check` uses `wrangler deploy --dry-run` so the Worker is bundled and checked without being deployed. citeturn403647search0turn403647search1

## Create D1

```powershell
npx wrangler d1 create nocap --config worker/wrangler.toml
```

Copy the returned database ID into:

```text
worker/wrangler.toml
```

Then:

```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
```

The Worker binding is:

```text
env.DB
```

Cloudflare documents D1 bindings and prepared statements for Workers. citeturn237632search1turn237632search4

## Worker secrets

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
```

Optional Google:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
```

After the Pages hostname exists:

```powershell
npx wrangler secret put FRONTEND_ORIGIN --config worker/wrangler.toml
npx wrangler secret put APP_ORIGIN --config worker/wrangler.toml
```

Both values should be:

```text
https://YOUR-PROJECT.pages.dev
```

## Deploy Worker

```powershell
npm run worker:deploy
```

This produces a `workers.dev` URL.

## Deploy Pages

Connect the GitHub repo to Cloudflare Pages.

Use:

```text
Build command:
npm run build

Output directory:
out
```

The repository contains:

```text
functions/[[path]].js
```

which proxies only:

```text
/auth/*
/v1/*
```

to the Worker.

Add this Pages environment variable:

```text
NO_CAP_API_URL=https://YOUR-WORKER.workers.dev
```

Do not set `NEXT_PUBLIC_API_BASE_URL` in production.

## OAuth

GitHub:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/github
```

Google:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/google
```

The callback URL must match the provider configuration exactly.

## Local development

Terminal 1:

```powershell
npm run dev
```

Terminal 2:

```powershell
npm run worker:dev
```

Frontend:

```text
http://localhost:3000
```

Worker:

```text
http://localhost:8787
```

The application automatically points to the local Worker during `next dev`.

## No-domain launch

Use the Pages `pages.dev` hostname and Worker `workers.dev` hostname.

Add a custom domain later only when branding/SEO requirements justify it.

## Production smoke test

```text
Open site
→ Sign in
→ complete onboarding
→ read concept
→ quiz
→ note
→ highlight
→ bookmark
→ Notes document
→ Canvas
→ refresh
→ second device
→ sign in
→ verify sync
→ sign out
```

## Troubleshooting

### Worker command fails

Run:

```powershell
npx wrangler --version
npm run worker:check
```

If `worker:check` fails, do not install Python or uv. The current Worker is JavaScript and should be handled entirely through Node + Wrangler.

### D1 error

```powershell
npx wrangler d1 migrations list nocap --remote --config worker/wrangler.toml
```

Verify the database ID in `worker/wrangler.toml`.

### OAuth error

Check:

- provider callback URL
- Worker secrets
- `APP_ORIGIN`
- `FRONTEND_ORIGIN`

### Sync error

Check the browser Network panel:

```text
/auth/me
/v1/profile
/v1/state
/v1/state/sync
```

and inspect Worker logs with:

```powershell
npx wrangler tail nocap-worker
```

## Why JavaScript Worker?

NO CAP's Worker is a thin API layer. It does not need Python-specific libraries, ML, NumPy, or server-side document processing.

Keeping it in JavaScript removes the Pyodide/Wrangler/uv development dependency and uses Cloudflare's first-class Worker + D1 toolchain directly. This is the intended release architecture.
