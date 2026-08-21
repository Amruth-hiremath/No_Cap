/**
 * NO CAP Cloudflare Worker API
 *
 * TypeScript Worker for:
 * - Google + GitHub OAuth
 * - secure HttpOnly sessions
 * - D1-backed profile + learning state
 * - cross-device sync
 *
 * The core NO CAP lessons remain static in Next.js.
 */


function envValue(env, key, fallback) {
  const value = env[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function frontendOrigin(env, request) {
  return (envValue(env, "FRONTEND_ORIGIN") ?? new URL(request.url).origin).replace(/\/$/, "");
}

function corsHeaders(env, request) {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("Origin");
  const allowed = envValue(env, "FRONTEND_ORIGIN");

  if (origin && (!allowed || origin === allowed)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  }

  return headers;
}

function jsonResponse(
  data,
  status,
  env,
  request,
  extraHeaders,
) {
  const headers = corsHeaders(env, request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(
  message,
  status,
  env,
  request,
) {
  return jsonResponse({ error: message }, status, env, request);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  for (const piece of cookieHeader.split(";")) {
    const [rawKey, ...rest] = piece.trim().split("=");
    if (rawKey === name) return rest.join("=");
  }
  return null;
}

function isSecureRequest(request) {
  const url = new URL(request.url);
  return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
}

function serializeCookie(
  name,
  value,
  request,
  maxAge,
  options = {},
) {
  const parts = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    `SameSite=${options.sameSite || "Lax"}`,
  ];

  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (isSecureRequest(request)) parts.push("Secure");

  return parts.join("; ");
}
function expiredCookie(name, request) {
  return serializeCookie(name, "", request, 0);
}

function redirectResponse(
  location,
  request,
  env,
  cookies = [],
) {
  const headers = corsHeaders(env, request);
  headers.set("Location", location);
  headers.set("Cache-Control", "no-store");
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => v.toString(16).padStart(2, "0")).join("");
}

function makeOAuthState(provider) {
  return `${provider}.${randomToken(16)}`;
}

function providerConfig(env, provider) {
  if (provider === "github") {
    return {
      clientId: envValue(env, "GITHUB_CLIENT_ID"),
      clientSecret: envValue(env, "GITHUB_CLIENT_SECRET"),
    };
  }
  return {
    clientId: envValue(env, "GOOGLE_CLIENT_ID"),
    clientSecret: envValue(env, "GOOGLE_CLIENT_SECRET"),
  };
}

function publicOrigin(request, env) {
  const forwarded = request.headers.get("x-nocap-forwarded-origin");
  if (forwarded && /^https:\/\/[^/]+$/i.test(forwarded)) {
    const configured = envValue(env, "FRONTEND_ORIGIN");
    if (!configured || forwarded.replace(/\/$/, "") === configured.replace(/\/$/, "")) {
      return forwarded.replace(/\/$/, "");
    }
  }
  const configured = envValue(env, "APP_ORIGIN");
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function callbackUri(request, provider, env) {
  return `${publicOrigin(request, env)}/auth/callback/${provider}`;
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  const allowed = envValue(env, "FRONTEND_ORIGIN");
  if (allowed) return origin.replace(/\/$/, "") === allowed.replace(/\/$/, "");

  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function exchangeOAuthCode(
  provider,
  code,
  redirectUri,
  clientId,
  clientSecret,
) {
  if (provider === "github") {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const { response, data } = await fetchJson(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed (${response.status})`);
    }
    return data;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const { response, data } = await fetchJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }
  return data;
}

async function githubProfile(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "User-Agent": "NO-CAP",
  };

  const profileResult = await fetchJson("https://api.github.com/user", { headers });
  if (!profileResult.response.ok) {
    throw new Error(`GitHub profile lookup failed (${profileResult.response.status})`);
  }

  const profile = profileResult.data;
  let email = typeof profile.email === "string" ? profile.email : "";
  let emailVerified = false;

  const emailsResult = await fetchJson("https://api.github.com/user/emails", { headers });
  if (emailsResult.response.ok && Array.isArray(emailsResult.data)) {
    const primary = emailsResult.data.find(
      (entry) => entry?.primary && entry?.verified,
    );
    if (primary?.email) {
      email = primary.email;
      emailVerified = true;
    }
  }

  return {
    provider: "github",
    provider_id: String(profile.id),
    email,
    email_verified: emailVerified,
    name: profile.name || profile.login || "NO CAP learner",
    avatar_url: profile.avatar_url || "",
  };
}

async function googleProfile(accessToken) {
  const result = await fetchJson(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!result.response.ok) {
    throw new Error(`Google profile lookup failed (${result.response.status})`);
  }

  const profile = result.data;
  return {
    provider: "google",
    provider_id: String(profile.sub),
    email: profile.email || "",
    email_verified: Boolean(profile.email_verified),
    name: profile.name || profile.email || "NO CAP learner",
    avatar_url: profile.picture || "",
  };
}

async function providerProfile(
  provider,
  accessToken,
) {
  return provider === "github"
    ? githubProfile(accessToken)
    : googleProfile(accessToken);
}

async function upsertUser(db, profile) {
  const existing = await db
    .prepare(
      "SELECT id FROM users WHERE auth_provider = ? AND provider_user_id = ?",
    )
    .bind(profile.provider, profile.provider_id)
    .first();

  if (existing?.id) {
    await db
      .prepare(
        "UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(profile.email, profile.name, profile.avatar_url, existing.id)
      .run();
    return existing.id;
  }

  if (profile.email && profile.email_verified) {
    const existingByEmail = await db
      .prepare("SELECT id FROM users WHERE lower(email) = lower(?)")
      .bind(profile.email)
      .first();

    if (existingByEmail?.id) {
      await db
        .prepare(
          "UPDATE users SET auth_provider = ?, provider_user_id = ?, email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(
          profile.provider,
          profile.provider_id,
          profile.email,
          profile.name,
          profile.avatar_url,
          existingByEmail.id,
        )
        .run();
      return existingByEmail.id;
    }
  }

  const legacyKey = `${profile.provider}:${profile.provider_id}`;
  const result = await db
    .prepare(
      "INSERT INTO users (github_id, auth_provider, provider_user_id, email, name, avatar_url, onboarding_completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))",
    )
    .bind(
      legacyKey,
      profile.provider,
      profile.provider_id,
      profile.email,
      profile.name,
      profile.avatar_url,
    )
    .run();

  return Number(result.meta.last_row_id);
}

async function getAuthenticatedUserId(
  request,
  env,
) {
  const token = getCookie(request, "nocap_session");
  if (!token) return null;

  const row = await env.DB
    .prepare(
      "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')",
    )
    .bind(token)
    .first();

  return row?.user_id ?? null;
}

function prefsFromRow(row) {
  if (!row?.preferences_json) return {};
  try {
    const parsed = JSON.parse(row.preferences_json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function profilePayload(row, prefs) {
  return {
    id: row.id,
    email: row.email || "",
    name: row.name || "NO CAP learner",
    avatar_url: row.avatar_url || "",
    auth_provider: row.auth_provider === "google" ? "google" : "github",
    timezone: row.timezone || "UTC",
    onboarding_completed: Boolean(row.onboarding_completed),
    goals: Array.isArray(prefs.goals) ? prefs.goals : [],
    weekly_minutes:
      typeof prefs.weekly_minutes === "number" ? prefs.weekly_minutes : 30,
  };
}

async function getProfileResponse(
  request,
  env,
  userId,
) {
  const row = await env.DB
    .prepare(
      "SELECT id, email, name, avatar_url, auth_provider, timezone, onboarding_completed, preferences_json FROM users WHERE id = ?",
    )
    .bind(userId)
    .first();

  if (!row) return errorResponse("User not found", 404, env, request);

  return jsonResponse({ user: profilePayload(row, prefsFromRow(row)) }, 200, env, request);
}

const requestLimiters = new Map();
function allowRequest(key, limit, windowMs) {
  const now = Date.now();
  const current = requestLimiters.get(key);
  if (!current || now >= current.resetAt) {
    requestLimiters.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
function requestFingerprint(request, suffix = '') {
  return `${request.headers.get('cf-connecting-ip') || 'unknown'}:${suffix}`;
}

async function handleAuthLogin(
  request,
  env,
) {
  const url = new URL(request.url);
  const provider = (url.searchParams.get("provider") || "github").toLowerCase();

  if (provider !== "github" && provider !== "google") {
    return errorResponse("Unsupported provider", 400, env, request);
  }

  if (!allowRequest(requestFingerprint(request, `auth:${provider}`), 8, 10 * 60 * 1000)) {
    return errorResponse("Too many authentication attempts. Please try again later.", 429, env, request);
  }

  const { clientId, clientSecret } = providerConfig(env, provider);
  if (!clientId || !clientSecret) {
    return errorResponse(
      `${provider === "github" ? "GitHub" : "Google"} OAuth is not configured`,
      503,
      env,
      request,
    );
  }

  const state = makeOAuthState(provider);
  const redirectUri = callbackUri(request, provider, env);

  await env.DB.prepare(
    "DELETE FROM oauth_states WHERE expires_at <= datetime('now')",
  ).run();
  await env.DB.prepare(
    "INSERT INTO oauth_states (state, provider, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))",
  ).bind(state, provider).run();

  const authUrl =
    provider === "github"
      ? new URL("https://github.com/login/oauth/authorize")
      : new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  if (provider === "github") {
    authUrl.searchParams.set("scope", "read:user user:email");
  } else {
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("access_type", "online");
    authUrl.searchParams.set("prompt", "select_account");
  }

  return redirectResponse(
    authUrl.toString(),
    request,
    env,
  );
}

async function handleAuthCallback(
  request,
  env,
  provider,
) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return errorResponse("Invalid OAuth callback", 400, env, request);
  }

  const stateRow = await env.DB
    .prepare(
      "SELECT state, provider FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > datetime('now')",
    )
    .bind(state, provider)
    .first();

  if (!stateRow?.state) {
    return errorResponse("Invalid or expired OAuth state", 400, env, request);
  }

  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

  const { clientId, clientSecret } = providerConfig(env, provider);
  if (!clientId || !clientSecret) {
    return errorResponse(
      `${provider === "github" ? "GitHub" : "Google"} OAuth is not configured`,
      503,
      env,
      request,
    );
  }

  try {
    const tokenData = await exchangeOAuthCode(
      provider,
      code,
      callbackUri(request, provider, env),
      clientId,
      clientSecret,
    );

    if (!tokenData.access_token) {
      return errorResponse("OAuth provider did not return an access token", 502, env, request);
    }

    const profile = await providerProfile(provider, tokenData.access_token);

    if (!profile.provider_id) {
      return errorResponse("Could not identify the authenticated account", 502, env, request);
    }

    if (provider === "github") {
      const allowedId = envValue(env, "ALLOWED_GITHUB_ID");
      if (allowedId && profile.provider_id !== String(allowedId)) {
        return errorResponse(
          "GitHub account is not authorized for this instance",
          403,
          env,
          request,
        );
      }
    }

    const userId = await upsertUser(env.DB, profile);
    const sessionToken = randomToken(32);

    await env.DB
      .prepare(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))",
      )
      .bind(sessionToken, userId)
      .run();

    const user = await env.DB
      .prepare(
        "SELECT onboarding_completed FROM users WHERE id = ?",
      )
      .bind(userId)
      .first();

    const target = user?.onboarding_completed
      ? frontendOrigin(env, request) + "/"
      : frontendOrigin(env, request) + "/onboarding";

    return redirectResponse(
      target,
      request,
      env,
      [
        serializeCookie("nocap_session", sessionToken, request, 60 * 60 * 24 * 30, { sameSite: "Lax" }),
      ],
    );
  } catch (error) {
    console.error("Authentication failed", error);
    return errorResponse("Authentication failed", 502, env, request);
  }
}

async function handleAuthMe(
  request,
  env,
) {
  const token = getCookie(request, "nocap_session");
  if (!token) return jsonResponse({ user: null }, 200, env, request);

  const row = await env.DB
    .prepare(
      "SELECT u.id, u.email, u.name, u.avatar_url, u.auth_provider, u.timezone, u.onboarding_completed, u.preferences_json FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')",
    )
    .bind(token)
    .first();

  if (!row) {
    return jsonResponse({ user: null }, 200, env, request);
  }

  return jsonResponse(
    { user: profilePayload(row, prefsFromRow(row)) },
    200,
    env,
    request,
  );
}

async function handleLogout(request, env) {
  if (!originAllowed(request, env)) {
    return errorResponse("Origin not allowed", 403, env, request);
  }

  const token = getCookie(request, "nocap_session");
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  return jsonResponse(
    { ok: true },
    200,
    env,
    request,
    { "Set-Cookie": expiredCookie("nocap_session", request) },
  );
}

async function handleGetProfile(
  request,
  env,
) {
  const userId = await getAuthenticatedUserId(request, env);
  if (!userId) return errorResponse("Not authenticated", 401, env, request);
  return getProfileResponse(request, env, userId);
}

async function handleUpdateProfile(
  request,
  env,
) {
  if (!originAllowed(request, env)) {
    return errorResponse("Origin not allowed", 403, env, request);
  }

  const userId = await getAuthenticatedUserId(request, env);
  if (!userId) return errorResponse("Not authenticated", 401, env, request);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, env, request);
  }

  const current = await env.DB
    .prepare("SELECT preferences_json FROM users WHERE id = ?")
    .bind(userId)
    .first();

  const prefs = prefsFromRow(current);

  if (Array.isArray(body.goals)) {
    prefs.goals = body.goals.map(String).slice(0, 8).map((value) => value.slice(0, 100));
  }

  if (body.weekly_minutes !== undefined) {
    const minutes = Number(body.weekly_minutes);
    if (!Number.isFinite(minutes)) {
      return errorResponse("weekly_minutes must be numeric", 400, env, request);
    }
    prefs.weekly_minutes = Math.max(5, Math.min(240, Math.round(minutes)));
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  const timezone = String(body.timezone ?? "UTC").trim().slice(0, 80);
  const completed =
    body.onboarding_complete === true || body.completed === true ? 1 : null;

  if (completed !== null) {
    await env.DB
      .prepare(
        "UPDATE users SET name = ?, timezone = ?, onboarding_completed = ?, preferences_json = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(name, timezone, completed, JSON.stringify(prefs), userId)
      .run();
  } else {
    await env.DB
      .prepare(
        "UPDATE users SET name = ?, timezone = ?, preferences_json = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(name, timezone, JSON.stringify(prefs), userId)
      .run();
  }

  return getProfileResponse(request, env, userId);
}

function rowToRecord(row) {
  return { ...row };
}

async function handleGetState(
  request,
  env,
) {
  const userId = await getAuthenticatedUserId(request, env);
  if (!userId) return errorResponse("Not authenticated", 401, env, request);
  if (!allowRequest(requestFingerprint(request, `state:${userId}`), 20, 60 * 1000)) {
    return errorResponse("state_rate_limited", 429, env, request);
  }

  const [masteryRows, reviewRows, attemptRows, noteRows, highlightRows, bookmarkRows, workspaceRows, profile] =
    await Promise.all([
      env.DB.prepare("SELECT * FROM mastery WHERE user_id = ?").bind(userId).all(),
      env.DB.prepare("SELECT * FROM review_items WHERE user_id = ?").bind(userId).all(),
      env.DB.prepare("SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 500").bind(userId).all(),
      env.DB.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 500").bind(userId).all(),
      env.DB.prepare("SELECT * FROM highlights WHERE user_id = ? ORDER BY created_at DESC LIMIT 800").bind(userId).all(),
      env.DB.prepare("SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT 500").bind(userId).all(),
      env.DB.prepare("SELECT * FROM workspace_notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100").bind(userId).all(),
      env.DB.prepare("SELECT preferences_json FROM users WHERE id = ?").bind(userId).first(),
    ]);

  const mastery = {};
  for (const row of masteryRows.results) {
    mastery[row.concept_slug] = rowToRecord(row);
  }

  const reviewItems = {};
  for (const row of reviewRows.results) {
    reviewItems[row.concept_slug] = rowToRecord(row);
  }

  const prefs = prefsFromRow(profile);

  return jsonResponse(
    {
      mastery,
      review_items: reviewItems,
      attempts: attemptRows.results.map((r) => rowToRecord(r)),
      notes: noteRows.results.map((r) => rowToRecord(r)),
      highlights: highlightRows.results.map((r) => rowToRecord(r)),
      bookmarks: bookmarkRows.results.map((r) => rowToRecord(r)),
      workspace_notes: workspaceRows.results.map((row) => {
        const record = row;
        return {
          id: record.id,
          title: record.title || "Untitled note",
          blocks: safeJsonArray(record.blocks_json),
          canvas_elements: safeJsonArray(record.canvas_elements_json),
          created_at: record.created_at,
          updated_at: record.updated_at,
        };
      }),
      confusing_concepts: Array.isArray(prefs.confusing_concepts)
        ? prefs.confusing_concepts
        : [],
      streak: prefs.streak ?? {
        current: 0,
        longest: 0,
        last_active: "",
        recovery_tokens: 3,
      },
      last_visited_positions:
        prefs.last_visited_positions && typeof prefs.last_visited_positions === "object"
          ? prefs.last_visited_positions
          : {},
    },
    200,
    env,
    request,
    { "Cache-Control": "private, no-store" },
  );
}

function safeJsonArray(value) {
  if (typeof value !== "string") return Array.isArray(value) ? value : [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


async function syncCollection(db, table, incoming, userId, columns, updateColumns, idField = "id", deleteMissing = true) {
  if (!Array.isArray(incoming)) return;
  const existingRows = (await db.prepare(`SELECT ${[idField, ...updateColumns].join(', ')} FROM ${table} WHERE user_id = ?`).bind(userId).all()).results || [];
  const existing = new Map(existingRows.map((r) => [String(r[idField]), r]));
  const seen = new Set();
  const operations = [];
  for (const item of incoming) {
    const id = String(item?.[idField] ?? "");
    if (!id) continue;
    seen.add(id);
    const values = columns.map((c) => item?.[c] ?? null);
    const prev = existing.get(id);
    const changed = !prev || updateColumns.some((c) => String(prev[c] ?? "") !== String(item?.[c] ?? ""));
    if (!changed) continue;
    const placeholders = Array(columns.length + 2).fill('?').join(',');
    const sql = `INSERT INTO ${table} (${[id, 'user_id', ...columns].join(',')}) VALUES (${placeholders}) ON CONFLICT(${idField}) DO UPDATE SET ${updateColumns.map((c) => `${c}=excluded.${c}`).join(', ')}`;
    operations.push(db.prepare(sql).bind(id, userId, ...values));
  }
  if (deleteMissing) {
    for (const id of existing.keys()) {
      if (!seen.has(id)) operations.push(db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND ${idField} = ?`).bind(userId, id));
    }
  }
  if (operations.length) await db.batch(operations);
}

const syncThrottle = new Map();

async function handleSyncState(
  request,
  env,
) {
  // Best-effort per-isolate throttle: prevents accidental client loops from
  // hammering D1 while remaining zero-cost on the Free plan.
  const throttleKey = getCookie(request, "nocap_session") || request.headers.get("cf-connecting-ip") || "anon";
  const throttleNow = Date.now();
  const last = syncThrottle.get(throttleKey) || 0;
  if (throttleNow - last < 5000) return errorResponse("sync_rate_limited", 429, env, request);
  syncThrottle.set(throttleKey, throttleNow);
  if (syncThrottle.size > 2000) {
    for (const [k, ts] of syncThrottle) if (throttleNow - ts > 60000) syncThrottle.delete(k);
  }
  if (!originAllowed(request, env)) {
    return errorResponse("Origin not allowed", 403, env, request);
  }

  const userId = await getAuthenticatedUserId(request, env);
  if (!userId) return errorResponse("Not authenticated", 401, env, request);

  const raw = await request.text();
  if (raw.length > 750_000) {
    return errorResponse("Sync payload too large", 413, env, request);
  }

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return errorResponse("Invalid JSON body", 400, env, request);
  }

  const db = env.DB;
  const limits = { mastery: 200, review_items: 200, attempts: 500, notes: 500, highlights: 800, bookmarks: 500, workspace_notes: 100, confusing_concepts: 200 };
  for (const [key, max] of Object.entries(limits)) {
    const value = body[key];
    if (Array.isArray(value) && value.length > max) return errorResponse(`${key}_limit_exceeded`, 413, env, request);
    if (key === 'mastery' || key === 'review_items') {
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > max) return errorResponse(`${key}_limit_exceeded`, 413, env, request);
    }
  }

  const masteryEntries = Object.entries(body.mastery ?? {});
  const reviewEntries = Object.entries(body.review_items ?? {});
  const operations = [];

  const currentMastery = new Map(((await db.prepare("SELECT * FROM mastery WHERE user_id = ?").bind(userId).all()).results || []).map((r) => [r.concept_slug, r]));
  for (const [slug, record] of masteryEntries) {
    const next = {
      learn_score: Number(record?.learn_score ?? 0), recall_score: Number(record?.recall_score ?? 0), apply_score: Number(record?.apply_score ?? 0), explain_score: Number(record?.explain_score ?? 0), interview_score: Number(record?.interview_score ?? 0), state: String(record?.state ?? "not_started")
    };
    const prev = currentMastery.get(slug);
    const changed = !prev || Object.entries(next).some(([k, v]) => String(prev[k] ?? '') !== String(v));
    if (changed) operations.push(db.prepare("INSERT INTO mastery (user_id, concept_slug, learn_score, recall_score, apply_score, explain_score, interview_score, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, concept_slug) DO UPDATE SET learn_score=excluded.learn_score, recall_score=excluded.recall_score, apply_score=excluded.apply_score, explain_score=excluded.explain_score, interview_score=excluded.interview_score, state=excluded.state, updated_at=datetime('now')").bind(userId, slug, ...Object.values(next)));
  }

  const currentReviews = new Map(((await db.prepare("SELECT * FROM review_items WHERE user_id = ?").bind(userId).all()).results || []).map((r) => [r.concept_slug, r]));
  for (const [slug, item] of reviewEntries) {
    const next = { due_at: String(item?.due_at ?? new Date().toISOString()), interval_days: Number(item?.interval_days ?? 0.04), ease: Number(item?.ease ?? 2.5), repetitions: Number(item?.repetitions ?? 0), last_quality: item?.last_quality ?? null };
    const prev = currentReviews.get(slug);
    const changed = !prev || Object.entries(next).some(([k, v]) => String(prev[k] ?? '') !== String(v ?? ''));
    if (changed) operations.push(db.prepare("INSERT INTO review_items (user_id, concept_slug, due_at, interval_days, ease, repetitions, last_quality) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, concept_slug) DO UPDATE SET due_at=excluded.due_at, interval_days=excluded.interval_days, ease=excluded.ease, repetitions=excluded.repetitions, last_quality=excluded.last_quality").bind(userId, slug, ...Object.values(next)));
  }

  const incomingMastery = new Set(masteryEntries.map(([slug]) => slug));
  for (const slug of currentMastery.keys()) {
    if (!incomingMastery.has(slug)) operations.push(db.prepare("DELETE FROM mastery WHERE user_id = ? AND concept_slug = ?").bind(userId, slug));
  }
  const incomingReviews = new Set(reviewEntries.map(([slug]) => slug));
  for (const slug of currentReviews.keys()) {
    if (!incomingReviews.has(slug)) operations.push(db.prepare("DELETE FROM review_items WHERE user_id = ? AND concept_slug = ?").bind(userId, slug));
  }
  if (operations.length) await db.batch(operations);

  await syncCollection(db, "notes", body.notes, userId, ["concept_slug", "block_id", "title", "body", "selected_text", "anchor_start", "anchor_end", "created_at", "updated_at"], ["concept_slug", "block_id", "title", "body", "selected_text", "anchor_start", "anchor_end", "created_at", "updated_at"]);
  await syncCollection(db, "highlights", body.highlights, userId, ["concept_slug", "block_id", "selected_text", "color", "created_at"], ["concept_slug", "block_id", "selected_text", "color", "created_at"]);
  await syncCollection(db, "bookmarks", body.bookmarks, userId, ["concept_slug", "block_id", "label", "created_at"], ["concept_slug", "block_id", "label", "created_at"]);
  await syncCollection(db, "workspace_notes", body.workspace_notes, userId, ["title", "blocks_json", "canvas_elements_json", "created_at", "updated_at"], ["title", "blocks_json", "canvas_elements_json", "created_at", "updated_at"]);
  await syncCollection(db, "attempts", body.attempts, userId, ["type", "ref_id", "concept_slug", "score", "response_json", "created_at"], ["type", "ref_id", "concept_slug", "score", "response_json", "created_at"], "id", false);

  const profile = await db
    .prepare("SELECT preferences_json FROM users WHERE id = ?")
    .bind(userId)
    .first();

  const prefs = prefsFromRow(profile);
  if (Array.isArray(body.confusing_concepts)) {
    prefs.confusing_concepts = body.confusing_concepts;
  }
  if (body.streak !== undefined) prefs.streak = body.streak;
  if (body.last_visited_positions !== undefined) {
    prefs.last_visited_positions = body.last_visited_positions;
  }

  await db
    .prepare(
      "UPDATE users SET preferences_json = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(JSON.stringify(prefs), userId)
    .run();

  return jsonResponse(
    { status: "synced", timestamp: new Date().toISOString() },
    200,
    env,
    request,
  );
}

async function handleHealth(request, env) {
  return jsonResponse(
    { status: "ok", version: "1.0.1", auth: ["google", "github"] },
    200,
    env,
    request,
    { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  );
}

async function handleQuota(request, env) {
  return jsonResponse(
    {
      worker: { used: 0, limit: 100000, unit: "req" },
      d1_read: { used: 0, limit: 5000000, unit: "rows" },
      d1_write: { used: 0, limit: 100000, unit: "rows" },
    },
    200,
    env,
    request,
  );
}

function routeKey(request) {
  return `${request.method.toUpperCase()} ${new URL(request.url).pathname}`;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      const headers = corsHeaders(env, request);
      headers.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers });
    }

    try {
      const key = routeKey(request);

      switch (key) {
        case "GET /auth/login":
          return await handleAuthLogin(request, env);

        case "GET /auth/callback/google":
          return await handleAuthCallback(request, env, "google");

        case "GET /auth/callback/github":
          return await handleAuthCallback(request, env, "github");

        case "GET /auth/me":
          return await handleAuthMe(request, env);

        case "POST /auth/logout":
          return await handleLogout(request, env);

        case "GET /v1/profile":
          return await handleGetProfile(request, env);

        case "PATCH /v1/profile":
          return await handleUpdateProfile(request, env);

        case "GET /v1/state":
          return await handleGetState(request, env);

        case "POST /v1/state/sync":
          return await handleSyncState(request, env);

        case "GET /v1/health":
          return await handleHealth(request, env);

        case "GET /v1/quota/today":
          return await handleQuota(request, env);

        default:
          return errorResponse("not_found", 404, env, request);
      }
    } catch (error) {
      console.error("Unhandled Worker error", error);
      return errorResponse("Internal error", 500, env, request);
    }
  },

  async scheduled(
    _controller,
    _env,
    _ctx,
  ) {
    // Cron hooks are intentionally lightweight in v0.1. They exist so the
    // deployment remains valid without pretending to run expensive jobs.
  },
};
