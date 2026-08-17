# NO CAP Worker (Cloudflare Python Worker)

This is the backend for NO CAP. It runs as a Cloudflare Worker using the Python (Pyodide) runtime.

## Status: Scaffold

The frontend (`/src`) runs fully on localStorage without this Worker. The Worker is wired up when you are ready to deploy to Cloudflare and want server-side state, auth, and quota tracking.

## Constraint: Thin Python Only

FastAPI on Python Workers runs in Pyodide (WebAssembly). Limits:
- 10ms CPU time per request
- 128MB memory
- 3MB Worker size
- 50 subrequests per request

**Forbidden**: NumPy, Pandas, SciPy, native binary dependencies, heavyweight ML, image processing, server-side simulation engines.

All heavy computation (simulations, architecture validation, cost calculation) runs **client-side**. The Worker is a thin API/domain layer over D1.

## Setup

1. Install wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create the D1 database:
   ```bash
   wrangler d1 create nocap
   # Copy the database_id into wrangler.toml
   ```

4. Create the KV namespace (optional):
   ```bash
   wrangler kv namespace create KV
   # Copy the id into wrangler.toml
   ```

5. Create the R2 bucket:
   ```bash
   wrangler r2 bucket create nocap-assets
   ```

6. Set secrets:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put ALLOWED_GITHUB_ID
   wrangler secret put JWT_SECRET
   ```

7. Run migrations:
   ```bash
   wrangler d1 migrations apply nocap --local    # dev
   wrangler d1 migrations apply nocap --remote   # prod
   ```

8. Run locally:
   ```bash
   wrangler dev
   ```

9. Deploy:
   ```bash
   wrangler deploy
   ```

## Free Tier Allocations

| Service | Free | Expected single-user usage |
|---------|------|---------------------------|
| Workers | 100k req/day | ~5-15k/day |
| D1 | 5GB, 5M reads/day, 100k writes/day | <100MB, <100k reads/day |
| R2 | 10GB, free egress | <1GB |
| KV (optional) | 100k reads/day, 1k writes/day | <1k/day |
| Durable Objects (v2.0) | 100k req/day, 13k GB-s/day | only during collab |
| Workers AI (v2.0, Tier C) | 10k neurons/day | <2k/day |

All fail-closed: feature unavailable, not billed.
