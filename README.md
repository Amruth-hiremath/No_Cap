# NO CAP v0.1 — The Learning Engine

A personal system-design learning workbench. **Design it. Break it. Scale it.**

> No paid dependency. No accidental billing. Core functionality remains usable at free-tier exhaustion.

This is v0.1 (Tier A MVP) of NO CAP. It is a complete learning engine: roadmap, concepts, daily dose, lessons, diagrams, quizzes, mastery, review, glossary, and focus mode. All running on Next.js + localStorage, with a Cloudflare Worker scaffold ready to wire up when you want server-side state.

## What's in v0.1

| Module | Status | Notes |
|--------|--------|-------|
| Home / Today | ✅ | Data-driven hero + review queue + continue + momentum |
| Daily Dose | ✅ | Guided session with stepper at /daily (mental model → visual → quiz → recall) |
| Roadmap | ✅ | 4 modes: Guided, Explore, Mastery, Interview (SVG dependency graph) |
| Concept Library | ✅ | 5 seed concepts with deep content (summary, why, mechanism, trade-offs, failure modes, teardowns) |
| Concept Lesson | ✅ | Article-style structured reading (not a card stack). Section headers, prose, diagrams, code, quizzes |
| Quiz Engine | ✅ | Interactive MCQs with rationale + mastery feedback. Practice page has filter-by-mastery |
| Review / Spaced Repetition | ✅ | Interactive (select → reveal → confidence → schedule). Prior interval captured correctly |
| Progress / Mastery | ✅ | 5-dim mastery matrix, per-area bars, weak areas, review load, 7-day momentum |
| Glossary | ✅ | 18 terms, instant search, linked concepts |
| Focus Mode | ✅ | Pomodoro timer (5/12/25 min), Escape to exit, works on concepts + daily dose |
| Cmd+K Search | ✅ | Command palette with keyboard nav (arrows, enter, escape) |
| Practice | ✅ | Real quiz/drill surface with filter by mastery state (not "coming soon" placeholders) |
| Settings | ✅ | Local vs synced mode, theme switching (data-theme), no fake quota zeros |
| PWA | ✅ | Installable, offline-capable, system fonts (no external font fetching) |
| Content Validator | ✅ | `npm run content:validate` — schema + reference integrity |
| Cloudflare Worker | 📦 Scaffold | wrangler.toml + D1 schema + FastAPI stub |
| Auth (GitHub OAuth) | 📦 Scaffold | Single-user, in Worker (clearly labeled as "requires Worker" in Settings) |

**Deferred to later versions**: Labs (v0.5), Playground (v0.5), Case Studies (v0.5), Interview Mode (v0.5), Notes & Collections (v1.0), Cost Calculator (v1.0), Career Path (v1.0), Voice (v2.0), AI Mentor (v2.0), Collaborative Whiteboarding (v2.0).

## Architecture

```
Frontend: Next.js 16 + TypeScript + Tailwind CSS 4 + PWA
State:    Zustand + localStorage (v0.1) → D1 (when Worker wired)
Content:  Static JSON in /content (versioned in git, served from edge)
Backend:  FastAPI on Cloudflare Python Workers (Pyodide) - scaffold
Database: Cloudflare D1 (SQLite) - schema ready in /worker/migrations
Assets:   Cloudflare R2 - for exports, lesson packs (Tier B)
Cache:    Cloudflare KV - OPTIONAL, link previews only (Tier C)
Realtime: Durable Objects - collab (Tier B, v2.0)
AI:       Workers AI - mentor (Tier C, v2.0, quota-guarded)
Voice:    Browser Web Speech API - TTS/STT (Tier C, v2.0)
Deploy:   Cloudflare Pages + Workers, GitHub Actions
```

**Zero-cost guarantee**: No paid dependency. No accidental billing. Cloudflare's Free plan fails-closed (queries fail rather than billing you). Optional services have hard quota guards with deterministic fallbacks.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server
npm run dev

