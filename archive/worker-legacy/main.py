"""
NO CAP Worker — Production API for v0.1

Implements:
  - GitHub OAuth (login, callback, me, logout)
  - D1 persistence (users, mastery, reviews, attempts, notes, highlights, bookmarks, events, settings)
  - CRUD endpoints for user state
  - Auth middleware (cookie-based, HTTP-only, SameSite)

CONSTRAINT: Thin Python only (Pyodide runtime).
  - 10ms CPU time, 128MB memory, 3MB Worker size, 50 subrequests/request.
  - All heavy computation runs client-side.
  - No NumPy, Pandas, SciPy, native binary dependencies.

Local development:
  cd worker && uv run pywrangler dev

Deployment:
  cd worker && uv run pywrangler deploy
"""

from js import Response, Headers, fetch as js_fetch
import json, secrets

# ═══════════════════════════════════════════════════════════════════
# Router
# ═══════════════════════════════════════════════════════════════════

ROUTES = {}

def route(method, path_pattern):
    def decorator(fn):
        ROUTES[(method, path_pattern)] = fn
        return fn
    return decorator

# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def json_response(data, status=200, extra_headers=None):
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    return Response.new(json.dumps(data), {"status": status, "headers": headers})

def error_response(message, status=400):
    return json_response({"error": message}, status)

def get_cookie(request, name):
    """Extract a cookie from the Cookie header."""
    cookie_header = request.headers.get("Cookie") or ""
    for cookie in cookie_header.split(";"):
        cookie = cookie.strip()
        if "=" in cookie:
            key, val = cookie.split("=", 1)
            if key.strip() == name:
                return val.strip()
    return None

def set_cookie_header(name, value, max_age=86400 * 7, http_only=True, secure=True, same_site="Lax"):
    """Build a Set-Cookie header string."""
    parts = [f"{name}={value}", f"Max-Age={max_age}", f"Path=/"]
    if http_only:
        parts.append("HttpOnly")
    if secure:
        parts.append("Secure")
    if same_site:
        parts.append(f"SameSite={same_site}")
    return "; ".join(parts)

def clear_cookie_header(name):
    """Build a Set-Cookie header that expires immediately."""
    return f"{name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax"

def generate_session_token():
    """Generate a cryptographically random session token."""
    return secrets.token_hex(32)

def generate_oauth_state():
    """Generate a random OAuth state parameter."""
    return secrets.token_hex(16)

# ═══════════════════════════════════════════════════════════════════
# Auth: GitHub OAuth flow
# ═══════════════════════════════════════════════════════════════════

@route("GET", "/auth/login")
def auth_login(request, env):
    """Initiate GitHub OAuth flow."""
    client_id = getattr(env, "GITHUB_CLIENT_ID", None)
    if not client_id:
        return error_response("GitHub OAuth not configured (GITHUB_CLIENT_ID missing)", 500)

    host = request.headers.get("host") or "localhost:8787"
    redirect_uri = f"https://{host}/auth/callback"
    scope = "read:user"
    state = generate_oauth_state()

    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )

    headers = Headers.new({"Location": auth_url, "Set-Cookie": set_cookie_header("oauth_state", state, max_age=600)})
    return Response.new("", {"status": 302, "headers": headers})

