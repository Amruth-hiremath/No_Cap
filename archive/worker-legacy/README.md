# NO CAP Worker (Cloudflare Python Worker)

This is the backend for NO CAP. It runs as a Cloudflare Worker using the Python (Pyodide) runtime.

## Prerequisites

Install `uv` (Python package manager):
```bash
# On Windows (PowerShell):
pip install uv

# On macOS/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify `uv` version:
```bash
uv --version
# Must be >= 0.12.3
```

If you have an older version, update it:
```bash
pip install --upgrade uv
```

## Setup

1. **Install dependencies:**
```bash
cd worker
uv sync --python 3.13 --no-install-workspace
```

2. **Login to Cloudflare:**
```bash
npx wrangler login
```

3. **Create the D1 database:**
```bash
uv run pywrangler d1 create nocap
```
Copy the `database_id` from the output and paste it into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "nocap"
database_id = "YOUR_D1_ID_HERE"
```

4. **Apply migrations:**
```bash
# Local:
uv run pywrangler d1 migrations apply nocap --local

# Remote (production):
uv run pywrangler d1 migrations apply nocap --remote
```

5. **Set secrets:**
```bash
uv run pywrangler secret put GITHUB_CLIENT_ID
uv run pywrangler secret put GITHUB_CLIENT_SECRET
uv run pywrangler secret put ALLOWED_GITHUB_ID
uv run pywrangler secret put JWT_SECRET
```

## Local Development

```bash
uv run pywrangler dev
```

This starts the Worker on `http://localhost:8787`.

Test it:
```bash
curl http://localhost:8787/v1/health
# {"status":"ok","version":"0.1.0"}

curl http://localhost:8787/auth/me
# {"user":null}
```

## Deployment

```bash
uv run pywrangler deploy
```

## Important Notes

- The Worker is written in **Python** using Cloudflare's Pyodide runtime.
- Do NOT use `npx wrangler dev` or `npx wrangler deploy` — always use `uv run pywrangler`.
- The `pyproject.toml` has NO runtime dependencies — the Worker only uses `js` (Pyodide built-in) and stdlib.
- `workers-py` is installed as a dev tool (via `uv pip install`), not as a project dependency.
- The Worker code is thin: auth + D1 CRUD. All heavy computation runs client-side.

## Constraint: Thin Python Only

Pyodide runtime limits:
- 10ms CPU time per request
- 128MB memory
- 3MB Worker size
- 50 subrequests per request

**Forbidden**: NumPy, Pandas, SciPy, native binary dependencies, heavyweight ML, image processing, server-side simulation engines.
