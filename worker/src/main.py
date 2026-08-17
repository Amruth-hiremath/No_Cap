"""
NO CAP Worker - FastAPI on Python Workers (Pyodide runtime)

CONSTRAINT: Thin Python only.
- No NumPy, Pandas, SciPy, native binary dependencies.
- No heavyweight ML, image processing, server-side simulation engines.
- 10ms CPU time, 128MB memory, 3MB Worker size, 50 subrequests per request.
- All heavy computation runs client-side (simulations, architecture validation, cost calc).

This file is a SCAFFOLD for v0.1. The frontend runs fully on localStorage without it.
Wire it up when you are ready to deploy to Cloudflare.

Run locally: cd worker && wrangler dev
Deploy:      cd worker && wrangler deploy
"""

from js import Response, Headers
import json

# ── In-memory route table (Pyodide-compatible) ──
# In production, use FastAPI proper. For the Pyodide preview, we use a simple router.

ROUTES = {}

def route(method, path):
    def decorator(fn):
        ROUTES[(method, path)] = fn
        return fn
    return decorator

# ── Health check ──
@route("GET", "/v1/health")
def health(request, env):
    return json_response({"status": "ok", "version": "0.1.0"})

# ── Quota endpoint (Tier A) ──
@route("GET", "/v1/quota/today")
def quota_today(request, env):
    """Return today's quota usage for all services. Used by Settings → System Health."""
    # TODO: query D1 quota_usage table
    return json_response({
        "worker": {"used": 0, "limit": 100_000, "unit": "req"},
        "d1_read": {"used": 0, "limit": 5_000_000, "unit": "rows"},
        "d1_write": {"used": 0, "limit": 100_000, "unit": "rows"},
        "r2_class_a": {"used": 0, "limit": 1_000_000 // 30, "unit": "ops"},
        "r2_class_b": {"used": 0, "limit": 10_000_000 // 30, "unit": "ops"},
        "kv_read": {"used": 0, "limit": 100_000, "unit": "reads"},
        "ai_neurons": {"used": 0, "limit": 10_000, "unit": "neurons", "tier": "C"},
    })

# ── Auth (GitHub OAuth, single-user) ──
@route("GET", "/auth/login")
def login(request, env):
    """Initiate GitHub OAuth flow."""
    client_id = env.GITHUB_CLIENT_ID
    redirect_uri = f"https://{request.headers.get('host')}/auth/callback"
    scope = "read:user"
    return Response.redirect(
        f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}",
        302
    )

@route("GET", "/auth/callback")
def callback(request, env):
    """OAuth callback - exchange code for token, fetch user, set JWT cookie."""
    # TODO: implement full OAuth flow
    return json_response({"status": "not_implemented", "message": "Wire up GitHub OAuth here"})

@route("GET", "/auth/me")
def me(request, env):
    """Current user info."""
    # TODO: verify JWT from cookie, return user record
    return json_response({"user": None})

# ── User state (D1-backed) ──
@route("GET", "/v1/home")
def home(request, env):
    """Daily dose, review queue, recommended next actions."""
    # TODO: query D1 for mastery + review_items, compute recommendations
    return json_response({"message": "TODO: implement home endpoint"})

@route("GET", "/v1/progress")
def progress(request, env):
    """Mastery matrix."""
    # TODO: query D1 mastery table
    return json_response({"mastery": {}})

@route("POST", "/v1/learning/events")
def events_batch(request, env):
    """Batch learning events."""
    # TODO: insert into D1 learning_events table
    return json_response({"accepted": 0})

# ── Helper ──
def json_response(data, status=200):
    headers = Headers.new({"Content-Type": "application/json"})
    return Response.new(json.dumps(data), {"status": status, "headers": headers})

# ── Worker entry point ──
def on_fetch(request, env, ctx):
    method = request.method
    url = request.url
    # Strip query string
    path = url.split("?")[0]
    # Remove origin
    if path.startswith("http"):
        path = "/" + "/".join(path.split("/")[3:])

    handler = ROUTES.get((method, path))
    if handler:
        return handler(request, env)

    # 404
    return json_response({"error": "not_found", "path": path}, 404)

# Export for Workers runtime
export = {"fetch": on_fetch}