# 3. Open http://localhost:3000
```

The app runs fully on localStorage. No Worker, no D1, no auth needed for v0.1. Your progress persists in the browser.

## Project Structure

```
nocap-v0.1/
├── content/                    # Static content (versioned JSON in git)
│   ├── tracks.json             # Curriculum tracks + phases
│   ├── glossary.json           # 18 glossary entries
│   ├── concepts/               # 5 sample concepts
│   │   ├── how-the-internet-works.json
│   │   ├── dns.json
│   │   ├── load-balancing.json
│   │   ├── caching.json
│   │   └── cap-theorem.json
│   └── pricing/
│       └── aws.json            # Bundled pricing dataset (Tier B)
├── public/                     # PWA manifest + service worker
│   ├── manifest.json
│   ├── sw.js
│   └── icons/                  # Add icon-192.png, icon-512.png
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (fonts, AppShell)
│   │   ├── page.tsx            # Home / Today
│   │   ├── roadmap/
│   │   ├── concepts/
│   │   │   ├── page.tsx        # Library
│   │   │   └── [slug]/page.tsx # Concept detail
│   │   ├── practice/
│   │   ├── review/
│   │   ├── progress/
│   │   ├── glossary/
│   │   ├── settings/
│   │   └── globals.css         # Design tokens + glassmorphism
│   ├── components/
│   │   ├── shell/              # AppShell, Sidebar, TopBar, CommandPalette
│   │   ├── ui/                 # GlassCard, AccentRule, Button, Badge
│   │   └── concept/            # LessonRenderer, QuizCard
│   └── lib/
│       ├── types.ts            # Content + user state types
│       ├── content.ts          # Static content loader
│       ├── store.ts            # Zustand store (localStorage)
│       ├── mastery.ts          # 5-dim mastery algorithm
│       ├── review-scheduler.ts # SM-2-like spaced repetition
│       └── utils.ts            # cn() helper
├── worker/                     # Cloudflare Worker scaffold
│   ├── wrangler.toml           # D1/R2/KV/DO bindings
│   ├── src/main.py             # FastAPI stub (thin Python only)
│   ├── migrations/0001_init.sql # D1 schema (Tier A tables)
│   └── README.md               # Worker setup instructions
├── specs/                      # The 5 v2.1 spec PDFs
│   ├── NO_CAP_PRD.pdf
│   ├── NO_CAP_UI_Specification.pdf
│   ├── NO_CAP_User_Flow.pdf
│   ├── NO_CAP_TRD.pdf
│   └── NO_CAP_Backend_Blueprint.pdf
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
└── .env.example
```

## Design System

**Palette** ("Studio Cockpit" — warm editorial, NO pink/blue/purple):
- Paper: `#FAF7F2` (warm cream)
- Ink: `#1A1815` (warm near-black)
- Accent: `#B45309` (burnt amber)
- Success: `#166534` (forest green)
- Warning: `#92400E` (rust amber)
- Danger: `#991B1B` (deep red)

**Glass tiers** (5 levels, see `globals.css`):
- `glass-liquid` — hero cards (max 2 per screen)
- `glass-frosted` — standard cards
- `glass-smoke` — sidebar, top bar, sticky headers
- `glass-dark` — code blocks, command palette
- `edge-glow` — focused/hover state

**Typography**: Noto Serif SC (body + headings), SarasaMonoSC / JetBrains Mono (code + tabular numerals).

## Adding Content

Content lives as static JSON in `/content`. To add a new concept:

1. Create `/content/concepts/your-slug.json` (see existing concepts for schema).
2. Add the slug to the relevant phase in `/content/tracks.json`.
3. Add glossary entries to `/content/glossary.json` if applicable.
4. The concept automatically appears in the library, roadmap, and search.

No database writes. No migrations. No admin panel. Content is versioned in git, reviewed via PR, served from Cloudflare Pages edge at deploy time.

## Wiring Up the Worker (optional, for production)

The frontend runs fully on localStorage. Wire up the Worker when you want:
- Server-side state sync across devices
- GitHub OAuth (single-user)
- Real quota tracking against Cloudflare free tier
- Tier B/C features that need a backend (collab, AI mentor, cost API)

See `worker/README.md` for setup instructions.

## Tech Stack

- **Next.js 16** with App Router, static export (`output: 'export'`)
- **TypeScript** strict mode
- **Tailwind CSS 4** with `@theme` tokens
- **Zustand** with `persist` middleware (localStorage)
- **lucide-react** for icons
- **flexsearch** for client-side search (loaded lazily)
- **Cloudflare Workers** (Python/Pyodide) — scaffold
- **Cloudflare D1** (SQLite) — schema ready

## The "You're Using This Concept" Feature

NO CAP is itself a system-design teaching artifact. While learning about CDNs, you're using Cloudflare's edge. While learning about distributed state, you're using Durable Objects. While learning about SQLite, you're using D1. The app can eventually surface a small badge on concept pages: "You're currently using this concept to run NO CAP itself."

## Specs

The 5 v2.1 spec PDFs are in `/specs/`:
- `NO_CAP_PRD.pdf` — Product Requirements (tier A/B/C/D classification)
- `NO_CAP_UI_Specification.pdf` — Design system + screen-by-screen
- `NO_CAP_User_Flow.pdf` — End-to-end experience map
- `NO_CAP_TRD.pdf` — Technical architecture (Cloudflare-native)
- `NO_CAP_Backend_Blueprint.pdf` — D1 schema, Worker APIs, quota guards

## License

Personal use. Not for redistribution.
