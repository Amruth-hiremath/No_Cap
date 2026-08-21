# NO CAP v0.1 — System Design Gym

**Design it. Break it. Scale it.**

NO CAP is a system-design learning platform built around a simple loop:

**Learn → Visualize → Practice → Design → Review → Master**

It ships as a searchable web app/PWA first, with optional account sync through Cloudflare Worker + D1. Core lessons are static and do not depend on AI or paid APIs.

## What is included

- 144 system-design concepts
- Daily Dose + spaced review
- Roadmap + dependency neighborhoods
- Rich lessons: prose, callouts, code, tables, Mermaid, images, videos, quizzes and scenarios
- 5+ interactive system-design labs
- Practice + review + mastery
- Notes workspace: structured blocks + Excalidraw canvas
- Highlights, bookmarks, notes and “I’m confused” tracking
- Command palette + keyboard shortcuts
- PWA installability
- Google/GitHub authentication
- Cloudflare Pages + Worker + D1 online architecture
- SEO sitemap + robots.txt for public indexing

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Zustand for local-first client state
- Static JSON content in `content/`
- Mermaid for diagrams
- Excalidraw for spatial notes
- Cloudflare Pages + Pages Functions
- Cloudflare Worker + D1 for accounts/sync

## Local development

```bash
npm install
npm run type-check
npm run content:validate
npm run worker:check
npm run build
npm run dev
```

For the API in another terminal:

```bash
npm run worker:dev
```

Open `http://localhost:3000`.

## Deploy online for ₹0/month

The recommended first deployment does not require a custom domain. Use the generated `pages.dev` hostname for the frontend and a `workers.dev` hostname for the Worker. See `SETUP_GUIDE.md` for the exact Cloudflare, D1, OAuth and environment-variable steps.

## Search / SEO

The build now emits `sitemap.xml` and `robots.txt`. Set `NEXT_PUBLIC_SITE_URL` to the deployed Pages URL before production deployment so canonical metadata and the sitemap use the real hostname.

## Project structure

```text
content/          # versioned curriculum JSON
public/           # PWA, brand and educational assets
src/app/          # Next.js routes + SEO
src/components/  # shell, lessons, labs, notes, UI
src/lib/          # state, content, sync, learning logic
functions/        # Pages Function same-origin API proxy
worker/           # Cloudflare Worker + D1 migrations
scripts/          # content validation/reporting
```

## Security note

Run `npm audit` before production deployment. Do not use `npm audit fix --force` blindly when it would downgrade or break Excalidraw/Mermaid dependencies. See `SECURITY.md`.


### Deployment architecture

NO CAP uses Next.js static export on Cloudflare Pages plus a very small TypeScript Worker backed by D1. Public lesson pages and static assets are served without invoking the Worker. Only authentication and authenticated user-state endpoints reach the Worker. This is deliberate: it keeps the core curriculum cheap to serve and protects the Workers Free request/CPU budget.


## Production
The public deployment uses Cloudflare Pages + a JavaScript Worker + D1. See `DEPLOYMENT.md`.

OAuth state is stored server-side in D1 so the Pages-to-Worker proxy does not depend on a browser state cookie surviving the redirect.
