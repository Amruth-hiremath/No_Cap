# NO CAP Worker API

The NO CAP backend is a **JavaScript Cloudflare Worker** backed by Cloudflare D1.

The Python Worker experiment has been removed. Do not install `uv`, `workers-py`, `pywrangler`, Pyodide, or WSL for this project.

## Architecture

```text
Browser
   │
   ▼
Cloudflare Pages
   │
   ├── static Next.js export
   └── Pages Functions /auth/* + /v1/*
                     │
                     ▼
              NO CAP Worker
                     │
                     ▼
                   D1
```

Cloudflare Workers support JavaScript/TypeScript directly through Wrangler, and D1 is available through the `env.DB` binding. citeturn237632search0turn237632search3

## Local development

From the project root:

```powershell
npm install
npm run worker:dev
```

Worker URL:

```text
http://localhost:8787
```

The main frontend automatically uses the local Worker during `next dev`.

## Validate the Worker bundle

```powershell
npm run worker:check
```

This uses:

```powershell
wrangler deploy --dry-run
```

so the Worker is bundled and validated without deploying it. Wrangler documents `deploy --dry-run` as the way to compile/check a Worker without uploading it. citeturn403647search0turn403647search1

## D1

Create:

```powershell
npx wrangler d1 create nocap --config worker/wrangler.toml
```

Put the returned database ID into:

```text
worker/wrangler.toml
```

Then:

```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
```

## Secrets

Set from the project root:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put FRONTEND_ORIGIN --config worker/wrangler.toml
npx wrangler secret put APP_ORIGIN --config worker/wrangler.toml
```

Google is optional:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
```

## Deploy

```powershell
npm run worker:deploy
```

The Worker will be available on a free `workers.dev` hostname unless you later add a custom domain.

## Endpoints

Authentication:

```text
GET  /auth/login?provider=github
GET  /auth/login?provider=google
GET  /auth/callback/github
GET  /auth/callback/google
GET  /auth/me
POST /auth/logout
```

Account/sync:

```text
GET   /v1/profile
PATCH /v1/profile
GET   /v1/state
POST  /v1/state/sync
GET   /v1/health
GET   /v1/quota/today
```

## Security model

- OAuth state is stored in an HttpOnly cookie.
- Authentication uses an opaque, random session token stored server-side in D1.
- Sessions expire after 30 days.
- Session cookies are HttpOnly and Secure in production.
- State-changing requests validate the request Origin.
- OAuth client secrets exist only as Worker secrets.
- The browser never receives OAuth client secrets.
- The Pages proxy keeps authentication on the `pages.dev` origin.

## Important

Do not put OAuth secrets in:

```text
.env.local
NEXT_PUBLIC_*
Git
frontend source
```

Only Worker secrets should contain provider credentials.
