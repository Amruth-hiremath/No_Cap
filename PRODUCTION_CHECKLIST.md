# NO CAP — Production Checklist

## Local

- [ ] `npm install`
- [ ] `npm run type-check`
- [ ] `npm run content:validate`
- [ ] `npm run build`
- [ ] `npm run dev`

## Cloudflare

- [ ] Create Cloudflare account
- [ ] Run `npx wrangler login`
- [ ] Run `npx wrangler d1 create nocap`
- [ ] Put the returned database ID in `worker/wrangler.toml`
- [ ] Run `npx wrangler d1 migrations apply nocap --remote`
- [ ] Deploy Worker with `npx wrangler deploy`
- [ ] Create/connect Pages project
- [ ] Set Pages variable `NO_CAP_API_URL=https://YOUR-WORKER.workers.dev`

## GitHub OAuth

Production callback:

`https://YOUR-PROJECT.pages.dev/auth/callback/github`

Set Worker secrets:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

## Google OAuth

Production callback:

`https://YOUR-PROJECT.pages.dev/auth/callback/google`

Set Worker secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Use Google test users until any verification requirements for wider public use are satisfied.

## Worker origins

Set:

```text
APP_ORIGIN=https://YOUR-PROJECT.pages.dev
FRONTEND_ORIGIN=https://YOUR-PROJECT.pages.dev
```

## Post-deploy smoke test

1. Open the Pages URL.
2. Sign in.
3. Complete onboarding.
4. Create a note.
5. Create a highlight.
6. Create a bookmark.
7. Finish a quiz.
8. Open Notes → Canvas and draw something.
9. Refresh.
10. Open the same account on a second browser/device.
11. Verify synced state.
12. Sign out.

## No-domain constraint

The first public deployment can use the Cloudflare-provided `pages.dev` hostname. A custom domain is optional and can be added later.
