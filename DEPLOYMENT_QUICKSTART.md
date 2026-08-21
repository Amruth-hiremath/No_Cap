# NO CAP — 15-minute deployment quickstart

This release uses a JavaScript Cloudflare Worker. No Python/uv/WSL is needed.

## Local

Terminal 1:

```powershell
npm install
npm run dev
```

Terminal 2:

```powershell
npm run worker:dev
```

Open `http://localhost:3000`.

## Cloudflare

Login:

```powershell
npx wrangler login
npx wrangler whoami
```

Create D1:

```powershell
npx wrangler d1 create nocap --config worker/wrangler.toml
```

Paste the returned database ID into `worker/wrangler.toml`.

Migrate:

```powershell
npx wrangler d1 migrations apply nocap --remote --config worker/wrangler.toml
```

Deploy Worker:

```powershell
npm run worker:deploy
```

Create your Pages project from GitHub:

```text
Build: npm run build
Output: out
```

Add Pages variable:

```text
NO_CAP_API_URL=https://YOUR-WORKER.workers.dev
```

Set Worker secrets:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put FRONTEND_ORIGIN --config worker/wrangler.toml
npx wrangler secret put APP_ORIGIN --config worker/wrangler.toml
```

Use the Pages URL for both `FRONTEND_ORIGIN` and `APP_ORIGIN`.

Then set GitHub OAuth callback:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/github
```

Google callback if enabled:

```text
https://YOUR-PROJECT.pages.dev/auth/callback/google
```

Finally:

```powershell
npm run type-check
npm run worker:check
npm run build
npm run content:validate
```

## Free-tier optimization already built in

Do not add API calls to concept page navigation. Lessons are static pages. Do not add polling for sync. The authenticated client batches meaningful state changes and the Worker diffs writes before touching D1.

For the initial public launch, keep the Worker on `workers.dev` and the website on the free Pages hostname. Add a custom domain later without changing the application architecture.
