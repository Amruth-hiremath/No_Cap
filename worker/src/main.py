"""
NO CAP Worker API

Production-oriented Cloudflare Worker API for:
- Google + GitHub OAuth 2.0 / OIDC sign-in
- Secure HttpOnly cookie sessions
- D1-backed profile and learning state
- Cross-device sync
- CORS for an optionally separate frontend origin

Core lessons remain static/client-side. The Worker is intentionally thin.
"""

from js import Response, Headers, fetch as js_fetch
import json, secrets
from urllib.parse import urlparse, parse_qs, urlencode

ROUTES = {}


def route(method, path):
    def decorator(fn):
        ROUTES[(method, path)] = fn
        return fn
    return decorator


def env_value(env, key, default=None):
    value = getattr(env, key, None)
    return value if value not in (None, "") else default


def frontend_origin(env, request=None):
    configured = env_value(env, "FRONTEND_ORIGIN")
    if configured:
        return configured.rstrip("/")
    if request:
        host = request.headers.get("host") or "localhost:8787"
        scheme = "https" if not host.startswith("localhost") and not host.startswith("127.0.0.1") else "http"
        return f"{scheme}://{host}"
    return "http://localhost:3000"


def cors_headers(env, request=None):
    origin = None
    if request:
        origin = request.headers.get("Origin")
    allowed = env_value(env, "FRONTEND_ORIGIN")
    headers = {"Vary": "Origin"}
    if allowed and origin == allowed:
        headers["Access-Control-Allow-Origin"] = allowed
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With"
        headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,OPTIONS"
    elif not allowed and origin:
        # Local development fallback only. Credentials require an explicit origin.
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With"
        headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,OPTIONS"
    return headers


def origin_allowed(request, env):
    origin = request.headers.get("Origin")
    if not origin:
        return True
    allowed = env_value(env, "FRONTEND_ORIGIN")
    if allowed:
        return origin.rstrip("/") == allowed.rstrip("/")
    host = request.headers.get("host") or ""
    return origin.rstrip("/") == f"https://{host}" or origin.rstrip("/") == f"http://{host}"


def json_response(data, status=200, env=None, request=None, extra_headers=None):
    headers = {"Content-Type": "application/json", **cors_headers(env, request)}
    if extra_headers:
        headers.update(extra_headers)
    return Response.new(json.dumps(data), {"status": status, "headers": headers})


def error_response(message, status=400, env=None, request=None):
    return json_response({"error": message}, status, env, request)


def get_cookie(request, name):
    cookie_header = request.headers.get("Cookie") or ""
    for item in cookie_header.split(";"):
        item = item.strip()
        if "=" in item:
            key, value = item.split("=", 1)
            if key.strip() == name:
                return value.strip()
    return None


def cookie_secure(request):
    host = request.headers.get("host") or ""
    return not (host.startswith("localhost") or host.startswith("127.0.0.1"))


def set_cookie_header(name, value, request, max_age=60 * 60 * 24 * 30, http_only=True):
    parts = [f"{name}={value}", f"Max-Age={max_age}", "Path=/"]
    if http_only:
        parts.append("HttpOnly")
    if cookie_secure(request):
        parts.append("Secure")
    same_site = "None" if cookie_secure(request) else "Lax"
    if same_site:
        parts.append(f"SameSite={same_site}")
    return "; ".join(parts)


def clear_cookie_header(name, request):
    parts = [f"{name}=", "Max-Age=0", "Path=/", "HttpOnly"]
    if cookie_secure(request):
        parts.append("Secure")
    parts.append("SameSite=None" if cookie_secure(request) else "SameSite=Lax")
    return "; ".join(parts)


def redirect_response(location, request, env=None, cookies=None):
    headers = {"Location": location, **cors_headers(env, request)}
    if cookies:
        # Set-Cookie is intentionally limited to one header here for maximum
        # compatibility with the Python Workers response adapter. The OAuth
        # state cookie is short-lived and expires naturally after 10 minutes.
        headers["Set-Cookie"] = cookies[0]
    return Response.new("", {"status": 302, "headers": headers})


def random_token(bytes_len=32):
    return secrets.token_hex(bytes_len)


def oauth_state(provider):
    return f"{provider}.{random_token(16)}"


