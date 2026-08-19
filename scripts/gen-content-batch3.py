#!/usr/bin/env python3
"""Deep content for: HTTP, Caching Strategies, Cache Aside, Consistent Hashing, Horizontal Scaling, SQL vs NoSQL, Replication, Sharding."""
import json, os
CONCEPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'concepts')

def write_concept(slug, data):
    fpath = os.path.join(CONCEPTS_DIR, f'{slug}.json')
    with open(fpath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    blocks = data.get('blocks', [])
    quizzes = sum(1 for b in blocks if b.get('type') == 'quiz')
    diagrams = sum(1 for b in blocks if b.get('type') == 'diagram')
    chars = sum(len(b.get('payload', {}).get('text', '')) for b in blocks if b.get('type') == 'prose')
    chars += len(data.get('summary', '')) + len(data.get('why_it_matters', ''))
    print(f'  ✓ {slug}: {len(blocks)} blocks, {diagrams} diagrams, {quizzes} quizzes, {chars} chars')

# ═══════════════════════════════════════════════════════════════════
# HTTP
# ═══════════════════════════════════════════════════════════════════
write_concept('http', {
    "slug": "http",
    "version": 3,
    "title": "HTTP — HyperText Transfer Protocol",
    "phase": "networking-communication",
    "area": "Networking & Communication",
    "estimated_minutes": 14,
    "difficulty": "core",
    "summary": "HTTP is the application-layer protocol that powers the web. It is request-response, stateless, and text-based (in HTTP/1.1). Understanding HTTP methods, status codes, headers, and the evolution from HTTP/1.1 to HTTP/2 to HTTP/3 is fundamental to every web system design.",
    "why_it_matters": "Every web API, every browser request, every microservice communication (over REST) uses HTTP. Knowing its semantics — what methods are safe vs idempotent, what status codes mean, how headers affect caching — is non-negotiable for system design. A misunderstanding of HTTP idempotency can cause double charges in a payment system.",
    "prerequisites": ["how-the-internet-works"],
    "related": ["tcp", "rest", "tls"],
    "used_in": ["Every web request.", "Every REST API.", "Most microservice communication."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "HTTP is a **request-response** protocol: a client sends a request, the server sends a response. It is **stateless** — each request is independent, and the server doesn't remember previous requests (unless you add cookies or sessions).\n\nThis statelessness is both a strength and a weakness: it makes HTTP easy to scale (any server can handle any request) but means the application must manage state through other means (cookies, tokens, server-side sessions)."}},

        {"type": "diagram", "id": "http-flow", "payload": {"ascii": "  Client (browser)                     Server\n  ─────────────────                    ─────\n\n  1. TCP connection ──────────────────→\n     (3-way handshake: SYN, SYN-ACK, ACK)\n\n  2. Request:\n     GET /users/42 HTTP/1.1\n     Host: api.example.com\n     Accept: application/json\n     Authorization: Bearer eyJ...\n                                        ────→\n\n  3. Response:\n                                        ←────\n     HTTP/1.1 200 OK\n     Content-Type: application/json\n     Content-Length: 47\n     Cache-Control: max-age=60\n\n     {\"id\":42,\"name\":\"Ada\",\"role\":\"admin\"}\n\n  4. TCP connection closed (HTTP/1.1)\n     or reused (HTTP/2 — multiplexed)", "caption": "A single HTTP request-response cycle over TCP.", "voice_alt_text": "A diagram of an HTTP request-response cycle. The client opens a TCP connection with a 3-way handshake, sends a request with a method (GET), path (/users/42), version (HTTP/1.1), and headers (Host, Accept, Authorization). The server responds with a status line (200 OK), headers (Content-Type, Content-Length, Cache-Control), and a body (JSON). In HTTP/1.1 the connection is then closed; in HTTP/2 it can be reused for multiplexed requests."}},

        {"type": "prose", "id": "methods", "payload": {"text": "**HTTP methods and their semantics:**\n\n| Method | Safe? | Idempotent? | Purpose |\n|--------|-------|-------------|---------|\n| **GET** | Yes | Yes | Fetch a resource. No side effects. Cacheable. |\n| **POST** | No | No | Create a resource. Side effects, not idempotent. |\n| **PUT** | No | Yes | Replace a resource. Same request twice = same state. |\n| **DELETE** | No | Yes | Remove a resource. Second delete returns 404 but state is same. |\n| **PATCH** | No | Maybe | Partially update. Idempotent if it's 'set to X', not if it's 'increment by 1'. |\n\n**Safe** methods have no side effects — calling them doesn't change server state. They can be cached and prefetched.\n\n**Idempotent** methods can be safely retried — doing them once or 100 times produces the same result. This matters for unreliable networks: if a request times out, you can safely retry idempotent methods but not non-idempotent ones."}},

        {"type": "callout", "id": "idempotency", "payload": {"title": "Why idempotency is critical for payments", "body": "If a network blip causes your payment request to time out, should you retry? If the method is idempotent (PUT, DELETE), yes — retrying is safe. If it's POST (not idempotent), retrying might charge the user twice. This is why payment APIs use **idempotency keys**: the client sends a unique ID with each request, and the server deduplicates. Stripe, Square, and Adyen all use this pattern. Without it, retries would be unsafe.", "kind": "note"}},

        {"type": "prose", "id": "status-codes", "payload": {"text": "**HTTP status codes** tell the client what happened:\n\n- **2xx Success**: 200 OK, 201 Created, 204 No Content\n- **3xx Redirect**: 301 Moved Permanently, 304 Not Modified (cache hit — don't re-download)\n- **4xx Client error**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests\n- **5xx Server error**: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout\n\nIn system design, **429** (rate limited) and **503** (unavailable) are especially important — they signal the client to back off or retry. Always include a `Retry-After` header with 429 so the client knows how long to wait.\n\n**Common mistakes:**\n- Returning 200 OK with an error body. This breaks HTTP semantics and client error handling. Use 4xx/5xx.\n- Returning 500 for client errors (bad input). Use 400.\n- Not returning 201 Created when a resource is created."}},

        {"type": "prose", "id": "versions", "payload": {"text": "**HTTP version evolution:**\n\n**HTTP/1.1** (1997): text-based protocol. One request per TCP connection (later, pipelining was added but suffered from head-of-line blocking). Headers sent as plain text on every request (cookies can be several KB). Still the most widely deployed version.\n\n**HTTP/2** (2015): binary framing. Multiple requests multiplexed over a single TCP connection — no head-of-line blocking at the HTTP level. Header compression (HPACK) reduces overhead. Server push (deprecated in practice). Adopted by most modern APIs.\n\n**HTTP/3** (2022): runs over QUIC (UDP-based). Eliminates TCP head-of-line blocking entirely — if one stream is slow, others aren't blocked. Faster connection setup (0-RTT — can send data on the first packet). Better on mobile networks (survives IP changes). Default in Chrome and Cloudflare.\n\nThe semantics (methods, status codes, headers) are the same across versions — only the transport changes. HTTP/3 is backward-compatible with HTTP/2 and HTTP/1.1 at the application layer."}},

        {"type": "diagram", "id": "http-versions", "payload": {"ascii": "  HTTP/1.1 — one request per connection\n  ─────────────────────────────────────\n  Client ──→ [TCP conn 1] ──→ GET /a ──→ Response A\n  Client ──→ [TCP conn 2] ──→ GET /b ──→ Response B\n  Client ──→ [TCP conn 3] ──→ GET /c ──→ Response C\n  3 TCP handshakes. Head-of-line blocking.\n\n  HTTP/2 — multiplexed over one connection\n  ─────────────────────────────────────\n  Client ──→ [TCP conn] ──→ GET /a, /b, /c (parallel streams)\n                              ┌──→ Response A\n                              ├──→ Response B\n                              └──→ Response C\n  1 TCP handshake. No HTTP-level blocking.\n  (But TCP-level blocking still possible.)\n\n  HTTP/3 — over QUIC (UDP)\n  ────────────────────────────\n  Client ──→ [QUIC conn] ──→ GET /a, /b, /c (independent streams)\n  No TCP. No head-of-line blocking at all.\n  0-RTT connection setup. Survives IP changes.", "caption": "HTTP/1.1: one request per connection. HTTP/2: multiplexed over one TCP. HTTP/3: QUIC/UDP, no blocking.", "voice_alt_text": "Three diagrams. HTTP/1.1: each request opens a separate TCP connection — 3 handshakes, head-of-line blocking. HTTP/2: all requests multiplex over one TCP connection — 1 handshake, parallel streams. But TCP-level blocking is still possible. HTTP/3: uses QUIC over UDP — independent streams, no TCP, no head-of-line blocking at all, 0-RTT connection setup."}},

        {"type": "prose", "id": "headers-caching", "payload": {"text": "**Key HTTP headers for system design:**\n\n**Caching:**\n- `Cache-Control: max-age=60` — cache for 60 seconds.\n- `ETag: \"abc123\"` — content hash. Client sends `If-None-Match: 'abc123'` — if unchanged, server returns 304 Not Modified (saves bandwidth).\n- `Last-Modified` / `If-Modified-Since` — timestamp-based caching.\n\n**Performance:**\n- `Connection: keep-alive` — reuse TCP connection (HTTP/1.1 default).\n- `Accept-Encoding: gzip` — compress response.\n- `Transfer-Encoding: chunked` — stream response without knowing total size.\n\n**Security:**\n- `Authorization: Bearer {token}` — auth token.\n- `Strict-Transport-Security` — force HTTPS.\n- `Content-Security-Policy` — prevent XSS.\n\n**Rate limiting:**\n- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` — tell client their quota.\n- `Retry-After: 30` — wait 30 seconds before retrying (sent with 429)."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "Your payment API receives a POST /charges request, but the network times out before you get a response. The user might have been charged, or might not have. What should you do?", "shape": "mcq", "options": ["Retry the POST immediately — it's probably fine.", "Don't retry — POST is not idempotent, you might double-charge.", "Always retry with the same request body.", "Convert the POST to a PUT."], "answer_index": 1, "rationale": "POST is not idempotent — retrying could create a second charge. The correct pattern is to use an idempotency key: the client generates a unique ID for this logical operation and sends it in a header (Idempotency-Key). The server stores the key and the result; if it sees the same key again, it returns the stored result instead of re-processing. Without an idempotency key, the safe behavior is to NOT retry — instead, query the system to check whether the charge went through.", "difficulty": "interview"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "What is the main performance improvement of HTTP/2 over HTTP/1.1?", "shape": "mcq", "options": ["HTTP/2 uses UDP instead of TCP.", "HTTP/2 allows multiplexing multiple requests over a single TCP connection.", "HTTP/2 compresses the response body.", "HTTP/2 removes the need for TLS."], "answer_index": 1, "rationale": "HTTP/1.1 opens a separate TCP connection per request (or uses pipelining, which suffers from head-of-line blocking). HTTP/2 uses binary framing to multiplex multiple requests over a single TCP connection — so a slow request doesn't block faster ones. HTTP/3 goes further by using QUIC (UDP) to eliminate TCP-level head-of-line blocking too. HTTP/2 does not compress bodies or remove TLS — those are separate concerns.", "difficulty": "core"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "Which HTTP status code should you return when a client has sent too many requests and is being rate-limited?", "shape": "mcq", "options": ["500 Internal Server Error", "403 Forbidden", "429 Too Many Requests", "503 Service Unavailable"], "answer_index": 2, "rationale": "429 Too Many Requests is the correct status code for rate limiting. It should include a Retry-After header telling the client how long to wait. 500 means the server crashed (not the client's fault). 403 means the client is not authorized (permanent, not temporary). 503 means the server is unavailable (server-side issue, not client-side rate limiting).", "difficulty": "core"}}
    ],
    "trade_offs": {
        "pros": [
            "Stateless — easy to scale (any server handles any request).",
            "Text-based (HTTP/1.1) — easy to debug with curl, telnet, browser dev tools.",
            "Wide support — every language, every platform, every firewall allows it.",
            "Caching built into the protocol (Cache-Control, ETag)."
        ],
        "cons": [
            "Request-response only — not suitable for server push (use WebSockets or SSE).",
            "Text-based HTTP/1.1 is inefficient — headers sent as text every time.",
            "Connection overhead — each TCP connection costs time (mitigated by HTTP/2 multiplexing).",
            "Verbose — JSON payloads are larger than binary protocols (gRPC/Protobufs)."
        ]
    },
    "failure_modes": [
        "Head-of-line blocking in HTTP/1.1 (a slow request blocks others on the same connection).",
        "Excessive header size — cookies can bloat requests to several KB.",
        "Connection exhaustion — too many concurrent connections overwhelm the server.",
        "Returning 200 OK for errors — breaks HTTP semantics and client error handling."
    ],
    "common_mistakes": [
        "Using GET for operations with side effects (violates HTTP semantics, breaks caching).",
        "Treating POST as idempotent (it's not — retries can duplicate).",
        "Returning 200 for errors — use proper 4xx/5xx codes so clients can handle them correctly.",
        "Not including Retry-After with 429 responses."
    ],
    "where_you_see_it": [
        "Every web request.",
        "Every REST API.",
        "Most microservice communication."
    ],
    "interview_prompts": [
        "What's the difference between HTTP/1.1, HTTP/2, and HTTP/3?",
        "Which HTTP methods are idempotent, and why does it matter?",
        "How would you design an API to be safely retryable?",
        "What status codes do you use for rate limiting? What header should you include?"
    ],
    "real_system_mappings": [
        {"system": "Stripe API", "how": "Uses idempotency keys for all POST requests so clients can safely retry payment operations without double-charging. Documented in their API guide."},
        {"system": "Cloudflare", "how": "Serves HTTP/3 to all clients by default, reducing connection latency globally. Also uses HTTP/2 Server Push (though this is being deprecated)."}
    ],
    "status": "published",
})

