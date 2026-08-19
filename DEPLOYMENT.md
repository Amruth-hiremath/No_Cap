# NO CAP — free / no-custom-domain deployment

This deployment path is designed for a personal or small-user NO CAP instance at ₹0/month, without buying a domain.

## Architecture

- **Frontend:** Cloudflare Pages (`*.pages.dev`)
- **API:** Cloudflare Worker (`*.workers.dev`)
- **Database:** Cloudflare D1
- **Browser auth path:** same-origin Pages Functions proxy → Worker
- **Core lessons:** static Next.js export

Cloudflare provides a `workers.dev` subdomain for Workers, and Pages gives each project a `pages.dev` address. Static Pages assets are free; Pages Functions use the Workers Free request allocation. D1's Workers Free allocation currently includes 5 GB storage, 5 million rows read/day and 100,000 rows written/day.

## 1. Create the free Cloudflare account

1. Create/login to a Cloudflare account.
2. Enable your `workers.dev` subdomain from **Workers & Pages → Overview**.
3. Do not add a custom domain.

Your API will look like:

```text
https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

## 2. Create D1

From the project root:

```bash
cd worker
npx wrangler d1 create nocap
```

Copy the returned database ID into `worker/wrangler.toml`:

```toml
database_id = "YOUR_D1_DATABASE_ID"
```

Then apply the migrations:

```bash
npx wrangler d1 migrations apply nocap --remote
```

## 3. Set Worker secrets

The following are secrets and must never be put in the frontend `.env`:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put FRONTEND_ORIGIN
npx wrangler secret put APP_ORIGIN
```

For the last two, use the final Pages URL, for example:

```text
https://nocap.pages.dev
```

## 4. Deploy the Worker

```bash
cd worker
npx wrangler deploy
```

Note the resulting workers.dev URL.

## 5. Connect Pages to the Worker

The repository contains a Pages Function proxy at:

```text
/functions/[[path]].js
```

It proxies `/auth/*` and `/v1/*` to the Worker so browser cookies stay first-party on the `pages.dev` origin.

In your Cloudflare Pages project, add the Functions environment variable:

```text
NO_CAP_API_URL=https://nocap-worker.YOUR-SUBDOMAIN.workers.dev
```

The project also contains `public/_routes.json` so static asset requests do not invoke the Functions unnecessarily.

## 6. Deploy the frontend to Pages

Connect the GitHub repository to Cloudflare Pages.

Build settings:

```text
Framework preset: Next.js (static export)
Build command: npm run build
Build output directory: out
```

Do not set a public API URL unless you are intentionally bypassing the Pages proxy. The production build should use:

```text
NEXT_PUBLIC_API_BASE_URL=
```

After the first deploy, Cloudflare will give you a URL similar to:

```text
https://YOUR-PROJECT.pages.dev
```

Put this exact URL into the Worker `FRONTEND_ORIGIN` and `APP_ORIGIN` secrets.

## 7. GitHub sign-in — recommended no-domain route

Go to:

https://github.com/settings/developers

Create an OAuth App.

Set:

```text
Application name: NO CAP
Homepage URL: https://YOUR-PROJECT.pages.dev
Authorization callback URL: https://YOUR-PROJECT.pages.dev/auth/callback/github
```

Copy the client ID and client secret into the Worker secrets.

This is the simplest route for a public no-domain NO CAP instance.

## 8. Google sign-in

Create a **Web application** OAuth client in Google Cloud Console:

https://console.cloud.google.com/apis/credentials

Use:

```text
Authorized redirect URI:
https://YOUR-PROJECT.pages.dev/auth/callback/google
```

The Google OAuth flow requires an exact redirect URI match.

### Important no-domain limitation

Google's current OAuth policies require verified domains for a public production OAuth app. A personal/testing app can still be used with a small set of test users, but testing has a 100-user test-user quota and test authorizations expire after seven days.

Therefore:

- **₹0 + no domain + public sync:** GitHub is the recommended production path.
- **₹0 + no domain + personal/testing Google login:** possible within Google's testing/personal-use rules.
- **Public Google login for a larger audience:** plan to add a domain later and complete the required Google verification steps.

## 9. First login and sync test

Open the Pages URL.

1. Sign in with GitHub.
2. Complete the NO CAP onboarding.
3. Open a concept.
4. Take a quiz.
5. Add a note.
6. Add a highlight.
7. Bookmark the concept.
8. Refresh the browser.
9. Confirm the data remains.
10. Open NO CAP on another device.
11. Sign in with the same provider.
12. Verify the same learning state appears.

## 10. Settings inside NO CAP

Use:

```text
Settings → Account & sync → Setup & sync guide
```

This guide intentionally separates:

- local mode
- authenticated mode
- cloud sync
- provider setup

so users do not confuse local browser state with account-backed state.

## Free-tier safety

NO CAP does not require a custom domain, PostgreSQL, Redis, Firebase, Supabase or a paid server.

Do not enable pay-as-you-go plans merely to follow this guide.

The free deployment is quota-bound. If NO CAP grows beyond free quotas, features may need to be reduced, optimized or moved to a paid plan rather than silently creating a bill.