def provider_config(env, provider):
    if provider == "github":
        return env_value(env, "GITHUB_CLIENT_ID"), env_value(env, "GITHUB_CLIENT_SECRET")
    if provider == "google":
        return env_value(env, "GOOGLE_CLIENT_ID"), env_value(env, "GOOGLE_CLIENT_SECRET")
    return None, None


def callback_uri(request, provider, env):
    public_origin = env_value(env, "APP_ORIGIN")
    if public_origin:
        return f"{public_origin.rstrip('/')}/auth/callback/{provider}"
    host = request.headers.get("host") or "localhost:8787"
    scheme = "https" if cookie_secure(request) else "http"
    return f"{scheme}://{host}/auth/callback/{provider}"


def exchange_oauth_code(provider, code, redirect_uri, client_id, client_secret):
    if provider == "github":
        resp = js_fetch(
            "https://github.com/login/oauth/access_token",
            {
                "method": "POST",
                "headers": {"Accept": "application/json", "Content-Type": "application/json"},
                "body": json.dumps({"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri}),
            },
        )
    else:
        resp = js_fetch(
            "https://oauth2.googleapis.com/token",
            {
                "method": "POST",
                "headers": {"Content-Type": "application/x-www-form-urlencoded"},
                "body": urlencode({"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri, "grant_type": "authorization_code"}),
            },
        )
    return json.loads(resp.text())


def provider_profile(provider, access_token):
    if provider == "github":
        profile_resp = js_fetch(
            "https://api.github.com/user",
            {"method": "GET", "headers": {"Authorization": f"Bearer {access_token}", "Accept": "application/json", "User-Agent": "NO-CAP"}},
        )
        profile = json.loads(profile_resp.text())
        email = profile.get("email") or ""
        email_verified = bool(email)
        if not email:
            email_resp = js_fetch(
                "https://api.github.com/user/emails",
                {"method": "GET", "headers": {"Authorization": f"Bearer {access_token}", "Accept": "application/json", "User-Agent": "NO-CAP"}},
            )
            emails = json.loads(email_resp.text())
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            if primary:
                email = primary.get("email") or ""
        return {
            "provider": "github",
            "provider_id": str(profile.get("id")),
            "email": email,
            "email_verified": email_verified,
            "name": profile.get("name") or profile.get("login") or "NO CAP learner",
            "avatar_url": profile.get("avatar_url") or "",
        }

    userinfo_resp = js_fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {"method": "GET", "headers": {"Authorization": f"Bearer {access_token}"}},
    )
    profile = json.loads(userinfo_resp.text())
    return {
        "provider": "google",
        "provider_id": str(profile.get("sub")),
        "email": profile.get("email") or "",
        "email_verified": bool(profile.get("email_verified")),
        "name": profile.get("name") or profile.get("email") or "NO CAP learner",
        "avatar_url": profile.get("picture") or "",
    }


def upsert_user(db, profile):
    provider = profile["provider"]
    provider_id = profile["provider_id"]
    existing = db.prepare("SELECT id FROM users WHERE auth_provider = ? AND provider_user_id = ?").bind(provider, provider_id).first()
    if existing:
        user_id = existing.id
        db.prepare(
            "UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(profile["email"], profile["name"], profile["avatar_url"], user_id).run()
        return user_id

    # Reuse an existing account by exact email when present, then link the provider.
    if profile["email"] and profile.get("email_verified", False):
        existing_by_email = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").bind(profile["email"]).first()
        if existing_by_email:
            user_id = existing_by_email.id
            db.prepare(
                "UPDATE users SET auth_provider = ?, provider_user_id = ?, email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(provider, provider_id, profile["email"], profile["name"], profile["avatar_url"], user_id).run()
            return user_id

    legacy_key = f"{provider}:{provider_id}"
    result = db.prepare(
        "INSERT INTO users (github_id, auth_provider, provider_user_id, email, name, avatar_url, onboarding_completed, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))"
    ).bind(legacy_key, provider, provider_id, profile["email"], profile["name"], profile["avatar_url"]).run()
    return result.meta.last_row_id


@route("GET", "/auth/login")
def auth_login(request, env):
    from urllib.parse import urlparse, parse_qs
    provider = (parse_qs(urlparse(request.url).query).get("provider", ["github"])[0] or "github").lower()
    if provider not in {"github", "google"}:
        return error_response("Unsupported provider", 400, env, request)
    client_id, client_secret = provider_config(env, provider)
    if not client_id or not client_secret:
        return error_response(f"{provider.title()} OAuth is not configured", 503, env, request)
    state = oauth_state(provider)
    redirect_uri = callback_uri(request, provider, env)
    if provider == "github":
        url = "https://github.com/login/oauth/authorize?" + urlencode({"client_id": client_id, "redirect_uri": redirect_uri, "scope": "read:user user:email", "state": state})
    else:
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({"client_id": client_id, "redirect_uri": redirect_uri, "response_type": "code", "scope": "openid profile email", "access_type": "offline", "prompt": "select_account", "state": state})
    cookie = set_cookie_header("oauth_state", state, request, max_age=600)
    return redirect_response(url, request, env, [cookie])


@route("GET", "/auth/callback/google")
def auth_callback(request, env):
    parsed = urlparse(request.url)
    params = parse_qs(parsed.query)
    provider = parsed.path.rsplit("/", 1)[-1].lower()
    if provider not in {"github", "google"}: provider = (params.get("provider", [None])[0] or "").lower()
    code = params.get("code", [None])[0]
    state = params.get("state", [None])[0]
    cookie_state = get_cookie(request, "oauth_state")
    if provider not in {"github", "google"} or not code or not state or not cookie_state:
        return error_response("Invalid OAuth callback", 400, env, request)
    if state != cookie_state or not state.startswith(provider + "."):
        return error_response("Invalid OAuth state", 400, env, request)

    client_id, client_secret = provider_config(env, provider)
    if not client_id or not client_secret:
        return error_response(f"{provider.title()} OAuth is not configured", 503, env, request)
    try:
        redirect_uri = callback_uri(request, provider, env)
        token_data = exchange_oauth_code(provider, code, redirect_uri, client_id, client_secret)
        access_token = token_data.get("access_token")
        if not access_token:
            return error_response("OAuth provider did not return an access token", 502, env, request)
        profile = provider_profile(provider, access_token)
        if not profile.get("provider_id"):
            return error_response("Could not identify the authenticated account", 502, env, request)
        if provider == "github":
            allowed_id = env_value(env, "ALLOWED_GITHUB_ID")
            if allowed_id and profile["provider_id"] != str(allowed_id):
                return error_response("GitHub account is not authorized for this instance", 403, env, request)

        db = env.DB
        user_id = upsert_user(db, profile)
        session_token = random_token(32)
        db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))").bind(session_token, user_id).run()
        target = frontend_origin(env, request) + "/onboarding"
        # If already completed, callback still lands on onboarding which will immediately let the user enter NO CAP.
        return redirect_response(target, request, env, [set_cookie_header("nocap_session", session_token, request, max_age=60 * 60 * 24 * 30)])
    except Exception as exc:
        return error_response(f"Authentication failed: {str(exc)}", 502, env, request)


# Same callback handler for GitHub; provider is read from the path.
ROUTES[("GET", "/auth/callback/github")] = auth_callback

@route("GET", "/auth/me")
def auth_me(request, env):
    token = get_cookie(request, "nocap_session")
    if not token:
        return json_response({"user": None}, env=env, request=request)
    row = env.DB.prepare(
        "SELECT id, email, name, avatar_url, auth_provider, timezone, onboarding_completed, preferences_json FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
    ).bind(token).first()
    if not row:
        return json_response({"user": None}, env=env, request=request)
    prefs = json.loads(row.preferences_json or "{}")
    return json_response({"user": {
        "id": row.id, "email": row.email or "", "name": row.name or "NO CAP learner", "avatar_url": row.avatar_url or "", "auth_provider": row.auth_provider or "github", "timezone": row.timezone or "UTC", "onboarding_completed": bool(row.onboarding_completed), "goals": prefs.get("goals", []), "weekly_minutes": prefs.get("weekly_minutes", 30)
    }}, env=env, request=request)


@route("POST", "/auth/logout")
def auth_logout(request, env):
    if not origin_allowed(request, env):
        return error_response("Origin not allowed", 403, env, request)
    token = get_cookie(request, "nocap_session")
    if token:
        env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run()
    return Response.new("", {"status": 200, "headers": {"Set-Cookie": clear_cookie_header("nocap_session", request), **cors_headers(env, request)}})


def get_authenticated_user_id(request, env):
    token = get_cookie(request, "nocap_session")
    if not token:
        return None
    session = env.DB.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").bind(token).first()
    return session.user_id if session else None


@route("GET", "/v1/profile")
def get_profile(request, env):
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401, env, request)
    row = env.DB.prepare("SELECT id, email, name, avatar_url, auth_provider, timezone, onboarding_completed, preferences_json FROM users WHERE id = ?").bind(user_id).first()
    prefs = json.loads(row.preferences_json or "{}") if row else {}
    return json_response({"user": {"id": row.id, "email": row.email or "", "name": row.name or "", "avatar_url": row.avatar_url or "", "auth_provider": row.auth_provider or "github", "timezone": row.timezone or "UTC", "onboarding_completed": bool(row.onboarding_completed), "goals": prefs.get("goals", []), "weekly_minutes": prefs.get("weekly_minutes", 30)}}, env=env, request=request)


@route("PATCH", "/v1/profile")
def update_profile(request, env):
    if not origin_allowed(request, env):
        return error_response("Origin not allowed", 403, env, request)
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401, env, request)
    body = json.loads(request.text() or "{}")
    current = env.DB.prepare("SELECT preferences_json FROM users WHERE id = ?").bind(user_id).first()
    prefs = json.loads((current.preferences_json if current else "{}") or "{}")
    if isinstance(body.get("goals"), list): prefs["goals"] = [str(x)[:100] for x in body["goals"][:8]]
    if body.get("weekly_minutes") is not None: prefs["weekly_minutes"] = max(5, min(240, int(body.get("weekly_minutes"))))
    name = str(body.get("name", "")).strip()[:120]
    timezone = str(body.get("timezone", "UTC")).strip()[:80]
    completed = 1 if body.get("onboarding_complete") or body.get("completed") else None
    if completed is not None:
        env.DB.prepare("UPDATE users SET name = ?, timezone = ?, onboarding_completed = ?, preferences_json = ?, updated_at = datetime('now') WHERE id = ?").bind(name, timezone, completed, json.dumps(prefs), user_id).run()
    else:
        env.DB.prepare("UPDATE users SET name = ?, timezone = ?, preferences_json = ?, updated_at = datetime('now') WHERE id = ?").bind(name, timezone, json.dumps(prefs), user_id).run()
    return get_profile(request, env)


@route("GET", "/v1/state")
def get_state(request, env):
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401, env, request)
    db = env.DB
    mastery_rows = db.prepare("SELECT * FROM mastery WHERE user_id = ?").bind(user_id).all()
    review_rows = db.prepare("SELECT * FROM review_items WHERE user_id = ?").bind(user_id).all()
    attempt_rows = db.prepare("SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 500").bind(user_id).all()
    note_rows = db.prepare("SELECT * FROM notes WHERE user_id = ?").bind(user_id).all()
    highlight_rows = db.prepare("SELECT * FROM highlights WHERE user_id = ?").bind(user_id).all()
    bookmark_rows = db.prepare("SELECT * FROM bookmarks WHERE user_id = ?").bind(user_id).all()
    profile = db.prepare("SELECT preferences_json FROM users WHERE id = ?").bind(user_id).first()
    prefs = json.loads((profile.preferences_json if profile else "{}") or "{}")
    return json_response({
        "mastery": {r.concept_slug: row_to_dict(r) for r in mastery_rows.results},
        "review_items": {r.concept_slug: row_to_dict(r) for r in review_rows.results},
        "attempts": [row_to_dict(r) for r in attempt_rows.results],
        "notes": [row_to_dict(r) for r in note_rows.results],
        "highlights": [row_to_dict(r) for r in highlight_rows.results],
        "bookmarks": [row_to_dict(r) for r in bookmark_rows.results],
        "confusing_concepts": prefs.get("confusing_concepts", []),
        "streak": prefs.get("streak", {"current": 0, "longest": 0, "last_active": "", "recovery_tokens": 3}),
        "last_visited_positions": prefs.get("last_visited_positions", {}),
    }, env=env, request=request)