# ═══════════════════════════════════════════════════════════════════
# CACHING STRATEGIES
# ═══════════════════════════════════════════════════════════════════
write_concept('caching-strategies', {
    "slug": "caching-strategies",
    "version": 3,
    "title": "Caching Strategies",
    "phase": "caching",
    "area": "Caching",
    "estimated_minutes": 12,
    "difficulty": "core",
    "summary": "Caching stores frequently accessed data in faster storage. The strategy you choose — cache-aside, write-through, write-behind, or refresh-ahead — determines when data is written to the cache, how stale it can be, and what happens during failures. Choosing the wrong strategy causes stale data, cache stampedes, or data loss.",
    "why_it_matters": "Caching is the single most impactful performance optimization in most systems. A well-placed cache can reduce latency by 100x and reduce database load by 90%. But a poorly chosen caching strategy causes stale data, race conditions, and cache stampedes that take down the database. Understanding the four strategies — and when to use each — is a core system design skill.",
    "prerequisites": ["latency-vs-throughput"],
    "related": ["cache-aside", "write-through", "write-behind", "refresh-ahead"],
    "used_in": ["Every read-heavy system.", "Every performance-sensitive API.", "Netflix, Twitter, Facebook."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "A cache is a faster, smaller storage layer that sits between the application and the slower, larger source of truth (usually a database). The application checks the cache first; on a hit, it returns the cached value (fast). On a miss, it fetches from the database (slow) and writes the result to the cache for next time.\n\nThe **caching strategy** determines when and how data is written to the cache. There are four main strategies, each with different trade-offs in freshness, write latency, and failure behavior."}},

        {"type": "diagram", "id": "strategies", "payload": {"ascii": "  CACHE ASIDE (lazy loading)\n  ───────────────────────────\n  Read:  Cache → MISS → DB → write to Cache → return\n  Write: DB → invalidate Cache\n\n  Pros: cache only holds what's read. Fault-tolerant.\n  Cons: stale data window. Stampede on miss.\n\n\n  WRITE THROUGH\n  ─────────────\n  Write: App → Cache + DB (synchronously)\n  Read:  Cache → HIT → return\n\n  Pros: cache always fresh. No stale reads.\n  Cons: higher write latency (must write to both).\n\n\n  WRITE BEHIND (write-back)\n  ─────────────────────────\n  Write: App → Cache → return immediately\n  Cache → DB (asynchronously, batched)\n\n  Pros: very fast writes. DB load smoothed.\n  Cons: data loss if cache crashes before flush.\n\n\n  REFRESH AHEAD\n  ─────────────\n  Cache proactively refreshes popular items\n  BEFORE they expire.\n\n  Pros: popular items never miss.\n  Cons: wastes resources on items nobody reads.", "caption": "Four caching strategies: cache-aside, write-through, write-behind, refresh-ahead.", "voice_alt_text": "Four diagrams. Cache aside: on read, check cache, miss, fetch from DB, write to cache, return. On write, update DB and invalidate cache. Pros: cache only holds what's read, fault-tolerant. Cons: stale data window, stampede on miss. Write through: write to cache and DB synchronously. Pros: cache always fresh. Cons: higher write latency. Write behind: write to cache and return immediately, DB updated asynchronously. Pros: very fast writes. Cons: data loss if cache crashes. Refresh ahead: cache proactively refreshes popular items before they expire. Pros: popular items never miss. Cons: wastes resources."}},

        {"type": "prose", "id": "cache-aside", "payload": {"text": "**Cache Aside (Lazy Loading)** — the most common strategy.\n\nThe application manages the cache explicitly:\n1. Check cache for the key.\n2. If hit → return the cached value.\n3. If miss → fetch from DB, write to cache with TTL, return.\n\nWrites update the database, then **invalidate** (delete) the cache entry. The next read will miss and re-populate from the DB.\n\n**Pros:**\n- Cache only holds data that's actually read (no wasted memory).\n- Fault-tolerant: if the cache crashes, the system still works (just slower).\n- Simple to implement.\n\n**Cons:**\n- Stale data: between a write and the cache invalidation, reads can return old data. TTLs cap the staleness window.\n- Cache stampede: when a popular key expires, N concurrent requests all miss and all fetch from the DB simultaneously.\n- Application code is aware of the cache (not transparent)."}},

        {"type": "callout", "id": "stampede", "payload": {"title": "Cache stampede (thundering herd)", "body": "When a popular cache entry expires, the next N requests all see a miss at the same time. They all fetch from the DB, all write to the cache. The DB takes N× the expected load for a brief window. Mitigations: (1) cache locking — only one request fetches, others wait; (2) early refresh — refresh before expiry; (3) probabilistic early expiration — add jitter to TTLs so they don't all expire at once.", "kind": "warning"}},

        {"type": "prose", "id": "write-through", "payload": {"text": "**Write Through** — the cache is always fresh.\n\nWrites go to both the cache AND the database synchronously. The application writes to the cache; the cache writes to the DB and returns only after both succeed. Reads always hit the cache.\n\n**Pros:**\n- Cache is always fresh — no stale reads.\n- Read performance is optimal (always cache hit, assuming data has been written).\n- Simple read path (no DB fallback).\n\n**Cons:**\n- Higher write latency (must write to cache + DB synchronously).\n- If the cache is down, writes fail (unless you add fallback logic).\n- Cache holds everything ever written, even if never read (wasted memory).\n\nBest for: data that's written once and read many times, where staleness is unacceptable."}},

        {"type": "prose", "id": "write-behind", "payload": {"text": "**Write Behind (Write-Back)** — the fastest writes, but risky.\n\nWrites go to the cache only. The cache returns immediately. A background process writes to the DB asynchronously (batched, delayed).\n\n**Pros:**\n- Extremely fast writes (only one write to cache, no DB round-trip).\n- DB load is smoothed (batched writes).\n- Survives brief DB outages (writes queue in cache).\n\n**Cons:**\n- **Data loss risk**: if the cache crashes before flushing to DB, committed writes are lost.\n- Reads from the DB (by other services, analytics) can see stale data.\n- Complex to implement (write queue, flush logic, ordering).\n\nBest for: high-write, low-criticality data (counters, analytics events, telemetry). Never use for payments or transactions."}},

        {"type": "prose", "id": "refresh-ahead", "payload": {"text": "**Refresh Ahead** — popular items never expire.\n\nThe cache proactively refreshes entries before their TTL expires. A background process watches for entries nearing expiry; if they're frequently accessed, it refreshes them from the DB before they expire.\n\n**Pros:**\n- Popular items never miss — the user never waits for a DB fetch.\n- Smooths DB load (refreshes are spread over time, not bursty).\n\n**Cons:**\n- Wastes resources refreshing items that nobody reads.\n- Complex to implement (need to track access frequency).\n- If the refresh fails, the item expires normally.\n\nBest for: systems with clear 'hot' items (home page content, popular product pages, trending topics)."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "Your cache aside system uses a 5-minute TTL on user profiles. A user updates their bio, the DB write succeeds, but the cache invalidation call fails (cache is briefly down). What happens?", "shape": "mcq", "options": ["The user sees their new bio immediately.", "The user may see stale bio for up to 5 minutes, then it self-corrects.", "The database rolls back the write.", "The cache becomes permanently inconsistent."], "answer_index": 1, "rationale": "The write succeeded, but the cache still holds the old bio. Until the TTL expires (up to 5 minutes), reads return stale data. Once the TTL expires, the next read misses, fetches the updated bio from the DB, and the cache is correct again. This is why TTLs are a safety net, not just an optimization — they cap the maximum staleness window even when invalidation fails. Without a TTL, a failed invalidation would mean stale data forever.", "difficulty": "solid"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "You need to cache analytics events that are written at 100,000 events/sec but only read for dashboards (rarely). Which strategy is best?", "shape": "mcq", "options": ["Write-through — cache is always fresh for dashboard reads.", "Write-behind — fast writes, batched DB flush. Dashboard reads can tolerate slight staleness.", "Cache-aside — only cache what's read.", "Refresh-ahead — proactively refresh popular events."], "answer_index": 1, "rationale": "Write-behind is ideal for high-write, low-criticality data. Writes go to cache only (fast, 1ms), and the DB is updated asynchronously in batches. The DB load is smoothed (100K writes/sec become batched flushes). Dashboard reads can tolerate slight staleness — they're not user-facing. Write-through would be too slow (synchronous DB writes at 100K/sec). Cache-aside doesn't help writes. Refresh-ahead is for read-heavy hot items, not write-heavy events.", "difficulty": "interview"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "A popular product page's cache entry expires. Within the same second, 1000 users request the page. What happens, and how do you mitigate it?", "shape": "mcq", "options": ["Nothing special — the cache refills normally.", "All 1000 requests miss simultaneously, hammering the database. Mitigate with cache locking or early refresh.", "The cache automatically extends its TTL.", "The load balancer blocks the requests."], "answer_index": 1, "rationale": "This is a cache stampede (thundering herd). All 1000 requests see a miss, all fetch from the database, all write to the cache. The database briefly takes 1000x the expected load. Mitigations: (a) cache locking — only the first miss fetches, others wait; (b) early refresh — refresh the cache before it expires, in the background; (c) probabilistic early expiration — add jitter to the TTL so misses spread out over time.", "difficulty": "hard"}}
    ],
    "trade_offs": {
        "pros": [
            "Dramatically reduces latency — cache hits are 100x faster than DB reads.",
            "Reduces database load — hot data served from cache, DB handles cold reads only.",
            "Multiple strategies for different use cases (freshness vs speed vs complexity)."
        ],
        "cons": [
            "Stale data — every strategy has some window where cache and DB diverge.",
            "Cache stampede — popular key expiry can overwhelm the DB.",
            "Operational complexity — monitoring cache hit rate, eviction policy, memory usage.",
            "Data loss risk (write-behind) — if cache crashes before flushing to DB."
        ]
    },
    "failure_modes": [
        "Stale data window — cache and DB diverge between write and invalidation.",
        "Cache stampede — popular key expiry causes thundering herd.",
        "Cache thrashing — keys evicted before they're read again (cache too small for working set).",
        "Data loss (write-behind) — cache crash before DB flush."
    ],
    "common_mistakes": [
        "No TTL. Without a TTL, a cache invalidation failure means stale data forever.",
        "Caching everything. Caching rarely-read data wastes memory and adds invalidation complexity.",
        "Forgetting cache stampede protection on hot keys.",
        "Updating cache before DB. If the cache write succeeds but the DB write fails, you are now inconsistent. Always write DB first, then cache."
    ],
    "where_you_see_it": [
        "Netflix (EVCache — multi-tier caching: CDN → origin cache → DB).",
        "Redis / Memcached (in-memory key-value stores implementing cache-aside).",
        "CDN edge caching (Cloudflare, Fastly — cache static content at the edge)."
    ],
    "interview_prompts": [
        "Compare cache-aside, write-through, write-behind, and refresh-ahead.",
        "What is a cache stampede, and how do you prevent it?",
        "Your cache and database diverged. How do you detect it, and how do you fix it?",
        "When would you NOT use caching? What are the risks?"
    ],
    "real_system_mappings": [
        {"system": "Netflix EVCache", "how": "Multi-tier caching: CDN edge → origin cache (EVCache, built on Memcached) → database. 90%+ of reads served from cache. Cache-aside for content metadata, write-through for user state."},
        {"system": "Redis", "how": "In-memory key-value store used as a cache. Supports cache-aside (GET/SET/DEL), write-behind (with background sync to DB), and TTLs. Most popular cache in production."}
    ],
    "status": "published",
})

print("\n✅ HTTP + Caching content written")