@route("GET", "/auth/callback")
def auth_callback(request, env):
    """Handle GitHub OAuth callback."""
    url = request.url
    from urllib.parse import urlparse, parse_qs
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    code = params.get("code", [None])[0]
    state = params.get("state", [None])[0]
    cookie_state = get_cookie(request, "oauth_state")

    if not code:
        return error_response("Missing authorization code", 400)
    if not state or state != cookie_state:
        return error_response("Invalid OAuth state (possible CSRF)", 400)

    client_id = getattr(env, "GITHUB_CLIENT_ID", None)
    client_secret = getattr(env, "GITHUB_CLIENT_SECRET", None)
    if not client_id or not client_secret:
        return error_response("GitHub OAuth not configured", 500)

    # Exchange code for access token
    token_resp = js_fetch(
        "https://github.com/login/oauth/access_token",
        {
            "method": "POST",
            "headers": {"Accept": "application/json", "Content-Type": "application/json"},
            "body": json.dumps({
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            }),
        }
    )
    token_data = json.loads(token_resp.text())
    access_token = token_data.get("access_token")
    if not access_token:
        return error_response("Failed to get access token from GitHub", 502)

    # Fetch user profile
    user_resp = js_fetch(
        "https://api.github.com/user",
        {
            "method": "GET",
            "headers": {"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        }
    )
    user_data = json.loads(user_resp.text())
    github_id = str(user_data.get("id"))
    email = user_data.get("email") or ""
    name = user_data.get("name") or user_data.get("login") or ""

    if not github_id:
        return error_response("Failed to get user info from GitHub", 502)

    # Check allowed_github_id if configured
    allowed_id = getattr(env, "ALLOWED_GITHUB_ID", None)
    if allowed_id and github_id != str(allowed_id):
        return error_response("GitHub account not authorized for this instance", 403)

    # Upsert user in D1
    db = env.DB
    existing = db.prepare("SELECT id FROM users WHERE github_id = ?").bind(github_id).first()

    if existing:
        user_id = existing.id
        db.prepare("UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?").bind(email, name, user_id).run()
    else:
        result = db.prepare(
            "INSERT INTO users (github_id, email, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
        ).bind(github_id, email, name).run()
        user_id = result.meta.last_row_id

    # Create session
    session_token = generate_session_token()
    db.prepare(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+7 days'))"
    ).bind(session_token, user_id).run()

    # Set session cookie and redirect to home
    headers = Headers.new({
        "Location": "/",
        "Set-Cookie": set_cookie_header("nocap_session", session_token),
    })
    return Response.new("", {"status": 302, "headers": headers})

@route("GET", "/auth/me")
def auth_me(request, env):
    """Return current user info, or null if not authenticated."""
    session_token = get_cookie(request, "nocap_session")
    if not session_token:
        return json_response({"user": None})

    db = env.DB
    session = db.prepare(
        "SELECT s.user_id, s.expires_at, u.github_id, u.email, u.name "
        "FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = ? AND s.expires_at > datetime('now')"
    ).bind(session_token).first()

    if not session:
        return json_response({"user": None})

    return json_response({
        "user": {
            "id": session.user_id,
            "github_id": session.github_id,
            "email": session.email,
            "name": session.name,
        }
    })

@route("POST", "/auth/logout")
def auth_logout(request, env):
    """Clear session and delete from D1."""
    session_token = get_cookie(request, "nocap_session")
    if session_token:
        db = env.DB
        db.prepare("DELETE FROM sessions WHERE token = ?").bind(session_token).run()

    headers = Headers.new({"Set-Cookie": clear_cookie_header("nocap_session")})
    return Response.new("", {"status": 200, "headers": headers})

# ═══════════════════════════════════════════════════════════════════
# Auth middleware
# ═══════════════════════════════════════════════════════════════════

def get_authenticated_user_id(request, env):
    """Return user_id if authenticated, else None."""
    session_token = get_cookie(request, "nocap_session")
    if not session_token:
        return None

    db = env.DB
    session = db.prepare(
        "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(session_token).first()

    return session.user_id if session else None

# ═══════════════════════════════════════════════════════════════════
# User state endpoints (D1-backed)
# ═══════════════════════════════════════════════════════════════════

@route("GET", "/v1/state")
def get_state(request, env):
    """Fetch all user state from D1 (for initial sync)."""
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401)

    db = env.DB

    mastery_rows = db.prepare("SELECT * FROM mastery WHERE user_id = ?").bind(user_id).all()
    mastery = {row.concept_slug: dict(row) for row in mastery_rows.results}

    review_rows = db.prepare("SELECT * FROM review_items WHERE user_id = ?").bind(user_id).all()
    review_items = {row.concept_slug: dict(row) for row in review_rows.results}

    attempt_rows = db.prepare("SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 500").bind(user_id).all()
    attempts = [dict(row) for row in attempt_rows.results]

    note_rows = db.prepare("SELECT * FROM notes WHERE user_id = ?").bind(user_id).all()
    notes = [dict(row) for row in note_rows.results]

    highlight_rows = db.prepare("SELECT * FROM highlights WHERE user_id = ?").bind(user_id).all()
    highlights = [dict(row) for row in highlight_rows.results]

    bookmark_rows = db.prepare("SELECT * FROM bookmarks WHERE user_id = ?").bind(user_id).all()
    bookmarks = [dict(row) for row in bookmark_rows.results]

    return json_response({
        "mastery": mastery,
        "review_items": review_items,
        "attempts": attempts,
        "notes": notes,
        "highlights": highlights,
        "bookmarks": bookmarks,
    })

@route("POST", "/v1/state/sync")
def sync_state(request, env):
    """Batch sync user state mutations to D1."""
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401)

    body = json.loads(request.text())
    db = env.DB

    for slug, record in body.get("mastery", {}).items():
        db.prepare(
            "INSERT INTO mastery (user_id, concept_slug, learn_score, recall_score, apply_score, explain_score, interview_score, state, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) "
            "ON CONFLICT(user_id, concept_slug) DO UPDATE SET "
            "learn_score=excluded.learn_score, recall_score=excluded.recall_score, "
            "apply_score=excluded.apply_score, explain_score=excluded.explain_score, "
            "interview_score=excluded.interview_score, state=excluded.state, updated_at=datetime('now')"
        ).bind(user_id, slug, record.get("learn_score", 0), record.get("recall_score", 0),
               record.get("apply_score", 0), record.get("explain_score", 0),
               record.get("interview_score", 0), record.get("state", "not_started")).run()

    for slug, item in body.get("review_items", {}).items():
        db.prepare(
            "INSERT INTO review_items (user_id, concept_slug, due_at, interval_days, ease, repetitions, last_quality) "
            "VALUES (?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(user_id, concept_slug) DO UPDATE SET "
            "due_at=excluded.due_at, interval_days=excluded.interval_days, "
            "ease=excluded.ease, repetitions=excluded.repetitions, last_quality=excluded.last_quality"
        ).bind(user_id, slug, item.get("due_at"), item.get("interval_days", 0.04),
               item.get("ease", 2.5), item.get("repetitions", 0), item.get("last_quality")).run()

    if "notes" in body:
        db.prepare("DELETE FROM notes WHERE user_id = ?").bind(user_id).run()
        for note in body["notes"]:
            db.prepare(
                "INSERT INTO notes (id, user_id, concept_slug, block_id, title, body, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(note.get("id"), user_id, note.get("concept_slug"), note.get("block_id"),
                   note.get("title"), note.get("body"), note.get("created_at"), note.get("updated_at")).run()

    if "highlights" in body:
        db.prepare("DELETE FROM highlights WHERE user_id = ?").bind(user_id).run()
        for hl in body["highlights"]:
            db.prepare(
                "INSERT INTO highlights (id, user_id, concept_slug, block_id, selected_text, color, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(hl.get("id"), user_id, hl.get("concept_slug"), hl.get("block_id"),
                   hl.get("selected_text"), hl.get("color"), hl.get("created_at")).run()

    if "bookmarks" in body:
        db.prepare("DELETE FROM bookmarks WHERE user_id = ?").bind(user_id).run()
        for bm in body["bookmarks"]:
            db.prepare(
                "INSERT INTO bookmarks (id, user_id, concept_slug, block_id, label, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(bm.get("id"), user_id, bm.get("concept_slug"), bm.get("block_id"),
                   bm.get("label"), bm.get("created_at")).run()

    return json_response({"status": "synced"})

# ═══════════════════════════════════════════════════════════════════
# Health check
# ═══════════════════════════════════════════════════════════════════

@route("GET", "/v1/health")
def health(request, env):
    return json_response({"status": "ok", "version": "0.1.0"})

# ═══════════════════════════════════════════════════════════════════
# Worker entry point
# ═══════════════════════════════════════════════════════════════════
# Cloudflare Python Workers expect a top-level `on_fetch` function.
# The Workers runtime (with python_workers compatibility flag) automatically
# detects this function as the fetch handler.
# The function receives (request, env, ctx) from the runtime.

async def on_fetch(request, env, ctx):
    method = request.method
    url = request.url
    path = url.split("?")[0]
    if path.startswith("http"):
        path = "/" + "/".join(path.split("/")[3:])

    handler_fn = ROUTES.get((method, path))
    if handler_fn:
        try:
            return handler_fn(request, env)
        except Exception as e:
            return error_response(f"Internal error: {str(e)}", 500)

    return error_response("not_found", 404)