@route("POST", "/v1/state/sync")
def sync_state(request, env):
    if not origin_allowed(request, env):
        return error_response("Origin not allowed", 403, env, request)
    user_id = get_authenticated_user_id(request, env)
    if not user_id:
        return error_response("Not authenticated", 401, env, request)
    raw_body = request.text() or "{}"
    if len(raw_body) > 750_000:
        return error_response("Sync payload too large", 413, env, request)
    body = json.loads(raw_body)
    db = env.DB
    for slug, record in body.get("mastery", {}).items():
        db.prepare(
            "INSERT INTO mastery (user_id, concept_slug, learn_score, recall_score, apply_score, explain_score, interview_score, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, concept_slug) DO UPDATE SET learn_score=excluded.learn_score, recall_score=excluded.recall_score, apply_score=excluded.apply_score, explain_score=excluded.explain_score, interview_score=excluded.interview_score, state=excluded.state, updated_at=datetime('now')"
        ).bind(user_id, slug, record.get("learn_score", 0), record.get("recall_score", 0), record.get("apply_score", 0), record.get("explain_score", 0), record.get("interview_score", 0), record.get("state", "not_started")).run()
    for slug, item in body.get("review_items", {}).items():
        db.prepare(
            "INSERT INTO review_items (user_id, concept_slug, due_at, interval_days, ease, repetitions, last_quality) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, concept_slug) DO UPDATE SET due_at=excluded.due_at, interval_days=excluded.interval_days, ease=excluded.ease, repetitions=excluded.repetitions, last_quality=excluded.last_quality"
        ).bind(user_id, slug, item.get("due_at"), item.get("interval_days", 0.04), item.get("ease", 2.5), item.get("repetitions", 0), item.get("last_quality")).run()
    if "notes" in body:
        db.prepare("DELETE FROM notes WHERE user_id = ?").bind(user_id).run()
        for note in body["notes"]:
            db.prepare("INSERT INTO notes (id,user_id,concept_slug,block_id,title,body,selected_text,anchor_start,anchor_end,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(note.get("id"), user_id, note.get("concept_slug"), note.get("block_id"), note.get("title"), note.get("body"), note.get("selected_text"), note.get("anchor_start"), note.get("anchor_end"), note.get("created_at"), note.get("updated_at")).run()
    if "highlights" in body:
        db.prepare("DELETE FROM highlights WHERE user_id = ?").bind(user_id).run()
        for hl in body["highlights"]:
            db.prepare("INSERT INTO highlights (id,user_id,concept_slug,block_id,selected_text,color,created_at) VALUES (?,?,?,?,?,?,?)").bind(hl.get("id"), user_id, hl.get("concept_slug"), hl.get("block_id"), hl.get("selected_text"), hl.get("color"), hl.get("created_at")).run()
    if "bookmarks" in body:
        db.prepare("DELETE FROM bookmarks WHERE user_id = ?").bind(user_id).run()
        for bm in body["bookmarks"]:
            db.prepare("INSERT INTO bookmarks (id,user_id,concept_slug,block_id,label,created_at) VALUES (?,?,?,?,?,?)").bind(bm.get("id"), user_id, bm.get("concept_slug"), bm.get("block_id"), bm.get("label"), bm.get("created_at")).run()
    prefs_row = db.prepare("SELECT preferences_json FROM users WHERE id = ?").bind(user_id).first()
    prefs = json.loads((prefs_row.preferences_json if prefs_row else "{}") or "{}")
    if "confusing_concepts" in body: prefs["confusing_concepts"] = body["confusing_concepts"]
    if "streak" in body: prefs["streak"] = body["streak"]
    if "last_visited_positions" in body: prefs["last_visited_positions"] = body["last_visited_positions"]
    db.prepare("UPDATE users SET preferences_json = ?, updated_at = datetime('now') WHERE id = ?").bind(json.dumps(prefs), user_id).run()
    return json_response({"status": "synced", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}, env=env, request=request)


@route("GET", "/v1/health")
def health(request, env):
    return json_response({"status": "ok", "version": "0.2.0", "auth": ["google", "github"]}, env=env, request=request)


@route("GET", "/v1/quota/today")
def quota_today(request, env):
    return json_response({"worker": {"used": 0, "limit": 100000, "unit": "req"}, "d1_read": {"used": 0, "limit": 5000000, "unit": "rows"}, "d1_write": {"used": 0, "limit": 100000, "unit": "rows"}}, env=env, request=request)


def row_to_dict(row):
    return dict(row) if row is not None else None


def on_fetch(request, env, ctx):
    if request.method == "OPTIONS":
        return Response.new("", {"status": 204, "headers": cors_headers(env, request) | {"Access-Control-Max-Age": "86400"}})
    path = urlparse(request.url).path
    handler = ROUTES.get((request.method, path))
    if not handler:
        return error_response("not_found", 404, env, request)
    try:
        return handler(request, env)
    except Exception as exc:
        return error_response(f"Internal error: {str(exc)}", 500, env, request)

export = {"fetch": on_fetch}
