# NO CAP Worker

Thin Cloudflare Worker API for authentication, account state and D1-backed synchronization.

## Production model

The browser should normally use the NO CAP Pages origin. Cloudflare Pages Functions proxy `/auth/*` and `/v1/*` to this Worker so session cookies remain first-party on the Pages `*.pages.dev` origin.

Worker public URL:

```text
https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

Public browser origin:

```text
https://YOUR-PROJECT.pages.dev
```

## Required secrets

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FRONTEND_ORIGIN
APP_ORIGIN
```

`APP_ORIGIN` is used to build the OAuth callback URL in production.

## Deploy

```bash
npx wrangler d1 create nocap
npx wrangler d1 migrations apply nocap --remote
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put FRONTEND_ORIGIN
npx wrangler secret put APP_ORIGIN
npx wrangler deploy
```
