#!/usr/bin/env python3
"""Generate the 17 case-study concept JSON files with guaranteed-valid JSON."""
import json
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "concepts")


def w(slug, title, summary, why, prereqs, related, minutes, difficulty,
      blocks, pros, cons, failure_modes, common_mistakes, where_you_see_it,
      interview_prompts, real_system_mappings):
    data = {
        "slug": slug,
        "version": 1,
        "title": title,
        "phase": "case-studies",
        "area": "Case Studies",
        "estimated_minutes": minutes,
        "difficulty": difficulty,
        "summary": summary,
        "why_it_matters": why,
        "prerequisites": prereqs,
        "related": related,
        "used_in": where_you_see_it,
        "blocks": blocks,
        "trade_offs": {"pros": pros, "cons": cons},
        "failure_modes": failure_modes,
        "common_mistakes": common_mistakes,
        "where_you_see_it": where_you_see_it,
        "interview_prompts": interview_prompts,
        "real_system_mappings": real_system_mappings,
        "status": "published",
    }
    path = os.path.join(OUT_DIR, slug + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", slug)


def prose(i, text):
    return {"type": "prose", "id": i, "payload": {"text": text}}


def diagram(i, ascii_art, caption, voice):
    return {
        "type": "diagram",
        "id": i,
        "payload": {"ascii": ascii_art, "caption": caption, "voice_alt_text": voice},
    }


def quiz(i, question, options, answer_index, rationale, difficulty="interview"):
    return {
        "type": "quiz",
        "id": i,
        "payload": {
            "question": question,
            "shape": "mcq",
            "options": options,
            "answer_index": answer_index,
            "rationale": rationale,
            "difficulty": difficulty,
        },
    }


# =========================================================================
# 1. URL SHORTENER
# =========================================================================
url_shortener_blocks = [
    prose("problem",
        "**What are we designing?** A service that takes a long URL like "
        "`https://www.example.com/very/long/path?with=query&params=here` and returns a short "
        "alias such as `https://bit.ly/aB3x9`. When anyone visits the short URL, the service "
        "redirects them to the original long URL. Alongside the redirect, the service records "
        "click analytics (referrer, geolocation, timestamp, user-agent) so marketers can "
        "measure campaign performance.\n\n"
        "Two functional primitives define the system: a **shorten** endpoint (write path) and "
        "a **redirect** endpoint (read path). The interesting design tension comes from three "
        "facts: reads dwarf writes by roughly 100:1, every short code must be globally unique "
        "forever, and the redirect latency budget is brutal because a redirect adds a round "
        "trip to the user's actual destination."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- A user submits a long URL and receives a short code (e.g. `aB3x9`) that maps back "
        "to the original.\n"
        "- Visiting `https://short.io/<code>` returns an HTTP redirect to the long URL.\n"
        "- Users may optionally pick a custom alias (e.g. `short.io/my-summit-2024`).\n"
        "- The service records click events: timestamp, IP, referrer, user-agent.\n"
        "- Links can be expired or deleted by their owner.\n\n"
        "**Non-functional requirements.**\n"
        "- **Read latency**: p99 < 30 ms for redirects (the redirect is on the critical path "
        "of the user's browser).\n"
        "- **Availability**: 99.99% for reads (a dead short link breaks every SMS / email "
        "that embeds it).\n"
        "- **Durability**: shortened URLs must keep resolving for years; we cannot lose a "
        "mapping.\n"
        "- **Write latency**: < 200 ms is fine — shortening is not latency-critical.\n"
        "- **Analytics freshness**: clicks visible in dashboards within ~1 minute (eventual).\n"
        "- **Scale**: 100M new URLs/month, 10B redirects/day at peak (read-heavy, 100:1).\n\n"
        "**Non-goals (v1).** No A/B redirect variants, no password-protected links, no "
        "per-link rate limiting. These can be layered on later without changing the core."),
    prose("capacity",
        "**Capacity estimation.** Assume 100M new short links/month and a 100:1 read:write "
        "ratio.\n\n"
        "*Writes.* 100M / 30 days / 86400 s = ~40 shortens/sec average, peak ~200/sec. "
        "Trivial — a single database node could handle this.\n\n"
        "*Reads.* 100M x 100 = 10B redirects/month = ~3,850 redirects/sec average, peak "
        "~20,000/sec (3-5x for marketing bursts, US-east daytime). At 20K QPS a single Redis "
        "shard is borderline; we will need a small cache cluster.\n\n"
        "*Storage.* Each mapping is ~500 bytes (short code, long URL, owner, created_at, "
        "expires_at, metadata). 100M/month x 500 B = 50 GB/month = ~600 GB/year. Five years "
        "= 3 TB. Fits in a sharded PostgreSQL cluster or a DynamoDB-style KV store; no need "
        "for Hadoop-class storage.\n\n"
        "*Bandwidth.* Redirect response is ~1 KB (HTTP headers + 302 + cache headers). "
        "20,000 QPS x 1 KB = 20 MB/s = ~160 Mbps peak egress. Add CDN caching for hot links "
        "and origin egress drops 10x.\n\n"
        "*Analytics writes.* 10B clicks/day, each event ~200 bytes -> 2 TB/day of click "
        "logs. These go to a streaming pipeline (Kafka -> S3/warehouse), not the redirect "
        "path.\n\n"
        "*Short-code keyspace.* With 7-character base-62 codes (a-z, A-Z, 0-9 = 62 chars), "
        "the keyspace is 62^7 = 3.5 trillion. Plenty for years of growth; 6 chars "
        "(62^6 = 56 billion) would also suffice but leaves less collision margin."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/shorten\n"
        "  body: { long_url, custom_alias?, expires_at?, owner_id? }\n"
        "  resp: { short_code, short_url, long_url, created_at }\n\n"
        "GET  /<short_code>           -> 301/302 redirect to long_url\n\n"
        "DELETE /v1/links/<short_code>   -> mark deleted (returns 410 on redirect)\n\n"
        "GET  /v1/links/<short_code>/stats?from=&to=   -> click counts, top referrers\n"
        "```\n\n"
        "Two design choices worth flagging. First, **301 vs 302**: a `301 Moved Permanently` "
        "is browser-cached, which is great for latency but means we lose the click event "
        "(the browser never hits us again). `302 Found` is not cached, so every click "
        "traverses our service — required for analytics. bit.ly uses 301 with a separate `+` "
        "suffix (e.g. `bit.ly/aB3x9+`) for the stats page. We will use **302 with "
        "`Cache-Control: private, max-age=30`** so clicks are counted but a single user's "
        "repeat clicks within 30s don't double-hit origin.\n\n"
        "Second, the redirect endpoint is unauthenticated and on the hot path; it must not "
        "touch the database on every request. A Redis cache-aside in front of the mapping "
        "table absorbs >95% of reads."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Link mappings* (sharded SQL, primary store):\n"
        "```\n"
        "links (\n"
        "  short_code   VARCHAR(7)  PRIMARY KEY,\n"
        "  long_url     TEXT        NOT NULL,\n"
        "  owner_id     BIGINT,\n"
        "  created_at   TIMESTAMP,\n"
        "  expires_at   TIMESTAMP NULL,\n"
        "  deleted      BOOLEAN     DEFAULT false\n"
        ")\n"
        "```\n"
        "Index `(owner_id, created_at)` for the user dashboard.\n\n"
        "*ID generator.* Two options:\n"
        "1. **MD5(long_url) then base-62 encode the first 7 chars** — deterministic, "
        "idempotent (same long URL -> same short code), but collision-prone and you cannot "
        "choose the length.\n"
        "2. **Counter-based**: a global auto-increment (Ticket Server pattern, like Flickr's "
        "ticket servers) produces a 64-bit ID, then base-62 encode it. Deterministic, "
        "collision-free, sortable by creation time.\n\n"
        "We pick the **counter-based** approach with two independent ticket-server DBs "
        "(odd/even IDs) for HA, then base-62 encode. 7 chars of base-62 supports 3.5 "
        "trillion URLs.\n\n"
        "*Click events* (analytics path, separate pipeline):\n"
        "```\n"
        "click_events (\n"
        "  event_id   BIGINT,\n"
        "  short_code VARCHAR(7),\n"
        "  ts         TIMESTAMP,\n"
        "  ip         INET,\n"
        "  referrer   TEXT,\n"
        "  ua         TEXT\n"
        ")\n"
        "```\n"
        "Sharded into Kafka -> S3 / ClickHouse for analytics."),
    diagram("arch",
        "                 [Browser / App]\n"
        "                       |\n"
        "            (1) GET short.io/aB3x9\n"
        "                       |\n"
        "                       v\n"
        "              [Global CDN / Edge]\n"
        "                (cache 302s for 30s\n"
        "                 for very hot links)\n"
        "                       |\n"
        "          (2) miss -> [Load Balancer]\n"
        "                       |\n"
        "                       v\n"
        "              [Redirect Service]\n"
        "                (stateless, autoscaled)\n"
        "                       |\n"
        "          (3) Redis cache-aside lookup\n"
        "                       |\n"
        "              +--------+--------+\n"
        "              |                 |\n"
        "        (hit) v            (miss) v\n"
        "          [Redis]         [Links DB]\n"
        "        (hot links,        (sharded SQL\n"
        "         LRU ~50GB)         by short_code)\n"
        "              |                 |\n"
        "              +--------+--------+\n"
        "                       |\n"
        "          (4) 302 + Location: long_url\n"
        "                       |\n"
        "                       v\n"
        "                 [Long URL origin]\n\n"
        "  --- analytics side-channel ---\n"
        "  Redirect Service --(async fire)--> [Kafka] --> [Stream]\n"
        "                                                            |\n"
        "                                                  [ClickHouse / S3]\n"
        "                                                            |\n"
        "                                                    [Stats API]\n\n"
        "  --- write path ---\n"
        "  Client -> LB -> Shorten Service -> Ticket Server (new ID)\n"
        "                                    -> Links DB (insert)\n"
        "                                    -> Redis (warm cache)",
        "URL shortener read path with CDN, cache-aside, and sharded DB. Analytics go async to avoid blocking the redirect.",
        "A diagram of the URL shortener architecture. The browser hits a global CDN; on a cache miss the request goes through a load balancer to a stateless redirect service. The service does a cache-aside lookup against Redis for hot links and falls back to a sharded links database on a miss. The 302 response is returned to the browser. Separately, the redirect service fires click events asynchronously into Kafka, which feeds a stream processor that writes to ClickHouse and an S3-backed warehouse, powering a stats API. The write path is separate: client to load balancer to a shorten service that calls a ticket server for a new ID, inserts into the links DB, and warms the Redis cache."),
    prose("deep-dive",
        "**Deep dive: short-code generation and collision handling.** The single hardest "
        "design decision is how to mint short codes that are unique, short, and unguessable "
        "enough to discourage enumeration. Three families of approach:\n\n"
        "1. **Hash-and-truncate** (MD5(long_url)[:7]). Pros: deterministic, idempotent, no "
        "coordinator. Cons: collisions grow quadratically (birthday paradox — 62^7 keyspace "
        "means ~50% collision probability around 70M codes); also reveals that two users "
        "shortened the same URL.\n\n"
        "2. **Counter + base-62 encode** (our choice). A 64-bit monotonic counter from a "
        "ticket server is encoded as `[0-9a-zA-Z]`. Pros: globally unique by construction, "
        "lexicographically sortable, no collisions ever, 7 chars cover 3.5T URLs. Cons: "
        "requires a coordination service (the ticket server), and **codes are enumerable** — "
        "an attacker can scan `bit.ly/aaa`, `bit.ly/aab`, ... and harvest every link. "
        "Mitigation: either accept this (most public shorteners do, and add abuse detection) "
        "or XOR the counter with a per-service secret to obfuscate ordering.\n\n"
        "3. **Random 7-char codes with retry on collision.** Pick uniformly from 62^7, check "
        "the DB, retry if exists. Pros: no coordinator, codes unguessable. Cons: as the "
        "keyspace fills, collision retries explode (birthday paradox again); also requires a "
        "unique-index check on every write.\n\n"
        "**Ticket server HA.** Flickr's pattern: two MySQL masters, one hands out even IDs, "
        "the other odd. Either can fail and the system keeps minting IDs. The ticket server is "
        "the one true write-bottleneck — at 200 writes/sec it is nowhere near saturation, "
        "but we still want redundancy.\n\n"
        "**Cache-aside specifics.** On a redirect: (1) `GET short_code` from Redis. (2) On "
        "miss, `SELECT long_url FROM links WHERE short_code=?`; if found, `SET` into Redis "
        "with TTL of 1 hour (so stale-then-deleted links clear themselves). (3) Return 302. "
        "We pre-warm the cache for any code that trends; the hot set is small (Pareto: top "
        "1% of links = 80% of traffic).\n\n"
        "**Anti-abuse.** A shortener is a phisher's best friend. We add a "
        "Google-Safe-Browsing-style blocklist check on shorten, and on redirect we check a "
        "bloom filter of known-bad codes. Reports of malicious links are pushed to the "
        "blocklist within seconds."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Hot short code.** A celebrity tweets a bit.ly link -> 100K redirects in 60 "
        "seconds, all to one Redis key. The shard owning that key becomes a hotspot. "
        "*Mitigation*: detect hot keys (top-K window) and replicate them to a pool of "
        "read-only 'shadow' keys (`aB3x9__1`, `aB3x9__2`); the redirect service picks one at "
        "random. CDN also absorbs most of this if the link owner opted into longer cache "
        "TTLs.\n\n"
        "- **Ticket server failure.** If both ticket DBs are down, no new links can be "
        "created (but redirects still work). *Mitigation*: each ticket server pre-allocates "
        "a block of 10K IDs into an in-memory counter on the shorten service, so the service "
        "can mint IDs for several minutes even with the ticket server gone.\n\n"
        "- **Redis cache failure.** If Redis dies, all reads fall through to the DB. At 20K "
        "QPS this will probably crush the DB. *Mitigation*: Redis cluster with replicas + "
        "client-side circuit breaker that, on Redis failure, returns `302` to a *stale* "
        "cached long URL from a local LRU (better to redirect to the right place than to "
        "5xx). If no local cache, return `503` with `Retry-After` and degrade.\n\n"
        "- **CDN misconfiguration caching a 404.** If we cache `404 Not Found` for a code "
        "that doesn't exist yet (eventually consistent propagation), a later shorten of that "
        "code will return 404 for the CDN TTL. *Mitigation*: never cache 4xx/5xx at the CDN; "
        "only cache 302s.\n\n"
        "- **Analytics pipeline backpressure.** If Kafka backs up, the redirect service must "
        "not block. *Mitigation*: fire-and-forget analytics writes via an async client with a "
        "tiny in-memory buffer; drop events rather than stall a redirect.\n\n"
        "- **Link rot.** A long URL 404s years later. We can periodically crawl long URLs in "
        "the background and flag dead links."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Read path scaling.* The cache hierarchy is CDN -> Redis cluster -> DB. Each layer "
        "absorbs roughly 10x of the previous: CDN catches 60% (repeat-clicks by the same "
        "user within TTL), Redis catches 35% of what's left, the DB only sees 5%. At 20K QPS "
        "this means ~1K QPS hits the DB — comfortable for a 3-shard PostgreSQL cluster.\n\n"
        "*Write path scaling.* The bottleneck is the ticket server. We can shard ticket "
        "servers by geography (US-east mints IDs 0..N, EU mints N+1..2N) but then IDs are no "
        "longer globally sortable. Alternative: use Snowflake-style IDs (timestamp + "
        "worker_id + sequence) — no coordinator, sortable, fits in 64 bits.\n\n"
        "*Database sharding.* Shard `links` by `short_code` hash with consistent hashing so "
        "adding a shard doesn't rehash everything. Each shard is a primary + 2 replicas. "
        "Cross-shard queries (e.g. 'all links owned by user X') require a secondary index "
        "shard keyed by `owner_id`.\n\n"
        "*Multi-region.* Reads must be fast globally. We deploy the redirect service + Redis "
        "cache in 5+ regions (us-east, us-west, eu-west, ap-south, ap-northeast). The links DB "
        "is replicated asynchronously to read replicas in each region. Writes (shorten) go to "
        "a single primary region to keep ID assignment simple; this is fine because writes "
        "are not latency-sensitive.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose 302 over 301 — **gained** accurate click analytics, **lost** free browser "
        "caching (mitigated by `Cache-Control: max-age=30`).\n"
        "- We chose counter-based codes over hash-based — **gained** no collisions and "
        "sortability, **lost** idempotency (the same long URL shortened twice yields two "
        "codes) and accepted enumerability.\n"
        "- We chose Redis cache-aside over read-through — **gained** simplicity, **lost** "
        "automatic freshness (a deleted link can be served stale for up to Redis TTL). We "
        "mitigate by issuing `DEL` on delete.\n"
        "- We chose single-region writes — **gained** simple ID assignment, **lost** write "
        "availability if the primary region fails (acceptable: writes are <1% of traffic and "
        "not on the user's critical path)."),
    quiz("q1",
        "You discover that one short code is generating 80% of your redirect traffic after a celebrity tweet. The Redis shard owning that key is at 100% CPU. What is the best mitigation?",
        ["Add more replicas to the Redis cluster and let the client load-balance reads.",
         "Increase the Redis shard count so the hot key lands on a different shard.",
         "Replicate the hot key to multiple shadow keys and have clients randomly pick one.",
         "Move the hot key to a separate standalone Redis instance."],
        2,
        "Redis clustering shards by key, so a single hot key always lives on exactly one shard — adding replicas does not help because the *key* (not the shard) is the bottleneck, and adding shards doesn't relocate an existing key. Replicating the hot key under N alias keys (aB3x9__1, __2, ...) distributes reads across shards and is the standard pattern (used at Twitter, Instagram). Moving the key to a standalone instance helps temporarily but is operationally awkward and doesn't scale to the next hot key."),
    quiz("q2",
        "Why does bit.ly return a 301 redirect while we chose 302? What trade-off is being made?",
        ["301 is faster because browsers cache it; bit.ly sacrifices click analytics for latency.",
         "301 is more correct semantically; 302 is a hack. We chose 302 to keep analytics fresh.",
         "301 caches the redirect, so bit.ly loses click data on repeat visits but saves origin load; we trade origin load for accurate per-click analytics using 302 with a short Cache-Control.",
         "There is no meaningful difference; both are interchangeable."],
        2,
        "A 301 is permanently cached by browsers, so subsequent visits skip the shortener entirely — great for latency and origin cost, but you lose the click event. A 302 is not cached, so every click hits origin and is counted. We compromise with 302 plus `Cache-Control: private, max-age=30` so a single user's repeat clicks within 30 seconds don't double-count, but cross-user clicks still register. bit.ly instead uses 301 and exposes stats via a `+` suffix URL. Both are defensible; the trade-off is analytics fidelity vs origin load.",
        "solid"),
]

w("design-url-shortener",
  "Design URL Shortener",
  "Design a bit.ly-style URL shortener that turns long URLs into short codes, serves millions of redirects per second with single-digit-millisecond latency, and tracks click analytics. The case study walks through hash-based short codes, 301 vs 302 redirects, a Redis read-through cache for hot URLs, and the trade-offs between base-62 encoding, counter-based IDs, and collision handling.",
  "URL shorteners are the 'Hello World' of system design interviews because they compress a surprising number of real concerns into a tiny surface area: a read-heavy workload (typically 100:1 read:write), a globally unique ID generator, hot-key caching, eventual consistency for analytics, and a CDN-friendly redirect path. Mastering it gives you a template for every other key-value-shaped system.",
  ["consistent-hashing", "cache-aside", "load-balancers"],
  ["design-key-value-store"],
  25, "interview",
  url_shortener_blocks,
  ["Counter-based short codes are collision-free, sortable, and fit in 7 chars for trillions of URLs.",
   "Cache-aside with CDN fronting absorbs >95% of reads off the database.",
   "Async analytics side-channel keeps the redirect path latency at single-digit ms.",
   "Stateless redirect service autoscales cleanly with traffic."],
  ["Counter-based codes are enumerable; abuse detection is mandatory.",
   "Same long URL shortened twice yields two different codes (no idempotency).",
   "Ticket server is a write bottleneck and a single point of failure without HA setup.",
   "302 redirects cost more origin load than 301s and require careful cache headers."],
  ["Hot short code saturates one Redis shard — needs shadow-key replication.",
   "Ticket server failure stops new link creation — needs HA pair + ID pre-allocation.",
   "Redis failure collapses traffic onto DB — needs circuit breaker + local LRU fallback.",
   "CDN caching a 404 for a not-yet-created code — never cache 4xx/5xx at CDN.",
   "Analytics pipeline backpressure stalls redirects — must be fire-and-forget."],
  ["Using MD5(long_url)[:7] without collision handling — birthday paradox hits around 70M codes.",
   "Forgetting that Redis cluster shards by key, so hot keys don't redistribute automatically.",
   "Caching 4xx responses at the CDN — propagates transient errors for the cache TTL.",
   "Blocking the redirect on the analytics write — Kafka must be async.",
   "Single-region writes without HA on the ticket server."],
  ["bit.ly, TinyURL, Rebrandly.",
   "Twitter's t.co wrapper for all outbound links.",
   "Marketing campaign link tracking (Mailchimp, Hubspot).",
   "SMS short links for delivery reports (Twilio, MessageBird)."],
  ["Design a URL shortener like bit.ly. How do you generate the short codes?",
   "How would you handle a single short link that suddenly gets 1M clicks/second?",
   "How do you make sure a deleted short link stops resolving everywhere immediately?",
   "Walk me through the read path latency budget for a redirect."],
  [{"system": "bit.ly", "how": "Counter-based 6-7 char codes, 301 redirects with a `+` suffix for stats, Redis fronted Cassandra cluster for mappings."},
   {"system": "Flickr ticket servers", "how": "Two MySQL masters with auto-increment-offset and auto-increment-increment to mint globally unique 64-bit IDs without a coordinator."},
   {"system": "Twitter t.co", "how": "Wraps every outbound URL in a t.co short link for abuse screening and click analytics; uses Snowflake-style IDs."}])

print("Done with URL shortener")


# =========================================================================
# 2. KEY-VALUE STORE (Dynamo-style)
# =========================================================================
kv_blocks = [
    prose("problem",
        "**What are we designing?** A distributed, eventually-consistent key-value store "
        "in the style of Amazon DynamoDB and Apache Cassandra. Clients do `put(key, value)`, "
        "`get(key)`, and `delete(key)`. The store runs on a cluster of commodity nodes, "
        "survives node failures and network partitions, scales horizontally by adding nodes, "
        "and lets the application tune the consistency vs availability trade-off per request.\n\n"
        "This is the canonical 'design a NoSQL store' interview problem. The interesting "
        "parts are not the data structure (it is just a hash map) but everything around it: "
        "how do we partition data across nodes, replicate it, reconcile concurrent writes, "
        "handle node failures, and let the caller pick a consistency level."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- `put(key, value)` — store or overwrite a value, with optional context (vector "
        "clock) for conflict detection.\n"
        "- `get(key)` — return the value, or a list of sibling values if there are "
        "unresolved conflicts.\n"
        "- `delete(key)` — tombstone the key (lazy delete).\n"
        "- Configurable consistency: caller picks `W` (write quorum) and `R` (read quorum) "
        "per request.\n\n"
        "**Non-functional requirements.**\n"
        "- **Availability**: writes always succeed even during a partition (AP system). "
        "If a node is reachable, it accepts the write.\n"
        "- **Scalability**: linear horizontal scaling to thousands of nodes and petabytes.\n"
        "- **Latency**: p99 read/write < 10 ms within a datacenter (in-memory + SSD).\n"
        "- **Elasticity**: adding or removing a node should not require downtime and should "
        "only move a fraction of the keyspace.\n"
        "- **Tunable consistency**: per-request, not per-cluster.\n\n"
        "**Non-goals.** No multi-key transactions, no JOINs, no secondary indexes (v1). "
        "These are layered on (e.g. Cassandra's LWT and SASI) later."),
    prose("capacity",
        "**Capacity estimation.** Assume a 1 PB working set across a 100-node cluster.\n\n"
        "*Per node.* 1 PB / 100 nodes = 10 TB/node. A modern NVMe SSD holds 8-15 TB, so one "
        "disk per node. Replication factor N=3 means each logical key is stored on 3 nodes, "
        "so raw storage is 3 PB across the cluster = 30 TB/node — still fits with 2-3 disks.\n\n"
        "*Throughput.* If the cluster sustains 1M ops/sec, that's 10K ops/sec/node — easily "
        "handled by an LSM-tree storage engine (RocksDB) on SSD.\n\n"
        "*Memory.* Each node caches the hot 5% of keys in RAM. 10 TB x 5% = 500 GB. That is "
        "too much for RAM; we cache only the hot 0.1% (10 GB) — fits comfortably in 64 GB "
        "RAM with room for block cache, memtable, and index.\n\n"
        "*Network.* 1M ops/sec x 1 KB avg value = 1 GB/s = 8 Gbps. With RF=3, intra-cluster "
        "replication traffic is 3x writes = 24 Gbps of internal traffic if every write is "
        "synchronously replicated. Use 25 Gbps NICs and batch replication.\n\n"
        "*Key space.* 64-bit hashes give 1.8 x 10^19 keys; consistent hashing maps the ring "
        "to nodes. Virtual nodes (200-500 per physical node) ensure even distribution."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "put(key, value, context=None, W=quorum, N=3)\n"
        "    -> ok | conflict\n\n"
        "get(key, R=quorum, N=3)\n"
        "    -> (value, context) | [(v1, ctx1), (v2, ctx2), ...]   # siblings\n\n"
        "delete(key, W=quorum, N=3)\n"
        "    -> ok      # writes a tombstone\n"
        "```\n\n"
        "`context` is an opaque vector clock returned by the previous `get`. The client must "
        "round-trip it on the next `put` so the store can detect concurrent writes.\n\n"
        "**Consistency levels.** W and R are quorum sizes:\n"
        "- W=1, R=1 — fastest, weakest (any one replica answers).\n"
        "- W=quorum, R=quorum — strong consistency IF W + R > N (quorum intersection).\n"
        "- W=N, R=N — slowest, strongest (all replicas must agree).\n"
        "- W=1, R=N — write fast, read everything (good for read-heavy + occasional "
        "conflict resolution).\n\n"
        "The fundamental invariant: if W + R > N, reads see the latest committed write "
        "(quorum overlap). If W + R <= N, the system is eventually consistent."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Storage per node* (LSM-tree, e.g. RocksDB):\n"
        "```\n"
        "kv (\n"
        "  key        BLOB,        -- the actual key bytes\n"
        "  value      BLOB,        -- the value bytes\n"
        "  vector_clk TEXT,        -- serialized vector clock\n"
        "  timestamp  BIGINT,     -- last-write-wins tiebreaker\n"
        "  tombstone  BOOLEAN,    -- lazy delete marker\n"
        "  PRIMARY KEY (key, vector_clk)   -- multiple versions per key\n"
        ")\n"
        "```\n\n"
        "Multiple siblings can coexist (different `vector_clk` per `key`); the application "
        "resolves them on read.\n\n"
        "*Cluster metadata* (gossiped via a gossip protocol):\n"
        "```\n"
        "node (\n"
        "  node_id       UUID,\n"
        "  address       INET,\n"
        "  heartbeat     BIGINT,    -- monotonic counter; if stale, node is suspected dead\n"
        "  token_ranges  JSON        -- which hash ranges this node owns\n"
        ")\n"
        "```\n\n"
        "Each node keeps a local copy of cluster state and reconciles it via gossip every "
        "1 second with 3 random peers."),
    diagram("arch",
        "  Client\n"
        "    |\n"
        "    | put(k, v)\n"
        "    v\n"
        "  [Coordinator]    (any node can be the coordinator; client picks one,\n"
        "    |               often the one that owns the key's hash range)\n"
        "    |\n"
        "    | 1. hash(k) -> position on consistent-hash ring\n"
        "    | 2. walk ring clockwise to find N=3 replicas: A, B, C\n"
        "    | 3. forward put to all 3 in parallel\n"
        "    v\n"
        "  +-----------+-----------+-----------+\n"
        "  |           |           |           |\n"
        "  v           v           v           v\n"
        "[Node A]   [Node B]   [Node C]   (handoff targets if a replica is down)\n"
        "  |           |           |\n"
        "  | write     | write     | write\n"
        "  v           v           v\n"
        "[LSM-tree] [LSM-tree] [LSM-tree]\n"
        "  |           |           |\n"
        "  | ack when W replicas reply (default W=quorum=2)\n"
        "  v\n"
        "  Coordinator -> reply ok to client\n\n"
        "  -- Gossip plane (every 1s, 3 random peers) --\n"
        "  Node A <-> Node X : heartbeat, token ownership, suspected-dead list\n"
        "  Node A <-> Node Y : ...\n\n"
        "  -- Hinted handoff --\n"
        "  If Node B is down when coordinator forwards the write,\n"
        "  the write is buffered on a hint node H with a note 'for B'.\n"
        "  When B recovers, H forwards the hint.",
        "Dynamo-style KV store: a coordinator forwards writes to N replicas, waits for W acks, and uses hinted handoff + gossip for failure recovery.",
        "A diagram of a Dynamo-style key-value store. A client sends a put request to a coordinator node. The coordinator hashes the key to a position on a consistent-hash ring, walks clockwise to find three replicas A, B, and C, and forwards the write to all three in parallel. Each replica writes to its local LSM-tree and acks when done; the coordinator replies to the client once W replicas have acked. A separate gossip plane runs in the background exchanging heartbeats, token ownership, and the suspected-dead list between random peers. If a replica is down, the coordinator buffers the write on a hint node H labeled 'for B', which forwards it when B recovers."),
    prose("deep-dive",
        "**Deep dive: consistency hashing, vector clocks, and hinted handoff.**\n\n"
        "**Consistent hashing.** Each node maps to one or more positions on a 0..2^64 ring "
        "(hash of node_id). Each key is hashed onto the same ring; the key's replicas are "
        "the next N nodes clockwise. Adding or removing a node only moves keys between the "
        "departing node and its neighbor — most keys stay put. To avoid hotspots when nodes "
        "are few, each physical node claims 200-500 'virtual nodes' (vnodes) scattered around "
        "the ring; this guarantees +/- 10% load balance even at small cluster sizes.\n\n"
        "**Vector clocks.** Each value carries a `{node_id: counter}` map. When a node writes "
        "a key, it increments its own counter in the map. Two writes are concurrent iff "
        "neither clock dominates the other (`A > B` means A has every entry of B and at least "
        "one strictly greater). If they are concurrent, the store returns BOTH values as "
        "siblings on the next `get`; the application reconciles them and writes a new value "
        "with a clock that dominates both. This is how Dynamo avoids throwing away writes "
        "during a partition. The trade-off: vector clocks grow unboundedly for keys that are "
        "written by many nodes; Dynamo prunes them by keeping only the last N entries per "
        "node and a timestamp.\n\n"
        "**Hinted handoff.** When the coordinator tries to replicate to replica B and B is "
        "down, it picks a healthy 'hint' node H, writes the data to H with a sticky note "
        "`this is for B, deliver when B returns`, and replies success to the client (W quorum "
        "is satisfied by A + H). When B comes back, H delivers the buffered writes. This "
        "keeps writes available during partitions and node restarts. Hints expire after a few "
        "hours (bounded storage) — if B is gone for a day, we rely on read-repair and "
        "anti-entropy (Merkle-tree sync) to converge.\n\n"
        "**Read repair.** On a read, the coordinator fetches from R replicas; if they "
        "disagree, it picks the latest, writes it back to the stale replicas, and returns "
        "the value. This self-heals skew every time a key is read.\n\n"
        "**Anti-entropy.** A background process periodically compares Merkle trees of key "
        "ranges between replicas and streams any differing keys. This catches divergence "
        "that read-repair misses (keys that aren't being read)."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Hot key.** A single key written 100K/sec lands on the same 3 replicas; they "
        "saturate. *Mitigation*: client-side write spreading (append a random suffix to the "
        "key, store the real key in the value); read-only replicas; or in DynamoDB, "
        "partition keys that hash to different nodes.\n\n"
        "- **Vector clock explosion.** A key written by 1000 distinct nodes (e.g. a counter "
        "incremented in a partition) has a 1000-entry clock. *Mitigation*: prune clocks to "
        "the last 10 entries; use dotted version vectors for counters.\n\n"
        "- **Hinted-handoff disk pressure.** If 5 nodes go down, the hint nodes accumulate "
        "5 nodes' worth of writes. *Mitigation*: bound hint storage (e.g. 1 GB per hint "
        "node); drop oldest hints; alert and trigger repair when hints accumulate.\n\n"
        "- **Read-repair storms.** After a long partition, the first read to every divergent "
        "key triggers a read-repair write, causing a write spike. *Mitigation*: rate-limit "
        "read-repair; do most anti-entropy in background Merkle sync.\n\n"
        "- **Gossip convergence lag.** With 1000+ nodes, gossip takes 10-30 seconds to "
        "converge, during which coordinators may write to 'dead' nodes. *Mitigation*: "
        "the write deadline times out and the coordinator uses hinted handoff.\n\n"
        "- **Bootstrap/rebalance hotspot.** Adding a new node pulls a token range from an "
        "existing node; if the range is huge, the existing node's disk and network saturate "
        "during transfer. *Mitigation*: stream the range in chunks with rate limiting; use "
        "vnodes so each new node drains a small slice from many existing nodes.\n\n"
        "- **Sloppy quorums.** A write that goes to a hint node instead of a real replica "
        "still counts toward the W quorum. If the hint node is on a different rack, you can "
        "lose durability on a rack failure. *Mitigation*: rack-aware replica placement."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Horizontal scale.* Add nodes; vnodes automatically rebalance a slice of the ring. "
        "A 1000-node cluster with 256 vnodes/node means each new node drains 1/1000th of "
        "the keyspace from each existing node — fast, balanced, no operator intervention.\n\n"
        "*Replication factor.* RF=3 is the sweet spot: tolerates 1 failure with quorum "
        "reads/writes (W=2, R=2, since 2+2 > 3). RF=5 tolerates 2 failures but triples "
        "storage and replication traffic.\n\n"
        "*Cross-DC replication.* For multi-region, run RF=3 with replicas spread: 2 in the "
        "primary DC, 1 in a remote DC. This survives a DC loss with no data loss. For "
        "stronger locality, run independent RF=3 rings per DC with async cross-DC streaming "
        "— local reads are fast, but cross-DC consistency is eventual.\n\n"
        "*Storage compaction.* LSM-trees accumulate SSTables; without compaction, reads "
        "slow as the number of SSTables grows. Run tiered compaction for write-heavy "
        "workloads (lower write amp), leveled compaction for read-heavy (lower read amp). "
        "Compaction is the #1 cause of latency spikes — bound its IOPS.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose AP over CP — system stays writable during a partition, but two clients "
        "may write concurrently to the same key and produce siblings.\n"
        "- We chose per-request W/R — caller picks speed vs consistency, but a misconfigured "
        "caller can get stale reads.\n"
        "- We chose vector clocks over last-write-wins — correct under concurrent writes, "
        "but clocks grow and require pruning.\n"
        "- We chose sloppy quorums + hinted handoff — writes always succeed, but a write "
        "may live on a non-replica node temporarily, complicating failure reasoning.\n"
        "- We chose gossip over a coordinator service — no SPOF, but cluster state lags "
        "10-30s, so coordinators sometimes write to dead nodes (recovered via hint)."),
    quiz("q1",
        "You need strong consistency for a specific key (e.g. a bank balance). Which W and R should you use with N=3?",
        ["W=1, R=1 (fastest path, accept eventual consistency).",
         "W=2, R=2 (quorum: 2+2 > 3, so reads always see the latest write).",
         "W=1, R=3 (write fast, read all replicas).",
         "Any combination works as long as W + R >= 2."],
        1,
        "Strong consistency in a quorum system requires W + R > N, guaranteeing that the read quorum and write quorum always overlap on at least one replica that has the latest write. With N=3, W=2, R=2 satisfies 2+2 > 3. W=1,R=3 also satisfies 1+3 > 3 but is read-heavy. W=2,R=2 is the standard balance. Note: this gives you linearizable single-key reads/writes, but does NOT give you multi-key transactions — for those you need Paxos/Raft or LWT (lightweight transactions).",
        "interview"),
    quiz("q2",
        "During a network partition, two clients concurrently write different values to the same key on different sides of the partition. When the partition heals, what does get(key) return?",
        ["The value with the later wall-clock timestamp (last-write-wins).",
         "Both values as siblings; the application must reconcile them.",
         "Whichever value was written first; the second is dropped.",
         "An error indicating the key is corrupt."],
        1,
        "Dynamo returns both concurrent values as siblings because neither vector clock dominates the other. This is the correct behavior under eventual consistency: the store does not throw away either write, because it cannot know which one is 'right'. The application reads both, applies business logic to merge (e.g. sum for a counter, union for a set, or prompt the user), and writes back a new value whose vector clock dominates both. Last-write-wins (option A) is what Cassandra does by default — it's simpler but silently loses concurrent writes, which is wrong for anything where data loss matters.",
        "interview"),
]

w("design-key-value-store",
  "Design Key-Value Store",
  "Design a Dynamo-style distributed, eventually-consistent key-value store. Covers consistent hashing with virtual nodes, replication factor N with tunable W/R quorums, vector clocks for concurrent-write detection, hinted handoff for partition tolerance, read repair, and Merkle-tree anti-entropy. The deep dive walks through how a put/get traverses the ring and how the system stays available during node failures.",
  "Every modern NoSQL database (DynamoDB, Cassandra, Riak, Voldemort, ScyllaDB) derives from the 2007 Dynamo paper. The patterns it introduced — consistent hashing, vector clocks, quorum tunability, hinted handoff — are the vocabulary for every distributed storage system you will design or operate. Understanding them at this depth is the difference between 'I have used Redis' and 'I can reason about a 1000-node cluster under partial failure.'",
  ["consistent-hashing", "replication", "sharding"],
  ["design-url-shortener"],
  30, "interview",
  kv_blocks,
  ["Always-available writes — any reachable node accepts the write (AP system).",
   "Tunable consistency per request via W/R quorum sizes.",
   "Linear horizontal scaling with virtual nodes for balanced redistribution.",
   "Self-healing: read-repair + Merkle anti-entropy converge divergence automatically."],
  ["Eventually consistent — concurrent writes produce siblings the application must reconcile.",
   "No multi-key transactions or JOINs in the base design.",
   "Vector clocks grow under write-heavy keys; pruning is required.",
   "Gossip convergence lags 10-30s on large clusters, causing transient bad routing."],
  ["Hot key saturates its 3 replicas — needs write spreading.",
   "Vector clock explosion on frequently-partitioned counters — needs dotted version vectors.",
   "Hinted-handoff disk pressure when many nodes fail simultaneously.",
   "Read-repair storms after a long partition heals.",
   "Bootstrap hotspot when adding a node drains a huge token range."],
  ["Choosing W=1, R=1 for a financial key and assuming strong consistency.",
   "Forgetting that W + R > N is required for quorum overlap.",
   "Treating last-write-wins as safe for concurrent writes (it silently drops data).",
   "Bounding hint storage to 0 — partitions longer than the hint window lose writes.",
   "Ignoring rack awareness when placing replicas — a rack failure takes down all replicas."],
  ["Amazon DynamoDB",
   "Apache Cassandra",
   "Riak KV",
   "Voldemort (LinkedIn, now archived)",
   "ScyllaDB (C++ rewrite of Cassandra)"],
  ["Design a distributed key-value store like Dynamo.",
   "How do you handle concurrent writes to the same key during a network partition?",
   "Explain how consistent hashing lets you add a node without rehashing everything.",
   "What goes wrong if W + R <= N?"],
  [{"system": "Amazon DynamoDB", "how": "Production descendant of the Dynamo paper. RF=3 across AZs, tunable consistency (eventual vs strong), LWT for Paxos-based conditional writes."},
   {"system": "Apache Cassandra", "how": "Open-source Dynamo-lineage store. Uses Murmur3 partitioner, tombstones for deletes, hinted handoff, and Merkle-tree anti-entropy via nodetool repair."},
   {"system": "Riak KV", "how": "The most literal Dynamo implementation — exposes siblings and vector clocks directly to the application for conflict resolution."}])

print("Done with key-value store")


# =========================================================================
# 3. RATE LIMITER
# =========================================================================
rate_blocks = [
    prose("problem",
        "**What are we designing?** A distributed rate-limiting service that sits in front "
        "of our APIs and protects them from abuse. Every incoming request passes through "
        "the limiter, which decides in <1 ms whether to allow or reject (HTTP 429). Limits "
        "are per-user, per-API-key, per-IP, and per-route, with multiple windows (e.g. "
        "'100 req/min and 1000 req/hour per user').\n\n"
        "Rate limiting is deceptively hard. The single-node case is trivial — a counter in "
        "memory. The distributed case — where requests hit any of N API servers and the limit "
        "must be enforced globally — is the actual interview question. Add the requirement "
        "that limits are bursty-but-fair (allow a short spike, not a steady stream) and you "
        "are in algorithm territory."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Limit by any identity key: user_id, api_key, IP, route, or combination.\n"
        "- Multiple limits per identity (e.g. 100/min AND 1000/hour AND 10000/day).\n"
        "- Return HTTP 429 with `Retry-After` header on rejection.\n"
        "- Soft and hard limits: warn at 80% of limit, reject at 100%.\n"
        "- Dynamic limit configuration: change limits without redeploying.\n\n"
        "**Non-functional requirements.**\n"
        "- **Latency**: p99 < 1 ms added to each request (on the critical path of every API).\n"
        "- **Availability**: 99.99% (a dead limiter blocks all traffic).\n"
        "- **Accuracy**: exact (not approximate) for hard limits; a slight over-allowance on "
        "soft limits is acceptable.\n"
        "- **Scale**: 1M req/sec peak across the cluster.\n"
        "- **Fail-open vs fail-closed**: depends on the route. Auth/login must fail-closed "
        "(better to lock users out than let an attacker in); content fetch should fail-open "
        "(better to over-serve than to 5xx the homepage).\n\n"
        "**Non-goals.** No bot detection (that's a separate WAF). No DDoS mitigation at L3/L4 "
        "(that's Cloudflare)."),
    prose("capacity",
        "**Capacity estimation.** Assume 100K req/sec steady, 1M req/sec peak.\n\n"
        "*Latency budget.* The limiter adds to EVERY request, so it must be sub-millisecond. "
        "That rules out a synchronous DB lookup; we need in-memory or a co-located Redis.\n\n"
        "*Memory per counter.* A token-bucket entry is ~50 bytes (key + tokens + last_refill "
        "timestamp). If we limit 10M unique users across 5 windows each, that's 50M entries x "
        "50 B = 2.5 GB. Fits easily in a Redis cluster.\n\n"
        "*Network.* Every request is one Redis round trip. 1M req/sec x 1 round trip = 1M "
        "Redis ops/sec. A 6-node Redis cluster handles 1M ops/sec comfortably (each shard "
        "~200K ops/sec).\n\n"
        "*Write bandwidth.* Each limit check is a read-modify-write (decrement tokens). At 1M "
        "ops/sec that's 1M writes/sec to Redis — fine, but each write is to a different key, "
        "so we need cluster-mode sharding.\n\n"
        "*Hot-key risk.* A single user/IP hammering us at 100K req/sec concentrates all their "
        "writes on one Redis shard. Mitigation: short-circuit at the edge (per-instance local "
        "limit of 10 req/sec per IP) before hitting Redis; this drops the Redis load by 100x "
        "for abuse."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/check\n"
        "  body: { identity: {user_id, ip, route}, timestamp }\n"
        "  resp: { allowed: bool, remaining: int, retry_after_ms?: int, limit_name: str }\n\n"
        "GET  /v1/limits/{identity}                  -> current usage\n"
        "PUT  /v1/config/{limit_name}                -> update limit (hot reload)\n"
        "```\n\n"
        "The limiter is typically deployed as a sidecar (Envoy, Istio) or an in-process "
        "library (Stripe's Rack::Attack). The HTTP API above is for a standalone service.\n\n"
        "**Response headers.** Every API response includes rate-limit headers so clients can "
        "throttle themselves:\n"
        "```\n"
        "X-RateLimit-Limit:     100\n"
        "X-RateLimit-Remaining: 73\n"
        "X-RateLimit-Reset:     1700000000\n"
        "Retry-After:           12          (only on 429)\n"
        "```"),
    prose("data-model",
        "**Data model.** The limiter's state lives in Redis.\n\n"
        "*Token bucket* (per identity per window):\n"
        "```\n"
        "key:   rl:{limit_name}:{identity}     e.g. rl:per_user:u_42\n"
        "value: HASH { tokens: float, last_refill: ts }\n"
        "TTL:   window_size_seconds * 2        (auto-expire idle buckets)\n"
        "```\n\n"
        "*Sliding window* (alternative, more accurate):\n"
        "```\n"
        "key:   rl:sw:{limit_name}:{identity}\n"
        "value: ZSET member=ts, score=ts      (every request adds its ts)\n"
        "       ZREMRANGEBYSCORE 0 (now-window)    (drop old)\n"
        "       ZCARD                                 (count current window)\n"
        "TTL:   window_size_seconds\n"
        "```\n\n"
        "*Configuration* (Postgres, cached in Redis):\n"
        "```\n"
        "limits (\n"
        "  name          VARCHAR PRIMARY KEY,    -- 'per_user_minute'\n"
        "  identity_dim  VARCHAR,                -- 'user_id' / 'ip' / 'route'\n"
        "  algorithm     VARCHAR,                -- 'token_bucket' / 'sliding_window'\n"
        "  capacity      INT,\n"
        "  refill_rate   FLOAT,                  -- tokens per second\n"
        "  window_sec    INT,                    -- for sliding window\n"
        "  fail_mode     VARCHAR                 -- 'open' / 'closed'\n"
        ")\n"
        "```\n\n"
        "Configuration is hot-reloadable: the limiter polls Redis every 5s for config changes, "
        "or subscribes to a Redis Pub/Sub channel `rl:config`."),
    diagram("arch",
        "                    [Client]\n"
        "                       |\n"
        "                       v\n"
        "            [API Gateway / LB]\n"
        "                       |\n"
        "          (1) every request passes through limiter\n"
        "                       v\n"
        "          +------------------------+\n"
        "          |  Rate Limiter Sidecar  |   (in-process library or Envoy filter;\n"
        "          |  - local L1 cache      |    local limits per instance, short-circuits\n"
        "          |  - local token bucket  |    obvious abuse before Redis round trip)\n"
        "          +------------------------+\n"
        "                       |\n"
        "          (2) hard-limit check needs global state -> Redis\n"
        "                       |\n"
        "                       v\n"
        "             [Redis Cluster]\n"
        "               - sharded by identity hash\n"
        "               - Lua scripts for atomic read-modify-write\n"
        "                       |\n"
        "          (3a) allowed -> forward to API service\n"
        "          (3b) denied  -> 429 with Retry-After\n"
        "                       v\n"
        "                  [API Service]\n\n"
        "  -- config plane --\n"
        "  Admin -> [Postgres limits table] -> [Redis pub/sub 'rl:config']\n"
        "                                            |\n"
        "                              sidecars subscribe, hot-reload",
        "Distributed rate limiter: local L1 cache short-circuits abuse, Redis cluster holds global counters, Lua scripts keep read-modify-write atomic.",
        "A diagram of a distributed rate limiter. Client traffic enters through an API gateway or load balancer, then flows through a rate-limiter sidecar running on each API instance. The sidecar has a local L1 cache and a per-instance token bucket that short-circuits obvious abuse before any network call. For hard-limit checks the sidecar calls into a Redis cluster sharded by identity hash, using Lua scripts to keep the read-modify-write atomic. Allowed requests are forwarded to the API service; denied requests return 429 with a Retry-After header. A separate config plane lets admins update limit rules in Postgres, which publishes changes on a Redis pub-sub channel that sidecars subscribe to for hot-reload."),
    prose("deep-dive",
        "**Deep dive: token bucket vs sliding window vs leaky bucket.**\n\n"
        "**Token bucket.** Each identity has a bucket of size `capacity`, refilled at "
        "`refill_rate` tokens/sec. Each request consumes 1 token; if the bucket is empty, "
        "reject. Pros: allows bursts (a full bucket of 100 tokens lets a user do 100 req in "
        "0.1s). Cons: the first request after an idle period gets the full bucket, which can "
        "cause micro-bursts. This is the AWS API Gateway default.\n\n"
        "**Sliding window.** Track every request's timestamp in a sorted set; on each new "
        "request, drop entries older than `window`, count remaining, reject if >= limit. "
        "Pros: exact — the limit is 'at most N in any rolling 60s'. Cons: O(N) memory per "
        "identity for the timestamps; expensive for high-volume keys. This is what Stripe "
        "uses for its API limits.\n\n"
        "**Sliding window counter (hybrid).** Approximate sliding window by combining a "
        "current-window counter and a previous-window counter, weighted by overlap: "
        "`est = curr + prev * (1 - elapsed/window)`. Pros: O(1) memory, ~87% accuracy. "
        "Cons: slight over/under-allowance at window boundaries. This is what Cloudflare uses "
        "and is our recommended default.\n\n"
        "**Leaky bucket.** Requests enter a queue at any rate; the queue drains at a fixed "
        "rate. Pros: smooths out bursts into a steady stream (great for downstream protection). "
        "Cons: adds latency (queue wait); not a great fit for HTTP APIs. Used in telecom and "
        "by guava RateLimiter.\n\n"
        "**Atomicity in Redis.** A naive `GET tokens; DEC; SET` is racy — two concurrent "
        "requests could both read 1 token and both decrement to 0, allowing 2 when the limit "
        "is 1. The fix is a Lua script: Redis executes the script atomically, so "
        "read-modify-write is single-threaded and safe. This is the only correct way to do "
        "rate limiting in Redis.\n\n"
        "**Distributed coordination.** Even with Redis atomicity, two API instances checking "
        "the same user at the same instant both hit the same Redis shard — fine, that's "
        "atomic. The hard case is when Redis itself is partitioned. We use Redis Cluster with "
        "quorum reads (READWRITE on the primary) — if the primary is down we either fail-open "
        "or fail-closed per route's `fail_mode`.\n\n"
        "**Local L1 cache.** Each API instance keeps a tiny per-instance token bucket that "
        "caps traffic at, say, 2x the global limit. This short-circuits 99% of requests "
        "(no Redis call) and bounds Redis load. The slight over-allowance (each of N "
        "instances allows the local limit, so total can be N x local) is acceptable for "
        "soft limits; the global Redis check still enforces the hard limit."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Hot identity.** A user (or attacker) at 100K req/sec concentrates writes on one "
        "Redis shard. *Mitigation*: the L1 local bucket short-circuits at, say, 100 req/sec "
        "per instance, so Redis only sees ~100 req/sec from that user regardless of how hard "
        "they hit us.\n\n"
        "- **Redis failure.** If Redis dies, every limit check fails. *Mitigation*: fail-open "
        "for read-heavy routes (allow the request, log for later analysis); fail-closed for "
        "auth/payment routes. Run Redis Cluster with replicas + automatic failover.\n\n"
        "- **Clock skew.** Sliding-window algorithms depend on timestamps; if an API server's "
        "clock is 5 minutes off, it could compute wrong window boundaries. *Mitigation*: use "
        "NTP on all hosts; pass the request timestamp from the gateway (single source of "
        "truth) rather than reading the per-instance clock.\n\n"
        "- **Memory growth.** Each unique identity consumes ~50 bytes. 100M users x 5 windows "
        "= 25 GB. *Mitigation*: TTL every key (Redis auto-expires idle buckets after 2x "
        "window). LRU-evict the L1 cache.\n\n"
        "- **Cold-start latency.** A new user's first request finds no bucket in Redis; we "
        "create it. Slight latency spike on first hit. *Mitigation*: pre-create buckets for "
        "known active users; accept the one-time cost.\n\n"
        "- **Config propagation lag.** When you lower a limit, instances pick it up over 5 "
        "seconds (polling) — during which they apply the OLD limit. *Mitigation*: use Redis "
        "Pub/Sub for push notifications (sub-second propagation).\n\n"
        "- **Thundering herd on Redis recovery.** After a Redis failover, all instances retry "
        "at once. *Mitigation*: jittered backoff; L1 cache absorbs most retries."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Horizontal scale.* The limiter is stateless per instance — every node can serve "
        "every request. Scale by adding instances. Redis Cluster scales by adding shards "
        "(sharded by identity hash).\n\n"
        "*Multi-region.* Run an independent limiter + Redis per region. Cross-region global "
        "limits are not enforced strictly — a user hitting two regions can do 2x the limit. "
        "If you need global limits, async-replicate counters to a single authoritative region "
        "with periodic reconciliation (accepting over-allowance).\n\n"
        "*Hierarchical limits.* Per-instance local bucket -> per-shard Redis -> global Redis. "
        "Each layer is cheaper and weaker; the deepest layer enforces the true global limit. "
        "This is the standard pattern for high-QPS limiters (Cloudflare, Stripe).\n\n"
        "*Algorithms per limit.* Use sliding-window-counter as the default; switch to token "
        "bucket for bursty APIs (where short bursts should be allowed); switch to leaky "
        "bucket for protecting downstream systems that can't handle spikes.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose Redis-backed over in-memory only — **gained** global accuracy, **lost** "
        "the sub-ms latency of pure local checks (mitigated by L1).\n"
        "- We chose Lua scripts for atomicity — **gained** correctness, **lost** the ability "
        "to use Redis Cluster's MULTI/ACROSS multiple keys (single-shard only; we shard by "
        "identity so this is fine).\n"
        "- We chose fail-open for read routes — **gained** availability during Redis outages, "
        "**lost** strict enforcement during those windows.\n"
        "- We chose sliding-window-counter over true sliding window — **gained** O(1) "
        "memory, **lost** ~13% accuracy at window boundaries."),
    quiz("q1",
        "You need to rate limit a payment endpoint to 10 req/sec per user with EXACT accuracy (no over-allowance). Which algorithm do you choose?",
        ["Token bucket — allows bursts, simple, exact.",
         "Sliding window log (sorted set of timestamps) — exact, but O(N) memory.",
         "Sliding window counter — approximate (87% accurate), O(1) memory.",
         "Fixed window counter — exact within each minute boundary."],
        1,
        "Only the sliding-window log (ZSET of timestamps) gives exact accuracy: it counts actual requests in the rolling window. Token bucket allows bursts (a full bucket of 10 lets a user do 10 req in 0.01s, exceeding 10/sec). Sliding window counter is approximate (~13% error). Fixed window has boundary issues (a user can do 10 at 0:59 and 10 at 1:00 = 20 req in 2 seconds, exceeding the per-second limit). For a payment endpoint, exactness matters, so accept the O(N) memory cost. For most other endpoints, the sliding-window counter is the right trade-off.",
        "interview"),
    quiz("q2",
        "Your rate limiter is implemented as a simple `GET tokens; if > 0: DEC; SET`. Under load you discover some users exceed their limits. What went wrong?",
        ["Redis is single-threaded, so this can't be the issue.",
         "The GET-DEC-SET sequence is not atomic — two concurrent requests can both read the same token count and both decrement.",
         "The TTL on the keys is too long.",
         "The Lua script is being recompiled every request."],
        1,
        "GET, then DEC, then SET is three separate Redis commands. Between the GET and the SET, another request can read the same (stale) token count and both decrement, allowing 2x the limit. Redis is single-threaded PER COMMAND, not per multi-command sequence. The fix is to use a Lua script (Redis executes the entire script atomically) or the atomic DECR/INCR commands when the logic permits. This is the #1 bug in hand-rolled rate limiters.",
        "solid"),
]

w("design-rate-limiter",
  "Design Rate Limiter",
  "Design a distributed rate-limiting service that enforces per-user, per-IP, per-route limits at 1M req/sec with sub-millisecond added latency. Covers token bucket vs sliding window vs leaky bucket, a Redis-backed global counter store with Lua scripts for atomicity, an L1 local cache to short-circuit abuse, and fail-open vs fail-closed trade-offs per route.",
  "Every public API needs rate limiting — to prevent abuse, to enforce tiers, to protect downstream services, and to keep cloud bills bounded. The hard part is doing it distributedly and atomically at the edge of your system, on the critical path of every request. Get this wrong and you either let attackers in (too lax) or lock legitimate users out (too strict). The algorithm choice (token bucket vs sliding window) and the atomicity story (Lua scripts in Redis) are reusable knowledge for any control-plane system.",
  ["rate-limiting"],
  ["design-notification-system"],
  20, "interview",
  rate_blocks,
  ["Sub-millisecond added latency via L1 local cache + occasional Redis round trip.",
   "Exact limits via Lua scripts for atomic read-modify-write in Redis.",
   "Fail-open / fail-closed per route lets sensitive APIs stay strict while content APIs stay available.",
   "Hot-reloadable config via Redis Pub/Sub, no redeploy needed."],
  ["Adds 1 Redis round trip to the hot path of every request (mitigated by L1).",
   "Sliding-window-log is O(N) memory per identity — expensive for high-QPS keys.",
   "Global limits across regions require async reconciliation (over-allowance).",
   "Redis failure forces a fail-mode choice that either hurts accuracy or availability."],
  ["Hot identity saturates one Redis shard — needs L1 short-circuit.",
   "Non-atomic GET-DEC-SET race allows limit overruns — must use Lua scripts.",
   "Clock skew breaks sliding-window algorithms — needs NTP + gateway-provided timestamps.",
   "Config propagation lag applies stale limits during the propagation window.",
   "Memory growth from idle buckets — needs aggressive TTL."],
  ["Using GET then DEC then SET in Redis — race condition allows limit overruns.",
   "Choosing token bucket for a strict 'no bursts' requirement.",
   "Failing closed on every route — kills availability during a Redis outage.",
   "Running a single global Redis instance — hot-key hotspot, no HA.",
   "Forgetting to TTL keys — memory grows forever."],
  ["Stripe API rate limits (sliding window per user).",
   "GitHub API (token bucket, 5000 req/hour for authenticated users).",
   "AWS API Gateway usage plans (token bucket).",
   "Cloudflare rate limiting rules (sliding window counter).",
   "Kong / Envoy / Istio rate limit filters."],
  ["Design a distributed rate limiter.",
   "Token bucket vs sliding window — when do you pick which?",
   "How do you make the limiter atomic across multiple API instances?",
   "What happens if Redis dies — fail open or fail closed?"],
  [{"system": "Stripe API", "how": "Sliding-window log per user identity, 100 req/sec read and 100 req/sec write. Returns X-RateLimit-* headers on every response."},
   {"system": "Cloudflare", "how": "Edge-deployed sliding-window-counter algorithm, ~87% accuracy at O(1) memory, runs at every PoP for sub-ms latency."},
   {"system": "Envoy / Istio RateLimitService", "how": "Sidecar pattern with a central Redis-backed gRPC rate limit service; supports hierarchical limits and YAML-configured rules."}])

print("Done with rate limiter")


# =========================================================================
# 4. INSTAGRAM
# =========================================================================
instagram_blocks = [
    prose("problem",
        "**What are we designing?** An Instagram-style photo-sharing social network. Users "
        "post photos (with captions), follow other users, and browse a personalized feed of "
        "the most recent photos from people they follow. The system must handle massive read "
        "traffic (feed browsing dominates), large media uploads (photos and short videos), and "
        "real-time interactions (likes, comments).\n\n"
        "The defining design challenge is the **feed**: when user A follows 500 people and "
        "opens the app, the system must assemble a personalized timeline of the latest ~1000 "
        "posts from those 500 people, sorted by recency, in under 200 ms — and it must do "
        "this for 500M daily users simultaneously. Feed generation strategy is the heart of "
        "this case study."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Users can post a photo with a caption and optional location.\n"
        "- Users can follow / unfollow other users.\n"
        "- Users can browse their feed (recent posts from followed users, paginated).\n"
        "- Users can like / comment on a post.\n"
        "- Users can view a profile with their own posts.\n\n"
        "**Non-functional requirements.**\n"
        "- **Feed latency**: p99 < 200 ms (users expect instant app open).\n"
        "- **Photo upload**: < 5 s end-to-end including processing.\n"
        "- **Availability**: 99.99% (Instagram is daily-use; outages are news).\n"
        "- **Storage**: photos are forever; we never delete user content.\n"
        "- **Scale**: 500M DAU, 100M new posts/day, 10B feed reads/day.\n\n"
        "**Non-goals.** No stories (24-hour content), no DM, no algorithmic ranking (v1 is "
        "chronological; ranking is layered on in design-news-feed)."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*DAU & QPS.* 500M DAU, average 20 feed refreshes/day = 10B feed reads/day = "
        "~115K feed reads/sec average, peak ~500K/sec.\n\n"
        "*Posts.* 100M posts/day, each ~500KB after compression (photo + thumbnail). "
        "100M x 500KB = 50 TB/day of new media = ~18 PB/year. Stored on object storage (S3).\n\n"
        "*Feed metadata.* Each post is ~1KB metadata (post_id, user_id, timestamp, caption "
        "hash, media_url). 100M x 1KB = 100GB/day of metadata = ~36 TB/year. Stored in "
        "sharded SQL.\n\n"
        "*Bandwidth.* Photo upload: 100M x 500KB / 86400 = ~580 MB/s = 4.6 Gbps ingress. Feed "
        "read: each feed refresh returns ~20 posts x 100KB (compressed thumbnails) = 2MB; "
        "500K/sec x 2MB = 1 GB/s = 8 Gbps egress from origin. With CDN serving photos, "
        "origin egress drops to ~10% (0.8 Gbps).\n\n"
        "*Feed cache.* 500M users x their pre-computed feed (last 1000 post_ids) x 8 bytes = "
        "4 GB. Trivially fits in Redis. But if we fan out writes, each new post by a user with "
        "100 followers pushes the post_id into 100 feeds; with 100M posts/day x avg 200 "
        "followers = 20B fan-out writes/day = 230K writes/sec. Manageable."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/posts              (multipart: photo + caption + location)\n"
        "GET  /v1/feed?cursor=...    -> { posts: [...], next_cursor }\n"
        "GET  /v1/users/:id          -> profile + recent posts\n"
        "POST /v1/users/:id/follow\n"
        "DELETE /v1/users/:id/follow\n"
        "POST /v1/posts/:id/like\n"
        "POST /v1/posts/:id/comments\n"
        "```\n\n"
        "Photo upload uses **presigned S3 URLs (valet keys)** so the client uploads directly "
        "to object storage — the API server never proxies the photo bytes. After upload, the "
        "client calls `POST /v1/posts` with the S3 object key; the server kicks off an async "
        "transcoding pipeline and inserts the post metadata. The post appears in feeds only "
        "after transcoding completes (a few seconds)."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Users* (sharded SQL):\n"
        "```\n"
        "users (id BIGINT PK, username, bio, avatar_url, created_at)\n"
        "```\n\n"
        "*Posts* (sharded SQL, sharded by user_id):\n"
        "```\n"
        "posts (id BIGINT PK, user_id, caption, media_url, location GEO,\n"
        "       created_at, like_count, comment_count)\n"
        "INDEX (user_id, created_at DESC)        -- for profile pages\n"
        "```\n\n"
        "*Follows* (sharded SQL or graph DB):\n"
        "```\n"
        "follows (follower_id, followee_id, created_at, PRIMARY KEY (follower_id, followee_id))\n"
        "INDEX (followee_id)                     -- for 'who follows me'\n"
        "INDEX (follower_id, created_at)         -- for 'who do I follow'\n"
        "```\n\n"
        "*Feed cache* (Redis sorted set per user):\n"
        "```\n"
        "key: feed:{user_id}\n"
        "value: ZSET member=post_id, score=created_at   -- capped at top 1000\n"
        "```\n\n"
        "*Photo storage* (S3):\n"
        "```\n"
        "bucket: ig-media-prod\n"
        "key:    {user_id}/{post_id}/{variant}    -- variant = orig|1080|720|480|thumb\n"
        "```\n"
        "Multiple resolutions are generated by the transcoding pipeline for adaptive delivery."),
    diagram("arch",
        "                [Mobile / Web Client]\n"
        "                          |\n"
        "       +------------------+------------------+\n"
        "       |                                     |\n"
        "   (a) photo upload                    (b) feed read\n"
        "       |                                     |\n"
        "       v                                     v\n"
        "  [Presigned S3 URL]              [CDN -> API Gateway]\n"
        "       |                                     |\n"
        "       v                                     v\n"
        "  [Object Storage S3]            [Feed Service]\n"
        "       | (object key)                        |\n"
        "       v                                     |\n"
        "  [POST /posts] -+                (2) Redis cache-aside:\n"
        "       |          \\                    GET feed:{user_id}\n"
        "       v           \\                       |\n"
        "  [Post Service]    \\               +-------+-------+\n"
        "       |             \\              | miss          | hit\n"
        "       | (insert       \\             v               v\n"
        "       |  metadata)    \\       [Posts DB]      (return cached\n"
        "       |               \\      (sharded by       post_ids +\n"
        "       v                \\      user_id)         hydrate from\n"
        "  [Transcode Pipeline]  \\                       cache)\n"
        "  - resize to 1080/720/480/thumb\n"
        "  - store variants in S3\n"
        "       |\n"
        "       v\n"
        "  [Fan-out Worker]  reads post.user_id, looks up followers,\n"
        "                    ZADD feed:{follower_id} post_id for each follower.\n"
        "                    Skipped for celebrity users (>10K followers):\n"
        "                    their posts are pulled on read instead.",
        "Instagram: photo upload via presigned S3 + async transcode + fan-out-on-write to follower feeds. Feed read is cache-aside from Redis.",
        "A diagram of Instagram's architecture. Two flows: photo upload and feed read. For upload: the client gets a presigned S3 URL and uploads directly to object storage, then calls POST /posts with the object key. The Post Service inserts metadata into a sharded SQL database and kicks off a transcoding pipeline that generates multiple resolutions. A fan-out worker then reads the post's followers and pushes the post_id into each follower's Redis sorted-set feed cache. For feed read: the client hits the CDN, then the API gateway, then the Feed Service which does a cache-aside lookup against Redis. On a hit it returns cached post_ids and hydrates them from cache. On a miss it falls through to the sharded Posts DB. Celebrity users with more than 10K followers skip fan-out — their posts are pulled on read instead."),
    prose("deep-dive",
        "**Deep dive: feed generation — fan-out on write vs read.**\n\n"
        "**Fan-out on write (push model).** When user P posts, the system looks up P's "
        "followers and pushes `post_id` into each follower's Redis feed (ZADD with score = "
        "post timestamp). Reads are O(1): just ZRANGE the user's feed.\n\n"
        "Pros: feed reads are instant (single Redis call). Cons: write amplification. A user "
        "with 1M followers triggers 1M Redis writes per post. For Justin Bieber (100M "
        "followers), a single post = 100M Redis writes — that crushes the cluster.\n\n"
        "**Fan-out on read (pull model).** When user U opens their feed, the system looks up "
        "the users U follows (say 500), fetches their recent posts from each user's "
        "post_id list (already indexed by `(user_id, created_at)`), merges by timestamp, "
        "returns the top 20.\n\n"
        "Pros: no write amplification — posting is O(1). Cons: feed reads are expensive — "
        "500 DB queries per refresh, even after caching.\n\n"
        "**Hybrid (our choice).** Fan-out on write for normal users (most users have <500 "
        "followers); fan-out on read for celebrities (>10K followers). This caps the worst-"
        "case fan-out at 10K writes per post while keeping feed reads fast for 99% of users.\n\n"
        "**Concrete numbers.** Average user has ~200 followers. 100M posts/day x 200 = "
        "20B fan-out writes/day = 230K writes/sec. Top 0.1% of users (celebrities) average "
        "10M followers — if we fanned them out, 1 post = 10M writes. By pulling them on "
        "read, we save ~10M writes per celebrity post and pay only ~500 extra DB queries per "
        "feed read for users who follow a celebrity (most users follow 1-5 celebrities).\n\n"
        "**Capping the feed.** Each user's feed cache holds the last 1000 post_ids (ZSET, "
        "score = timestamp, ZREMRANGEBYRANK to evict beyond 1000). If the user scrolls past "
        "1000, we fall through to the pull model for older posts.\n\n"
        "**Stale feed problem.** With fan-out on write, if a user is unfollowed AFTER their "
        "post was pushed, the post lingers in the unfollower's feed. *Mitigation*: on "
        "unfollow, ZREM all of unfollowed-user's recent post_ids from the unfollower's feed. "
        "Cheap because the unfollower typically only has a few hundred of the unfollowed "
        "user's posts in their feed.\n\n"
        "**Deletion propagation.** When a user deletes a post, we must remove it from every "
        "follower's feed. *Mitigation*: lazy deletion — mark the post deleted; feed reads "
        "filter deleted post_ids at hydration time. Periodic background job ZREMs stale "
        "deleted post_ids."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Celebrity post spike.** A celebrity with 100M followers posts; even at pull-on-"
        "read, the next minute's feed reads all hit the celebrity's post shard. *Mitigation*: "
        "cache the celebrity's recent posts in a separate hot-key cache; replicate to multiple "
        "shards.\n\n"
        "- **Redis feed cache failure.** If Redis dies, every feed read falls through to the "
        "pull model — 500 DB queries per read at 500K reads/sec = 250M queries/sec. The DB "
        "dies. *Mitigation*: Redis cluster with replicas + circuit breaker that returns stale "
        "feeds with a 503-and-retry after 1s, rather than crushing the DB.\n\n"
        "- **Transcoding pipeline backlog.** If transcode workers fall behind (viral video, "
        "instance failure), posts take minutes to appear in feeds. *Mitigation*: autoscale "
        "workers based on queue depth; show a placeholder thumbnail immediately so the post "
        "appears in feeds, then swap to full-res when transcode completes.\n\n"
        "- **S3 upload failures.** If a presigned URL expires before the client finishes "
        "uploading a large video, the upload fails. *Mitigation*: use multipart upload with "
        "S3 (each part gets its own presigned URL; parts can retry independently).\n\n"
        "- **Hot post.** A post goes viral — 1M likes in 5 minutes. The like counter row "
        "becomes a write hotspot. *Mitigation*: shard the counter across N rows (e.g. "
        "likes_0, likes_1, ... likes_9) and sum on read; or use a CRDT counter (Redis "
        "INCR is single-threaded — needs sharding for >10K writes/sec).\n\n"
        "- **Fan-out write storm.** When a celebrity crosses 10K followers, our policy flips "
        "from push to pull. The transition must not retroactively remove their pushed posts "
        "from existing feeds. *Mitigation*: just stop pushing NEW posts; old pushed posts age "
        "out naturally."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Database sharding.* Shard `posts` and `follows` by `user_id` (so a user's posts "
        "and follow graph live on one shard). Cross-shard feed reads are reduced by the "
        "fan-out-on-write cache.\n\n"
        "*CDN for media.* Photos are served from a CDN (Cloudflare, CloudFront). Cache hit "
        "rate >95% for popular posts; origin egress drops 10x. Cache key includes the "
        "variant resolution so the CDN serves the right size.\n\n"
        "*Multi-region.* Deploy feed-service + Redis feed cache in 5+ regions. Posts DB is "
        "globally replicated (eventually consistent); writes go to a single primary region. "
        "Feed reads hit the local Redis cache.\n\n"
        "*Transcoding autoscaling.* Scale transcode workers based on Kafka queue depth. Each "
        "worker pulls a job, transcodes (FFmpeg / libvips), uploads variants to S3, marks the "
        "post ready.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose fan-out on write for normal users — **gained** instant feed reads, "
        "**lost** cheap celebrity posting (mitigated by hybrid).\n"
        "- We chose chronological feed — **gained** predictability and simplicity, **lost** "
        "engagement optimization (algorithmic ranking adds 5-20% time-on-site but is a whole "
        "ML system of its own).\n"
        "- We chose presigned S3 uploads — **gained** no photo bytes through API servers, "
        "**lost** the ability to do server-side validation before storage (mitigated by "
        "post-upload content moderation).\n"
        "- We chose lazy deletion of feed entries — **gained** cheap delete, **lost** "
        "immediate consistency (a deleted post may appear briefly in feeds before "
        "hydration filters it)."),
    quiz("q1",
        "Justin Bieber (100M followers) posts a photo. With pure fan-out-on-write, what happens?",
        ["100M Redis writes that crush the feed-cache cluster; you must switch to fan-out-on-read for celebrities.",
         "A single write to Bieber's own feed; followers' feeds are populated on read.",
         "100M writes, evenly distributed across all Redis shards — fine, no problem.",
         "The post is dropped because the fan-out exceeds a timeout."],
        0,
        "Fan-out-on-write pushes the post_id into every follower's feed, so a single Bieber post = 100M Redis writes. Even sharded across 100 Redis shards, that's 1M writes per shard in a burst — enough to saturate them. The fix is the hybrid model: celebrities (>10K followers) use fan-out-on-read; their posts are fetched from their own shard at feed-read time. Instagram literally does this. Pure fan-out-on-read (option B) is wrong for normal users because feed reads become 500-query joins.",
        "interview"),
    quiz("q2",
        "Your feed cache is Redis. Redis dies. What happens?",
        ["Feed reads fall through to the DB, which now must serve 500 queries per feed refresh at 500K req/sec — it dies too. Need a circuit breaker + replica.",
         "Nothing — feeds are recomputed in-memory on the API servers.",
         "Posts are lost because Redis was the source of truth.",
         "The system automatically promotes a Redis replica, no client impact."],
        0,
        "Redis is the cache, not the source of truth (posts and follows live in sharded SQL). But without Redis, every feed read fans out to ~500 DB queries; at 500K reads/sec that's 250M queries/sec — guaranteed DB collapse. The correct mitigation is (a) Redis cluster with replicas + automatic failover (a replica is promoted in 10-30s), and (b) a circuit breaker in the Feed Service that returns 503 with Retry-After when Redis is unreachable, rather than letting the DB get crushed. Posts are never lost — they're in the Posts DB.",
        "interview"),
]

w("design-instagram",
  "Design Instagram",
  "Design a photo-sharing social network with 500M DAU. Covers presigned-S3 photo upload with async transcoding, the feed-generation decision between fan-out-on-write vs fan-out-on-read (and the hybrid used for celebrities), Redis sorted-set feed caches, and CDN-fronted media delivery. The deep dive walks through why pure fan-out-on-write collapses for Justin Bieber and how the hybrid model solves it.",
  "Instagram is the canonical 'social feed' design problem because it combines three of the hardest patterns in distributed systems: media storage at petabyte scale, a read-heavy personalized feed, and the fan-out-vs-pull trade-off that defines every social product. The hybrid fan-out model — push for normal users, pull for celebrities — is the answer to one of the most common system-design interview questions and is literally how Instagram, Twitter, and Facebook work.",
  ["cdn", "object-storage", "cache-aside", "sql-vs-nosql"],
  ["design-twitter", "design-news-feed"],
  35, "interview",
  instagram_blocks,
  ["Feed reads are O(1) for normal users thanks to fan-out-on-write into Redis ZSETs.",
   "Presigned S3 uploads keep photo bytes off the API servers.",
   "CDN absorbs >95% of media egress; origin stays small.",
   "Hybrid fan-out (push normal, pull celebrity) bounds worst-case write amplification."],
  ["Celebrity posts still stress the pull path — needs a hot-post cache.",
   "Redis feed cache failure cascades into DB collapse without a circuit breaker.",
   "Fan-out-on-write makes deletion and unfollow propagation expensive.",
   "Chronological feed is less engaging than algorithmic (intentional v1 scope)."],
  ["Celebrity post spike saturates a celebrity's post shard — needs hot-post cache replication.",
   "Redis feed cache death -> DB collapse — needs circuit breaker + replicas.",
   "Transcoding pipeline backlog delays posts appearing in feeds — needs autoscaling.",
   "Like-counter hotspot on viral posts — needs counter sharding.",
   "S3 presigned URL expiry breaks large video uploads — needs multipart upload."],
  ["Pure fan-out-on-write for all users — crushed by celebrity posts.",
   "Pure fan-out-on-read for all users — crushes DB with 500-query joins.",
   "Using Redis as the source of truth for posts — loses data on Redis failure.",
   "Proxying photo uploads through the API server — wastes bandwidth and CPU.",
   "Forgetting to handle unfollow / delete propagation in pushed feeds."],
  ["Instagram (Facebook/Meta)",
   "Twitter / X timeline",
   "Threads",
   "Pixelfed (fedora equivalent)"],
  ["Design Instagram. How do you generate the feed?",
   "Justin Bieber posts a photo. What happens to your system?",
   "How do you handle photo upload at scale without overloading API servers?",
   "Your Redis feed cache dies. What happens next?"],
  [{"system": "Instagram", "how": "Fan-out-on-write for normal users into Redis ZSETs, pull-on-read for celebrities. Photo upload via presigned S3 URLs. CDN-served media. Documented in various Meta engineering blog posts."},
   {"system": "Twitter", "how": "Similar hybrid fan-out, with celebrity detection at ~10K followers. Uses Redis Gemini clusters for timeline caches."},
   {"system": "Facebook", "how": "Uses a more sophisticated pull-on-read with EdgeRank ranking, but the storage primitives are the same."}])

print("Done with Instagram")


# =========================================================================
# 5. TWITTER
# =========================================================================
twitter_blocks = [
    prose("problem",
        "**What are we designing?** Twitter (now X). Users post short text messages "
        "(tweets, up to 280 chars), optionally with images or video. They follow other users "
        "and see a reverse-chronological (or ranked) timeline of tweets from people they "
        "follow. They can retweet, quote-tweet, reply, and like. The defining challenge is "
        "the same as Instagram's — fan-out — but at much higher text volume (tweets are tiny, "
        "so users post far more often than photos), with the added complication of the "
        "'celebrity problem' at extreme scale (a single tweet from Elon Musk reaches 150M+ "
        "followers instantly)."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Post a tweet (text + optional media).\n"
        "- Follow / unfollow users.\n"
        "- Browse the home timeline (tweets from followed users).\n"
        "- Browse the user timeline (a specific user's tweets).\n"
        "- Retweet, quote, reply, like.\n"
        "- Search tweets (full-text).\n\n"
        "**Non-functional requirements.**\n"
        "- **Timeline read latency**: p99 < 100 ms (Twitter's actual SLO).\n"
        "- **Tweet post latency**: < 500 ms until the tweet is visible to the poster.\n"
        "- **Availability**: 99.99% (Twitter outages make global headlines).\n"
        "- **Scale**: 250M DAU, 500M tweets/day, 100B+ timeline reads/day.\n"
        "- **Search**: < 500 ms for full-text search across the entire tweet corpus.\n\n"
        "**Non-goals.** No DM (separate system), no Moments, no algorithmic ranking in v1."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Tweets.* 500M tweets/day, each ~300 bytes (text + metadata, media stored "
        "separately). 500M x 300 B = 150 GB/day of tweet text = ~55 GB/year. Tiny by "
        "storage standards; a single Cassandra node could hold years of text. With media "
        "(10% of tweets have images, avg 500KB), 50M x 500KB = 25 TB/day of media.\n\n"
        "*Timeline reads.* 250M DAU x ~50 refreshes/day = 12.5B timeline reads/day = "
        "~145K reads/sec average, peak ~700K/sec.\n\n"
        "*Fan-out.* Average user follows ~200 people and is followed by ~200. 500M "
        "tweets/day x 200 = 100B fan-out writes/day = 1.15M writes/sec. This is the real "
        "load: writes, not reads, because of fan-out-on-write.\n\n"
        "*Celebrity fan-out.* Elon Musk (150M followers) tweeting once = 150M fan-out "
        "writes. At Twitter's peak, ~20 such celebrity tweets/day = 3B writes/day = "
        "~35K writes/sec just from celebrities. This is why celebrities need pull-on-read.\n\n"
        "*Storage.* Timeline cache: 250M users x 800 tweet_ids (last 3 days) x 8 bytes = "
        "1.6 TB in Redis. Fits in a medium Redis cluster.\n\n"
        "*Bandwidth.* 145K reads/sec x 5KB (response = 20 tweets x 250 bytes) = 725 MB/s = "
        "5.8 Gbps egress. With media served from CDN, origin egress is mostly text."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/tweets                    (text, media_ids[])\n"
        "GET  /v1/tweets/:id\n"
        "DELETE /v1/tweets/:id\n"
        "POST /v1/tweets/:id/retweet\n"
        "POST /v1/tweets/:id/like\n\n"
        "GET  /v1/timeline/home?cursor=...  -> reverse-chrono tweets from followed users\n"
        "GET  /v1/timeline/user/:id?cursor   -> a specific user's tweets\n\n"
        "POST /v1/users/:id/follow\n"
        "DELETE /v1/users/:id/follow\n\n"
        "GET  /v1/search?q=...&type=latest   -> full-text search\n"
        "```\n\n"
        "Tweets are written via a single `POST /tweets`. The service inserts the tweet "
        "into the store and fires a fan-out job asynchronously so the poster's request "
        "returns immediately."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Tweets* (Cassandra, partitioned by tweet_id, replicated RF=3):\n"
        "```\n"
        "tweets (\n"
        "  tweet_id    TIMEUUID,        -- Snowflake ID, sortable by time\n"
        "  user_id     BIGINT,\n"
        "  text        TEXT,\n"
        "  media_urls  LIST<TEXT>,\n"
        "  reply_to    BIGINT NULL,\n"
        "  retweet_of  BIGINT NULL,\n"
        "  created_at  TIMESTAMP,\n"
        "  PRIMARY KEY (tweet_id)\n"
        ")\n"
        "```\n"
        "Partitioned by `tweet_id` (Snowflake). A secondary index by `user_id` supports "
        "user-timeline queries.\n\n"
        "*Follows* (Cassandra, partitioned both ways):\n"
        "```\n"
        "follows (\n"
        "  follower_id BIGINT,\n"
        "  followee_id BIGINT,\n"
        "  created_at  TIMESTAMP,\n"
        "  PRIMARY KEY (follower_id, followee_id)\n"
        ")\n"
        "followers_by_followee (followee_id, follower_id, ...)   -- materialized inverse\n"
        "```\n\n"
        "*Timeline cache* (Redis, sorted set per user):\n"
        "```\n"
        "key: tl:{user_id}\n"
        "value: ZSET member=tweet_id, score=created_at_timestamp\n"
        "       capped at 800 entries (last ~3 days)\n"
        "```\n\n"
        "*Tweet IDs* are Snowflake: 64 bits = 41-bit millisecond timestamp + 10-bit "
        "worker_id + 12-bit sequence. Globally unique, sortable by time, no coordinator."),
    diagram("arch",
        "  Client -> [LB] -> [API Gateway]\n"
        "                       |\n"
        "        +--------------+----------------+\n"
        "        |              |                |\n"
        "        v              v                v\n"
        "  [Tweet Service] [Timeline Service] [Search Service]\n"
        "        |              |                |\n"
        "        | (1) insert   | (1) GET tl:{user_id}   (1) query Elasticsearch\n"
        "        |   tweet      |     from Redis         |\n"
        "        v              v                       v\n"
        "  [Cassandra]   [Redis Cluster]         [ES Cluster]\n"
        "  (tweets RF=3)  (timeline cache,         (inverted index,\n"
        "                  sharded by user_id)      sharded by hash)\n"
        "        |              ^\n"
        "        | (2) fan-out  | (2a) cache miss -> fetch from Cassandra\n"
        "        v              |       by user_id (user-timeline query)\n"
        "  [Fan-out Worker]\n"
        "   - reads tweet.user_id's followers (followers_by_followee table)\n"
        "   - ZADD tl:{follower_id} tweet_id  for each follower\n"
        "   - if user_id has >10K followers, SKIP fan-out (mark tweet for pull)\n"
        "        |\n"
        "        | (3) async publish tweet to Kafka for ingestion\n"
        "        v\n"
        "  [Search Indexer]  -> consumes Kafka -> indexes into Elasticsearch",
        "Twitter: tweet write fans out into follower Redis timelines (with celebrity bypass), timeline reads hit Redis cache, search runs against Elasticsearch fed by Kafka.",
        "A diagram of Twitter's architecture. The client hits a load balancer and API gateway, which routes to one of three services. The Tweet Service inserts the tweet into Cassandra and publishes a fan-out job; the fan-out worker reads the poster's followers from the followers-by-followee table and ZADDs the tweet_id into each follower's Redis sorted-set timeline, unless the poster has more than 10K followers, in which case the tweet is marked for pull-on-read instead. The Timeline Service serves reads by ZRANGing the user's Redis timeline, falling through to Cassandra by user_id on a cache miss. The Search Service runs queries against an Elasticsearch cluster, which is fed by a Kafka topic that the tweet-write path publishes to asynchronously."),
    prose("deep-dive",
        "**Deep dive: the celebrity problem and hybrid fan-out.**\n\n"
        "Twitter is the system that *invented* the celebrity-fan-out problem in production. "
        "The naive fan-out-on-write model says: when a user tweets, push the tweet_id into "
        "every follower's timeline cache. For a normal user (avg 200 followers) this is 200 "
        "writes. For Lady Gaga (80M followers) it's 80M writes per tweet. With ~30 celebrity "
        "tweets/day at that scale, you spend more writes on celebrities than on the entire "
        "rest of the user base.\n\n"
        "**Twitter's solution (and ours).** Detect celebrity accounts at the write path "
        "(>10K followers) and SKIP fan-out for them. Their tweets stay only in their own "
        "user-timeline shard. When a normal user reads their timeline, the system checks: "
        "which of the users-they-follow are celebrities? For each celebrity, fetch their "
        "recent tweets (one Cassandra query each, batched), merge with the cached timeline, "
        "sort, return. Most users follow 1-5 celebrities, so this adds 1-5 extra queries — "
        "still fast (<100 ms).\n\n"
        "**Snowflake IDs.** Tweet IDs must be sortable by time AND globally unique AND "
        "assignable without a coordinator. Twitter's Snowflake scheme packs a 41-bit "
        "millisecond timestamp + 10-bit worker_id + 12-bit sequence into a 64-bit integer. "
        "Each worker generates IDs independently; the timestamp gives sortability; the "
        "worker_id gives uniqueness across workers; the sequence gives uniqueness within a "
        "millisecond on a single worker.\n\n"
        "**Tweet ID encoding.** Snowflake IDs are 64-bit ints, but URLs use base-62 encoded "
        "strings to keep them short (~11 chars).\n\n"
        "**Retweets.** A retweet is a separate tweet row that references the original via "
        "`retweet_of`. Fan-out pushes the retweet_id, not the original. On timeline read, we "
        "hydrate retweets by fetching the original tweet (one batched Cassandra call).\n\n"
        "**Search indexing.** Every tweet publish also goes to a Kafka topic "
        "`tweets.v1`. A consumer indexes each tweet into Elasticsearch for full-text search. "
        "The search path is decoupled from the write path — a search outage doesn't break "
        "tweeting.\n\n"
        "**Tombstones and delete.** Deletes write a tombstone row in Cassandra. Timeline "
        "reads filter deleted tweet_ids at hydration. Old timeline entries are evicted by "
        "the ZSET cap (ZREMRANGEBYRANK)."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Celebrity fan-out collapse.** Without the celebrity bypass, Lady Gaga's tweet "
        "would write 80M Redis entries and saturate the timeline cluster. *Mitigation*: "
        "celebrity detection at >10K followers; pull-on-read for them.\n\n"
        "- **Hot tweet.** A viral tweet gets 1M likes/sec; the like-counter row is a write "
        "hotspot. *Mitigation*: shard the counter (e.g. 16 shards, sum on read) or use "
        "Cassandra counters (which are sharded by the DB itself).\n\n"
        "- **Fan-out worker backlog.** If Kafka or the worker pool falls behind, tweets "
        "take minutes to appear in timelines. *Mitigation*: autoscale workers on queue depth; "
        "alert if a tweet is >30s old before fan-out.\n\n"
        "- **Redis timeline cluster failure.** Without the cache, every timeline read "
        "becomes a fan-out-on-read across the user's followed accounts — Cassandra gets "
        "crushed. *Mitigation*: Redis cluster with replicas + circuit breaker that returns "
        "stale timelines or 503-with-retry.\n\n"
        "- **Cassandra compaction spikes.** Tweets generate huge write volume; compaction "
        "spikes cause p99 latency spikes. *Mitigation*: tiered compaction for tweets, "
        "leveled for the smaller tables; bound compaction throughput.\n\n"
        "- **Search index lag.** The Kafka -> ES pipeline has 5-30s lag; searching for a "
        "tweet you just posted may miss it. *Mitigation*: accept it (most search is for "
        "older content); show 'this tweet was just posted, indexing in progress'.\n\n"
        "- **Snowflake clock skew.** If a worker's clock jumps backward, Snowflake emits "
        "duplicate or out-of-order IDs. *Mitigation*: NTP with bounded slew; reject IDs "
        "with timestamps in the past.\n\n"
        "- **Reply threading.** Replies are stored as tweets with `reply_to`. Fetching a "
        "conversation thread requires fetching all tweets with `reply_to = X`, which is a "
        "secondary index lookup. *Mitigation*: maintain a separate `replies` materialized "
        "view keyed by the root tweet."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Sharding.* Tweet storage is sharded by `tweet_id` (which is itself a Snowflake ID, "
        "so the shard hash is uniform). Follows are sharded both ways (followers-by-follower "
        "and followers-by-followee materialized views).\n\n"
        "*Timeline cache.* Redis cluster sharded by `user_id`. Each user's timeline is a "
        "ZSET of the last 800 tweet_ids. The cap bounds memory (250M users x 800 x 8B = "
        "1.6 TB) and forces pull-on-read for older content.\n\n"
        "*Multi-region.* Timeline cache is per-region; the Cassandra tweet store is "
        "globally replicated. Writes go to a single primary region (the tweet itself is "
        "small; cross-region replication is cheap).\n\n"
        "*Search scale.* Elasticsearch cluster sharded by tweet hash. For very large "
        "clusters (>1B docs), use ES's rollover indices (one index per day, alias points "
        "to latest) so old indices can be searched less aggressively.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose hybrid fan-out — **gained** cheap celebrity tweets, **lost** uniform "
        "read latency (celebrity-following users pay extra query cost).\n"
        "- We chose Cassandra for tweets — **gained** write throughput and time-series "
        "friendliness, **lost** JOINs (hydrating a timeline requires a multi-get, not a JOIN).\n"
        "- We chose Snowflake IDs — **gained** no-coordinator uniqueness + sortability, "
        "**lost** any ordering guarantee across workers in the same millisecond.\n"
        "- We chose Elasticsearch for search — **gained** flexible full-text search, "
        "**lost** a separate operational system to run (ES clusters are notoriously finicky).\n"
        "- We chose async fan-out (return 200 before fan-out completes) — **gained** fast "
        "post latency for the user, **lost** immediate visibility to followers (a tweet may "
        "take 1-2s to appear in a follower's timeline)."),
    quiz("q1",
        "Elon Musk tweets. With pure fan-out-on-write and 150M followers, how many Redis writes happen, and what's the problem?",
        ["150 writes (one per shard) — fine, no problem.",
         "150M writes, which saturates the Redis timeline cluster and degrades every other user's experience. Solution: bypass fan-out for celebrities (>10K followers) and pull their tweets at read time.",
         "0 writes — celebrity tweets are broadcast separately.",
         "150M writes, but Redis handles 1M+ writes/sec so this is fine."],
        1,
        "A single Elon tweet triggers 150M ZADD operations across the Redis cluster. Even sharded across 100 shards, that's 1.5M writes per shard in a burst, which saturates them and slows every other user's timeline reads. Twitter's solution (and ours): detect celebrity accounts at >10K followers and skip fan-out for them. Their tweets stay in their own user-timeline shard; at read time, the timeline service fetches recent tweets from each celebrity the user follows (typically 1-5) and merges them into the cached timeline. This caps per-tweet fan-out at 10K writes.",
        "interview"),
    quiz("q2",
        "Why use Snowflake IDs (timestamp + worker_id + sequence) instead of a global auto-increment counter?",
        ["Snowflake IDs are smaller than a UUID.",
         "Snowflake IDs are globally unique without a coordinator AND sortable by time, so timeline merges don't need a separate sort field and there's no SPOF.",
         "Auto-increment counters are unreliable in distributed systems.",
         "Snowflake IDs compress better in Redis."],
        1,
        "A global auto-increment counter requires a coordinator (a single point of failure) or a distributed consensus protocol on every write (slow). Snowflake IDs encode a 41-bit millisecond timestamp + 10-bit worker_id + 12-bit sequence, so each worker generates IDs independently (no coordinator), the IDs are globally unique (different worker_ids), and they're sortable by time (the timestamp is the high bits). Timeline merges then sort by tweet_id, which is also time-sort, avoiding a separate sort field. The cost: clock skew can cause out-of-order IDs, mitigated by NTP and rejecting past-timestamp IDs.",
        "interview"),
]

w("design-twitter",
  "Design Twitter",
  "Design Twitter (now X) at 250M DAU, 500M tweets/day. Covers the celebrity fan-out problem (Elon's tweet to 150M followers), hybrid fan-out-on-write with celebrity bypass, Snowflake IDs for time-sortable globally-unique tweet IDs, Cassandra for tweet storage, Redis ZSET timeline caches, and Elasticsearch search fed asynchronously by Kafka.",
  "Twitter is the canonical 'celebrity problem' design — the system that originated the hybrid fan-out pattern in production. Almost every social timeline system in use today (Instagram, Facebook, Threads, Bluesky) is a variant of this design. The celebrity bypass (>10K followers switches to pull-on-read) is one of the most-asked interview questions and one of the most-cited engineering blog posts in the industry.",
  ["cache-aside", "sharding", "pub-sub"],
  ["design-instagram", "design-news-feed"],
  35, "interview",
  twitter_blocks,
  ["Snowflake IDs give globally-unique, time-sortable tweet IDs with no coordinator.",
   "Hybrid fan-out (push normal, pull celebrity) bounds per-tweet write amplification.",
   "Redis ZSET timeline cache gives sub-100ms reads for the common case.",
   "Async Kafka -> Elasticsearch pipeline decouples search from the write path."],
  ["Celebrity tweets still stress the pull path — needs celebrity post caching.",
   "Cassandra compaction causes latency spikes — needs careful compaction strategy.",
   "Snowflake clock skew causes duplicate / out-of-order IDs.",
   "Timeline cache death cascades into DB collapse without a circuit breaker."],
  ["Celebrity fan-out collapse without the >10K bypass.",
   "Like-counter hotspot on viral tweets — needs counter sharding.",
   "Fan-out worker backlog delays tweet visibility — needs autoscaling.",
   "Search index lag (5-30s) — recently posted tweets may be unsearchable briefly.",
   "Snowflake clock skew causing out-of-order IDs."],
  ["Pure fan-out-on-write for everyone — crushed by celebrity tweets.",
   "Using a global auto-increment counter for tweet IDs — single point of failure.",
   "Synchronous fan-out (blocking the tweet POST until fan-out completes) — slow posts.",
   "Storing timeline as the full tweet text instead of just tweet_ids — wastes cache.",
   "Single Elasticsearch cluster for everything — no sharding strategy."],
  ["Twitter / X (now X Corp)",
   "Mastodon / fediverse (similar fan-out, federated)",
   "Bluesky (AT Protocol, similar fan-out-on-write)",
   "Threads (Meta, similar architecture to Instagram)"],
  ["Design Twitter. How do you handle a tweet from a celebrity with 100M followers?",
   "How do you generate unique, sortable tweet IDs without a coordinator?",
   "Your timeline Redis cluster dies. What's the impact?",
   "How do you make search not block the tweet write path?"],
  [{"system": "Twitter / X", "how": "Hybrid fan-out with celebrity bypass at ~10K followers. Snowflake IDs. Cassandra for tweet store, Redis (Gemini) for timelines. Documented in their engineering blog 'Timeline scalability at Twitter'."},
   {"system": "Bluesky (AT Protocol)", "how": "Federated fan-out-on-write via PDS -> BGS -> AppView. Each user has a personal data server that fans out their writes to a relay that subscribers poll."},
   {"system": "Mastodon", "how": "ActivityPub-based federated fan-out: each instance pushes new posts to followers' instances via HTTP."}])

print("Done with Twitter")


# =========================================================================
# 6. NEWS FEED
# =========================================================================
news_feed_blocks = [
    prose("problem",
        "**What are we designing?** A ranked news feed — Facebook-style, where the feed is "
        "not just chronological but algorithmically ranked by relevance, recency, and "
        "engagement signals. Posts can be text, photos, links, or videos. The feed must "
        "feel fresh (new posts appear within seconds), personalized (different users see "
        "different content), and engaging (ranking optimizes for time-on-site and "
        "interactions).\n\n"
        "This is the 'design Instagram + ranking' problem. The hard part is no longer the "
        "fan-out (we know how to do that); the hard part is **pre-computing a ranked feed** "
        "such that reads are still O(1) even though ranking is expensive (ML model, hundreds "
        "of features)."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Users post stories (text, photo, link, video).\n"
        "- Users follow / friend other users.\n"
        "- The home feed shows a ranked subset of recent stories from friends/pages.\n"
        "- Users can like, comment, share, hide.\n"
        "- Feed updates in near-real-time when friends post.\n"
        "- Feed ranking adapts based on user engagement (hide future similar posts after "
        "a hide).\n\n"
        "**Non-functional requirements.**\n"
        "- **Feed read latency**: p99 < 200 ms (despite ranking).\n"
        "- **Freshness**: a friend's new post appears in the feed within 30 s.\n"
        "- **Personalization**: each user's feed is unique.\n"
        "- **Availability**: 99.99%.\n"
        "- **Scale**: 2B users, 1B+ stories posted/day, 10B+ feed reads/day.\n\n"
        "**Non-goals.** No ad targeting, no marketplace, no stories (24-hour)."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Posts.* 1B stories/day. Average story ~2KB metadata + media (50% have photos at "
        "~500KB, 5% have video at ~50MB). Metadata = 2TB/day; media = ~3PB/day. Stored on "
        "object storage.\n\n"
        "*Feed reads.* 2B users x ~10 feed refreshes/day = 20B feed reads/day = ~230K "
        "reads/sec average, peak ~1M/sec.\n\n"
        "*Fan-out.* Average user has ~300 friends and ~50 page follows. 1B stories/day x "
        "~350 followers = 350B fan-out writes/day = 4M writes/sec. This is why we need the "
        "celebrity bypass AND a smart pre-computation strategy.\n\n"
        "*Ranked feed storage.* If we pre-compute a ranked feed of 100 story_ids per user, "
        "2B users x 100 x 8 bytes = 1.6 TB. Fits in a sharded Redis cluster.\n\n"
        "*Ranking compute.* If we re-rank a feed of 500 candidate stories on every refresh, "
        "each rank call costs ~10 ms on an ML model. To hit 200 ms read latency, we MUST "
        "pre-compute ranks, not rank on read.\n\n"
        "*Bandwidth.* 1M reads/sec x 50KB per feed response = 50 GB/s = 400 Gbps. Requires "
        "multi-region CDN."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/stories              (text, media_ids, privacy)\n"
        "GET  /v1/feed?cursor=...      -> ranked, paginated\n"
        "POST /v1/stories/:id/like\n"
        "POST /v1/stories/:id/comment\n"
        "POST /v1/stories/:id/hide     -> trains ranking model (downweight similar)\n"
        "```\n\n"
        "The feed endpoint returns ranked stories. The cursor encodes the user's position "
        "in the feed so paginated calls return older stories in rank order (not time order)."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Stories* (sharded by story_id):\n"
        "```\n"
        "stories (story_id BIGINT PK, author_id, type, text, media_url,\n"
        "         created_at, like_count, comment_count, share_count)\n"
        "```\n\n"
        "*Feed candidates* (per-user, Redis ZSET of recent story_ids):\n"
        "```\n"
        "key: feed_candidates:{user_id}\n"
        "value: ZSET member=story_id, score=created_at   -- raw chronological\n"
        "       capped at 1000 (last ~24h)\n"
        "```\n\n"
        "*Ranked feed* (per-user, pre-computed, Redis LIST):\n"
        "```\n"
        "key: feed_ranked:{user_id}\n"
        "value: LIST of ranked story_ids, top 100 pre-computed by the ranker\n"
        "TTL: 5 minutes   -- re-ranked on a schedule\n"
        "```\n\n"
        "*User features* (for ranking, stored in feature store):\n"
        "```\n"
        "user_features (user_id, last_seen_ts, avg_session_length,\n"
        "               affinity_to_author MAP<author_id, float>,\n"
        "               affinity_to_topic MAP<topic, float>, ...)\n"
        "```\n\n"
        "*Story features* (computed on post):\n"
        "```\n"
        "story_features (story_id, embedding VECTOR, topics LIST<TEXT>,\n"
        "                author_verified BOOL, has_media BOOL, ...)\n"
        "```"),
    diagram("arch",
        "  -- WRITE PATH --\n"
        "  Author posts story -> Story Service -> Stories DB (insert)\n"
        "                                  |\n"
        "                                  v\n"
        "                          [Kafka: stories.v1]\n"
        "                                  |\n"
        "            +---------------------+---------------------+\n"
        "            |                     |                     |\n"
        "            v                     v                     v\n"
        "      [Fan-out Worker]    [Feature Extractor]   [Search Indexer]\n"
        "      ZADD candidate       computes story        indexes into\n"
        "      feed for each         features, stores       Elasticsearch\n"
        "      follower              in feature store\n"
        "                                  |\n"
        "  -- READ PATH --                  v\n"
        "  User opens feed:           [Ranking Trigger]\n"
        "    -> Feed Service           (every 5 min OR on\n"
        "       (1) GET feed_ranked:{user_id}  candidate-list change,\n"
        "           from Redis (pre-computed)   re-ranks top 100\n"
        "       (2) on miss / stale -> Ranker Service          |  stories for\n"
        "           - read candidates from Redis ZSET          |  the user,\n"
        "           - fetch user + story features              |  writes to\n"
        "           - run ML model, score each story           |  feed_ranked:{user_id}\n"
        "           - return top 100, cache for 5 min          v\n"
        "                                                    feed_ranked:{user_id}\n"
        "  -- Engagement feedback --\n"
        "  likes / hides -> Kafka -> trainer updates user features -> next rank call adapts",
        "News feed: write path fans out candidate story_ids and extracts features async; read path serves pre-ranked feeds from Redis, with a ranker service re-ranking every 5 min.",
        "A diagram of a ranked news feed. The write path: an author posts a story, the Story Service inserts into the Stories DB and publishes to Kafka. Three consumers read from Kafka: a fan-out worker that ZADDs the story_id into each follower's candidate feed in Redis, a feature extractor that computes story features for the ranker, and a search indexer that indexes into Elasticsearch. The read path: a user opens the feed, the Feed Service reads the pre-computed ranked feed from Redis. On a miss or staleness, it calls the Ranker Service which reads candidate story_ids, fetches user and story features, runs an ML model to score each story, and writes the top 100 back to Redis as the ranked feed. A separate engagement feedback loop feeds likes and hides via Kafka into a trainer that updates user features for the next rank call."),
    prose("deep-dive",
        "**Deep dive: pre-computing the ranked feed.**\n\n"
        "Ranking is expensive: a modern feed ranker (Facebook's EdgeRank successors, "
        "Instagram's) is a gradient-boosted tree or small neural net over ~100 features per "
        "(user, story) pair. Scoring 500 candidate stories takes 50-200 ms — too slow for a "
        "read that must be < 200 ms total. So we **pre-compute**.\n\n"
        "**Pre-computation strategy.** A background ranking job runs per user every 5 minutes "
        "(or on candidate-list change). It reads the user's `feed_candidates` ZSET (last "
        "1000 stories), fetches features for each from the feature store, scores them with "
        "the ranker model, and writes the top 100 ranked story_ids to `feed_ranked:{user_id}` "
        "with TTL 5 min.\n\n"
        "**Triggering the ranker.** Three triggers:\n"
        "1. **Scheduled**: every 5 min for active users (last-seen < 1 hour ago). For "
        "inactive users, we don't rank — they get a fresh rank on next open.\n"
        "2. **On candidate change**: when a new story is fanned out to a user, the fan-out "
        "worker publishes a `rank_request` event for that user; the ranker re-ranks.\n"
        "3. **On read miss**: if the user opens the feed and `feed_ranked` is missing or "
        "expired, the Feed Service calls the Ranker synchronously (the slow path, ~100 ms).\n\n"
        "**Features.** Examples: affinity_to_author (decayed sum of past interactions), "
        "story age (decayed by hours), story type (photo/video/link), story's global "
        "engagement (a proxy for quality), user's past session length, time of day, device "
        "type. These live in a feature store (Tectonic at Facebook, Feast open-source).\n\n"
        "**The hide feedback loop.** When a user hides a story, we publish `hide_event` to "
        "Kafka. A trainer updates `user_features.affinity_to_author` and "
        "`affinity_to_topic` to downweight that author/topic. The next rank call (within 5 "
        "min) reflects the change.\n\n"
        "**Celebrity bypass.** Same as Instagram/Twitter: pages with >10K followers skip "
        "fan-out. Their stories are fetched at rank time and added to the candidate pool.\n\n"
        "**Mixed ranking.** Real feeds interleave ranked organic stories with sponsored "
        "content (ads) and 'you might like' recommendations. Each slot has a different "
        "ranking policy; the feed builder composes them into the final ordered list."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Ranker overload.** 2B users / 5 min = 6.7M rank calls/sec. Each call scores "
        "500 stories. *Mitigation*: batch rank calls per user (rank 100 stories in one "
        "model call); shard the ranker across GPU/CPU pools; skip ranking for inactive "
        "users.\n\n"
        "- **Feature store latency.** The ranker fetches ~100 features per story; for 500 "
        "stories that's 50K feature lookups. *Mitigation*: pre-fetch features into a local "
        "cache on the ranker; use a feature store with sub-ms p99 (Redis-backed).\n\n"
        "- **Fan-out write amplification.** 4M fan-out writes/sec at peak. *Mitigation*: "
        "celebrity bypass; batch fan-out writes per user (one Redis pipeline per follower).\n\n"
        "- **Stale feed.** Pre-computed feeds are up to 5 min old; a friend's new post may "
        "not appear immediately. *Mitigation*: when a new story is fanned out, prepend it to "
        "the user's ranked feed immediately with a 'fresh' flag (the ranker will re-rank it "
        "in the next pass).\n\n"
        "- **Cold-start users.** New users have no engagement history → features are empty → "
        "ranking is random. *Mitigation*: serve a 'popular today' feed for the first week "
        "until features accumulate.\n\n"
        "- **Model drift.** A bad ranking model change can drop engagement 10% in hours. "
        "*Mitigation*: A/B test model changes on 1% of users; auto-rollback if engagement "
        "drops.\n\n"
        "- **Hide-storm.** A controversial post triggers millions of hides simultaneously; "
        "the trainer updates features for millions of users. *Mitigation*: batch updates; "
        "throttle the trainer."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Pre-compute vs rank-on-read.* We pre-compute for active users (top 100 stories, "
        "5-min TTL). For inactive users (opening the app once a week), we rank on read — "
        "the one-time 100 ms latency is acceptable.\n\n"
        "*Multi-region.* Feed cache (Redis) and ranker are per-region. The Stories DB is "
        "globally replicated. Ranking compute is heavy; we run rankers in each region to "
        "keep user-feature access local.\n\n"
        "*Feature store.* Redis-backed feature store with sub-ms p99. Features are updated "
        "by the trainer in batches; reads are eventual (a few seconds behind).\n\n"
        "*Ranking model.* GBDT (e.g. XGBoost / LightGBM) for fast scoring; small neural net "
        "for embeddings (text + image). Models are versioned and rolled out via A/B test.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose pre-computation — **gained** fast reads, **lost** real-time freshness "
        "(mitigated by immediate-prepend of fresh stories).\n"
        "- We chose per-user ranking — **gained** personalization, **lost** computation "
        "cost (must run rankers at 6.7M calls/sec).\n"
        "- We chose 5-min TTL — **gained** low ranker load, **lost** adaptivity (hide "
        "feedback takes up to 5 min to take effect).\n"
        "- We chose fan-out-on-write for the candidate set — **gained** O(1) candidate "
        "fetches at rank time, **lost** write amplification (mitigated by celebrity bypass)."),
    quiz("q1",
        "Why does the news feed pre-compute ranked feeds instead of ranking on read?",
        ["Ranking 500 candidate stories takes 50-200 ms via an ML model, which would blow the 200 ms p99 read latency budget; pre-computing the top 100 every 5 min keeps reads O(1).",
         "The ranker model is too expensive to run at all.",
         "Users prefer ranked feeds to be cached.",
         "Pre-computation is simpler to implement."],
        0,
        "A modern feed ranker (XGBoost or neural net over ~100 features) scores one (user, story) pair in ~0.2-0.4 ms. For 500 candidate stories, that's 100-200 ms — already the entire latency budget for a read, before network and hydration. Pre-computing the top 100 stories per user every 5 min (or on candidate change) means reads are just a Redis GET — sub-millisecond. The trade-off is freshness: a brand-new post may take up to 5 min to appear (mitigated by immediate-prepend of fresh stories into the ranked feed).",
        "interview"),
    quiz("q2",
        "A user hides a story from author X. When will their feed stop showing stories from author X?",
        ["Immediately — the hide event is processed synchronously.",
         "Within ~5 minutes — the next scheduled rank call picks up the updated affinity_to_author feature.",
         "Only after the user hides 3 stories from X.",
         "Never — hides don't affect ranking."],
        1,
        "The hide event flows async through Kafka to a trainer, which updates `user_features.affinity_to_author[X]` in the feature store. The next rank call (within 5 minutes, or sooner if triggered by candidate change) reads the updated feature, scores stories from X lower, and rewrites `feed_ranked:{user_id}`. Until the next rank call, the existing ranked feed (which may include stories from X) is served. This is the freshness-vs-cost trade-off of pre-computation. Synchronous hide processing (option A) would be fast but would require invalidating the pre-computed feed and re-ranking on the read path, which is the very cost we're trying to avoid.",
        "solid"),
]

w("design-news-feed",
  "Design News Feed",
  "Design a ranked (Facebook-style) news feed at 2B users. Covers pre-computing ranked feeds every 5 min so reads stay O(1) despite expensive ML ranking, the candidate-vs-ranked feed split in Redis, the feature store for ranking signals, the hide-feedback loop that adapts ranking per user, and the celebrity-bypass hybrid fan-out for the candidate set.",
  "A ranked news feed is the next step beyond a chronological feed (Instagram/Twitter). It introduces ML ranking, feature stores, pre-computation vs rank-on-read trade-offs, and the engagement feedback loop that makes the feed adapt to each user. These patterns (feature stores, pre-computed recommendations, async feedback loops) appear in every modern recommendation system — TikTok's For You page, YouTube's recommendations, Spotify's Discover Weekly.",
  ["cache-aside", "sharding", "pub-sub"],
  ["design-instagram", "design-twitter"],
  30, "interview",
  news_feed_blocks,
  ["Pre-computed ranked feeds keep read latency O(1) despite expensive ML ranking.",
   "Hide feedback loop adapts ranking per user within ~5 min.",
   "Feature store decouples ranking from the data sources (stories, engagement logs).",
   "Celebrity bypass in fan-out keeps write amplification bounded."],
  ["Pre-computation means feeds are up to 5 min stale — fresh posts need immediate-prepend.",
   "Ranker compute is heavy — 6.7M rank calls/sec needed for 2B users.",
   "Cold-start users have no features — needs a fallback 'popular today' feed.",
   "Model drift can drop engagement fast — needs A/B testing and auto-rollback."],
  ["Ranker overload at 2B users — needs batching and per-user skip for inactive.",
   "Feature store latency — needs sub-ms p99 (Redis-backed).",
   "Fan-out write amplification — needs celebrity bypass.",
   "Stale feed after a new post — needs immediate-prepend of fresh stories.",
   "Hide-storm on controversial posts — needs batched, throttled feature updates."],
  ["Ranking on read for every feed request — blows the latency budget.",
   "Storing the full ranked feed (with story content) instead of just story_ids — wastes cache.",
   "Running the ranker synchronously on candidate change — too slow.",
   "Single-region feature store — multi-region ranking reads stall on cross-region calls.",
   "Skipping the celebrity bypass — fan-out crushes the cache cluster."],
  ["Facebook News Feed",
   "TikTok For You page",
   "YouTube home recommendations",
   "Reddit 'Best' sort",
   "LinkedIn feed"],
  ["Design a ranked news feed. How do you keep reads fast when ranking is expensive?",
   "A user hides a story. When does their feed change?",
   "How do you handle a new user with no engagement history?",
   "How do you A/B test a new ranking model safely?"],
  [{"system": "Facebook News Feed", "how": "EdgeRank and successors; pre-computed ranked feeds with 5-min TTL; feature store (Tectonic); celebrity bypass. Documented in Meta engineering blog."},
   {"system": "TikTok For You page", "how": "Real-time ranking over candidate videos, with a separate exploration pool. Uses a deep neural net over hundreds of features including watch time and re-watch rate."},
   {"system": "YouTube recommendations", "how": "Two-stage: candidate generation (collaborative filtering) then ranking (deep NN). Pre-computed per-user recommendations cached in Redis."}])

print("Done with News Feed")


# =========================================================================
# 7. WHATSAPP
# =========================================================================
whatsapp_blocks = [
    prose("problem",
        "**What are we designing?** WhatsApp — a mobile-first real-time chat application. "
        "Users send text/voice messages and media to individuals or groups. Messages must be "
        "delivered instantly when the recipient is online, queued and pushed when offline. "
        "The system must show delivery status (single tick = sent, double tick = delivered, "
        "blue tick = read), support group chats of up to 1024 members, and do all this at "
        "WhatsApp's legendary efficiency (a small engineering team serving 2B+ users).\n\n"
        "The defining challenges: **always-on connections** (each user has a long-lived "
        "WebSocket to a chat server), **message ordering** (messages in a conversation must "
        "appear in the order they were sent, even across failures), and **group fan-out** "
        "(one message to a 1024-person group = 1024 deliveries)."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Send a text/voice/media message to a 1:1 or group chat.\n"
        "- Receive messages in real-time when online.\n"
        "- Receive push notifications when offline.\n"
        "- Delivery and read receipts (single / double / blue ticks).\n"
        "- Last-seen / online presence.\n"
        "- Message history (last 30 days on server, full history on device).\n"
        "- Groups up to 1024 members.\n\n"
        "**Non-functional requirements.**\n"
        "- **Send-to-deliver latency**: p99 < 1 s for online recipients.\n"
        "- **Connection count**: 50M+ concurrent WebSocket connections per region.\n"
        "- **Availability**: 99.9% (chat is high-stakes; outages are noticed).\n"
        "- **Durability**: no message loss, even if the recipient's chat server crashes "
        "mid-delivery.\n"
        "- **End-to-end encryption**: messages are encrypted on-device; the server never "
        "sees plaintext.\n"
        "- **Scale**: 2B users, 100B messages/day.\n\n"
        "**Non-goals.** No voice/video calls (separate media-relay system), no channels/broadcasts."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Messages.* 100B messages/day. Each ~200 bytes encrypted. 100B x 200 B = 20 GB/day "
        "of message text — tiny. The real cost is connections and metadata, not storage.\n\n"
        "*Concurrent connections.* 2B users, ~30% online at peak = 600M concurrent "
        "WebSockets. A single chat-server host handles ~1M connections (Go + epoll), so we "
        "need ~600 chat servers globally. Realistic WhatsApp numbers are ~600 servers.\n\n"
        "*Connection bandwidth.* Each WebSocket idles at ~50 bytes/sec of keepalive traffic. "
        "600M x 50 B/s = 30 GB/s = 240 Mbps of pure keepalive. Message traffic adds ~5x peak.\n\n"
        "*Group fan-out.* Average group has 10 members. 10% of messages go to groups of "
        "100+; 1% go to groups of 1000+. The long tail of large groups dominates fan-out load. "
        "A single message to a 1024-person group = 1024 fan-out writes.\n\n"
        "*Push notifications.* ~70% of messages go to offline recipients and trigger push "
        "via APNs/FCM. That's 70B push notifications/day = 800K push/sec peak. APNs/FCM rate "
        "limit is ~10K/sec per app, so we batch and shard across multiple FCM sender IDs.\n\n"
        "*Storage.* Each message row is ~500 bytes (encrypted payload + metadata). 100B "
        "messages x 30 days retention = 3T messages x 500 B = 1.5 PB hot. Sharded Cassandra."),
    prose("apis",
        "**APIs.** WhatsApp uses a custom binary protocol over WebSocket (NOT REST) to "
        "minimize byte overhead on mobile networks. Conceptually:\n\n"
        "```\n"
        "WS /v1/connect    (long-lived; auth token in handshake)\n"
        "  -> frame: SEND  { conversation_id, encrypted_payload, client_msg_id }\n"
        "  <- frame: ACK   { server_msg_id, ts }\n"
        "  <- frame: RECV  { conversation_id, sender_id, encrypted_payload, server_msg_id }\n"
        "  -> frame: DELIVERED  { server_msg_id }\n"
        "  -> frame: READ       { server_msg_id }\n\n"
        "REST /v1/media/upload_url      (presigned URL for media)\n"
        "REST /v1/media/{media_id}      (fetch media)\n"
        "```\n\n"
        "Every frame is binary, length-prefixed, with a small header (sender_id, "
        "conversation_id, msg_id, ts). The client_msg_id is the client's UUID for "
        "idempotency — if the client retries after a network blip, the server deduplicates."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Messages* (Cassandra, partitioned by conversation_id, sorted by server_msg_id):\n"
        "```\n"
        "messages (\n"
        "  conversation_id  TIMEUUID,\n"
        "  server_msg_id    TIMEUUID,     -- Snowflake, sortable\n"
        "  sender_id        BIGINT,\n"
        "  encrypted_payload BLOB,        -- E2E encrypted; server never decrypts\n"
        "  delivered_to     SET<BIGINT>,  -- which recipients have it\n"
        "  read_by          SET<BIGINT>,\n"
        "  ts               TIMESTAMP,\n"
        "  PRIMARY KEY ((conversation_id), server_msg_id)\n"
        ")\n"
        "```\n\n"
        "*Conversations / groups* (sharded SQL):\n"
        "```\n"
        "conversations (id BIGINT PK, type ENUM('1to1','group'), created_at)\n"
        "group_members (conversation_id, user_id, role, joined_at,\n"
        "               PRIMARY KEY (conversation_id, user_id))\n"
        "```\n\n"
        "*Connection registry* (Redis, mapping user_id -> chat-server-id):\n"
        "```\n"
        "key: presence:{user_id}\n"
        "value: { chat_server_id, last_seen_ts }\n"
        "TTL:   60s    -- refreshed by WebSocket keepalive\n"
        "```\n\n"
        "*Offline message queue* (per-user Kafka or Redis LIST):\n"
        "```\n"
        "key: pending:{user_id}\n"
        "value: LIST of server_msg_ids awaiting delivery\n"
        "```\n"
        "On reconnect, the chat server drains this queue and pushes all messages."),
    diagram("arch",
        "  [Mobile Client] <---WebSocket---> [Chat Server] <--> [Message Store]\n"
        "      (E2E encrypts)                  (stateless per-conn;        (Cassandra,\n"
        "                                       1M conns/host)               sharded by\n"
        "                                                                    conversation_id)\n"
        "                                          |\n"
        "                                          |\n"
        "                                  [Presence Redis]\n"
        "                                  user_id -> chat_server_id\n"
        "                                  TTL 60s (keepalive refresh)\n"
        "                                          |\n"
        "                                          v\n"
        "  -- Send path --\n"
        "  A sends to B in conversation C:\n"
        "    1. A's chat server writes message to Message Store (server_msg_id assigned)\n"
        "    2. A's chat server ACKs to A (single tick on A's screen)\n"
        "    3. A's chat server looks up B's chat_server_id in Presence Redis\n"
        "       - if B online: forward to B's chat server, which pushes via WebSocket\n"
        "       - if B offline: enqueue server_msg_id in pending:{B} queue\n"
        "    4. B's chat server receives the message, pushes to B's WebSocket\n"
        "    5. B's client sends DELIVERED frame -> A's chat server -> A (double tick)\n"
        "    6. B's client sends READ frame -> A's chat server -> A (blue tick)\n\n"
        "  -- Group fan-out --\n"
        "  A sends to group of 1024:\n"
        "    1. write to Message Store once\n"
        "    2. fan-out worker looks up group_members, then Presence for each member\n"
        "    3. batch forward to chat servers (one per distinct chat server)\n"
        "    4. each chat server pushes to its local WebSockets\n\n"
        "  -- Offline path --\n"
        "  If B is offline at step 3: enqueue, then push notification via APNs/FCM.",
        "WhatsApp: clients hold WebSocket to chat servers; presence in Redis routes messages to the right chat server; offline messages queued and push-notified.",
        "A diagram of WhatsApp's architecture. Mobile clients hold long-lived WebSockets to chat servers, which are stateless per-connection and handle 1 million connections each. Chat servers read and write messages to a Cassandra message store sharded by conversation_id. A presence Redis cluster maps each user_id to the chat server hosting their current WebSocket, with a 60-second TTL refreshed by keepalives. The send path: A sends a message to B in conversation C; A's chat server writes the message to the message store, assigns a server_msg_id, ACKs to A; looks up B's chat server in presence Redis; if B is online it forwards to B's chat server which pushes via WebSocket; if B is offline it enqueues the server_msg_id in a pending queue. B's chat server pushes the message; B's client returns a DELIVERED frame which propagates back to A as a double tick; then a READ frame propagates as a blue tick. Group fan-out uses a worker that looks up group members and batches forwards to distinct chat servers. Offline recipients get push notifications via APNs or FCM."),
    prose("deep-dive",
        "**Deep dive: message delivery, ordering, and the connection fabric.**\n\n"
        "**Connection fabric.** Each chat server runs an event loop (Go or Erlang/Elixir — "
        "WhatsApp famously uses Erlang) holding 1M WebSocket connections. Each connection "
        "is a lightweight process/goroutine. When a frame arrives, the server parses it and "
        "either: (a) ACKs to sender, (b) looks up recipient in Presence Redis, (c) "
        "forwards to the recipient's chat server via an internal RPC.\n\n"
        "**Message ordering.** Messages in a conversation are ordered by `server_msg_id`, "
        "which is a Snowflake TIMEUUID. Cassandra stores them in this order, so a recipient "
        "fetching recent messages gets them in send order. For groups, all members see the "
        "same order because they all read from the same partition.\n\n"
        "**Idempotency.** Each send includes a client_msg_id (UUID generated on the device). "
        "If the client retries after a network blip (didn't receive the server ACK), the "
        "chat server checks a short-TTL cache of recent client_msg_ids; if seen, it returns "
        "the same server_msg_id. This prevents duplicate messages on retries.\n\n"
        "**Delivery guarantees.** The server's contract: once the server ACKs (single tick), "
        "the message is durable in the message store and will be delivered to the recipient "
        "eventually. If the recipient is online, immediately. If offline, on next reconnect "
        "(plus a push notification in the meantime).\n\n"
        "**Read receipts.** When B opens the message, B's client sends a READ frame with "
        "the server_msg_id. B's chat server updates `read_by` in the messages table and "
        "forwards the read receipt to A's chat server, which pushes to A (turning the double "
        "tick blue). Read receipts can be disabled per-user privacy settings.\n\n"
        "**Group fan-out optimization.** A naive group send to 1024 members looks up "
        "presence for each (1024 Redis lookups) and forwards to each chat server. We "
        "optimize: (1) batch the presence lookup (one Redis MGET for all 1024 user_ids), "
        "(2) group members by their chat_server_id, (3) send one batched RPC per distinct "
        "chat server containing all messages for its local members. This collapses 1024 "
        "forwards into ~10 (number of distinct chat servers).\n\n"
        "**End-to-end encryption.** Each 1:1 conversation has a shared key derived via "
        "X3DH (Extended Triple Diffie-Hellman) on first contact. The server NEVER sees "
        "plaintext; it forwards opaque encrypted blobs. Group chats use a Sender Key "
        "framework so each sender has one key per group, not pairwise keys. Receipts and "
        "presence are NOT encrypted (the server needs them to route)."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Chat server failure mid-delivery.** If the chat server hosting A's connection "
        "crashes after writing the message but before forwarding to B, B never receives it. "
        "*Mitigation*: a background 'sweeper' job compares the message store against "
        "delivered_to and re-delivers anything missing.\n\n"
        "- **Connection rebalancing.** When a chat server dies, its 1M connections all "
        "reconnect to other servers within seconds. *Mitigation*: clients use exponential "
        "backoff with jitter to avoid a thundering herd; DNS / load balancer redistributes.\n\n"
        "- **Hot conversation.** A 1024-person group with active chatters fans out "
        "constantly. *Mitigation*: rate-limit group sends (e.g. 1 msg/sec per sender); "
        "batch fan-out per chat server.\n\n"
        "- **Push notification rate limits.** APNs and FCM rate-limit per-app. *Mitigation*: "
        "batch notifications per user (one push per 5 seconds of unread messages); use "
        "multiple FCM sender IDs for sharding.\n\n"
        "- **Presence Redis failure.** Without presence, sends can't route to online users. "
        "*Mitigation*: Redis cluster with replicas; fail-open by treating the user as "
        "offline (queue + push).\n\n"
        "- **Cassandra hot partition.** A 1024-person group's conversation_id partition "
        "receives all writes for that group; an active group can saturate one Cassandra "
        "node. *Mitigation*: split group messages across sub-partitions (e.g. "
        "conversation_id + day).\n\n"
        "- **Backpressure on offline users.** A user who has been offline for a month has "
        "thousands of pending messages; on reconnect, draining them can saturate their "
        "device. *Mitigation*: cap the pending queue to last 1000 messages; pull older ones "
        "via pagination.\n\n"
        "- **Read-receipt storms.** A user opens a 1024-person group chat after a week "
        "offline, generating 1024 read receipts. *Mitigation*: batch read receipts (one "
        "READ frame with the highest server_msg_id read)."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Connection scaling.* Add chat servers horizontally. Each holds 1M WebSockets. "
        "600M concurrent = 600 chat servers. Stateful per-connection; rebalancing handled "
        "by clients reconnecting with backoff.\n\n"
        "*Multi-region.* Deploy chat servers in 10+ regions. Each user connects to the "
        "nearest region. Cross-region routing for messages between users in different "
        "regions goes through a backbone RPC.\n\n"
        "*Group scaling.* For very large groups (1000+), use a tree-based fan-out: the "
        "sender's chat server forwards to N 'hub' chat servers, each of which fans out to "
        "their local members. This keeps fan-out latency logarithmic.\n\n"
        "*Message store scaling.* Cassandra sharded by conversation_id. Each conversation's "
        "messages live on one partition (so reads are cheap). For very active groups, "
        "sub-partition by day.\n\n"
        "*Push notification scaling.* Maintain multiple FCM sender IDs (each rate-limited "
        "separately); hash user_id -> sender_id to distribute load.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose per-connection stateful chat servers — **gained** low-latency "
        "delivery (no Redis lookup on the hot path), **lost** easy rebalancing (mitigated "
        "by client backoff).\n"
        "- We chose 30-day server retention — **gained** smaller storage, **lost** "
        "long-term server-side history (device is the source of truth).\n"
        "- We chose E2E encryption — **gained** user privacy, **lost** server-side search "
        "and moderation (must be done on-device).\n"
        "- We chose Snowflake TIMEUUID for ordering — **gained** no-coordinator uniqueness, "
        "**lost** total ordering across nodes in the same millisecond (rarely matters).\n"
        "- We chose push notifications for offline delivery — **gained** reach users "
        "anywhere, **lost** dependency on APNs/FCM availability (out of our control)."),
    quiz("q1",
        "User A sends a message to a 1024-person group. How does the system avoid 1024 separate lookups and forwards?",
        ["Batch the presence lookup (one Redis MGET for all members), then batch forward one RPC per distinct chat server that hosts at least one member — collapsing 1024 forwards to ~10.",
         "Broadcast to every chat server, which filters.",
         "Send 1024 individual Redis lookups in parallel — fast enough.",
         "Use a separate group-message broadcast service that fans out per-member."],
        0,
        "The naive approach (1024 presence lookups + 1024 forwards) is expensive. WhatsApp's actual optimization: one Redis MGET for all 1024 user_ids (returns their chat_server_ids), then group members by chat_server_id (typically ~10 distinct servers), and send one batched RPC per distinct server containing all messages for its local members. Each chat server then iterates its local WebSocket list to deliver. This collapses 1024 operations to ~10, keeping group fan-out fast even for 1024-member groups.",
        "interview"),
    quiz("q2",
        "Your client sends a message but the network drops before receiving the server's ACK. The client retries with the same message. What prevents a duplicate?",
        ["The server detects duplicate content via SHA-256 hash.",
         "The client includes a client_msg_id (UUID); the server caches it briefly and returns the same server_msg_id if seen.",
         "The recipient's client deduplicates by message content.",
         "Nothing — duplicates are accepted as a trade-off for reliability."],
        1,
        "Each send includes a client-generated client_msg_id (UUID). The chat server checks a short-TTL cache (e.g. 5 min) of recent client_msg_ids; if it has seen this one, it returns the same server_msg_id without writing a new message. This makes sends idempotent: the client can retry freely without risk of duplication. Content-hash dedup (option A) is fragile (two users could legitimately send 'hi' to the same conversation); recipient-side dedup (option C) races with the read path.",
        "solid"),
]

w("design-whatsapp",
  "Design WhatsApp",
  "Design WhatsApp at 2B users, 100B messages/day. Covers long-lived WebSocket connection fabric (1M conns per chat server in Erlang/Go), presence-in-Redis routing, message ordering via Snowflake TIMEUUIDs, idempotent sends via client_msg_id, single/double/blue tick delivery receipts, group fan-out optimization (batch presence + batched RPCs per chat server), 30-day server retention, and E2E encryption (server never sees plaintext).",
  "WhatsApp is the canonical real-time messaging design because it combines three problems that are each individually hard: massive concurrent connection count (50M+ WebSockets per region), strict message ordering under failures, and group fan-out at the extreme tail (1024-member groups). The Erlang/Go chat-server pattern, the presence-Redis routing trick, and the idempotent client_msg_id pattern are reusable for any real-time bidirectional system (Slack, Discord, Telegram, Signal).",
  ["websockets", "replication", "sharding"],
  ["design-chat-system"],
  35, "interview",
  whatsapp_blocks,
  ["Sub-second delivery for online recipients via per-connection stateful chat servers.",
   "Idempotent sends via client_msg_id — clients can retry freely.",
   "Group fan-out optimized from O(N) to O(distinct chat servers) via batching.",
   "E2E encryption means the server never sees plaintext — privacy by design."],
  ["30-day server retention limits server-side history and search.",
   "Push notifications depend on APNs/FCM — out of our control.",
   "Per-connection stateful servers complicate rebalancing on failure.",
   "E2E encryption blocks server-side content moderation and search."],
  ["Chat server failure mid-delivery — needs a sweeper to reconcile delivered_to.",
   "Connection thundering-herd on chat-server death — needs client backoff with jitter.",
   "Hot conversation for 1024-member groups — needs conversation sub-partitioning by day.",
   "Push notification rate limits on APNs/FCM — needs multiple sender IDs + batching.",
   "Backpressure on long-offline users reconnecting — needs pending queue capping."],
  ["Storing messages as plaintext on the server — breaks E2E encryption.",
   "Per-member group fan-out without batching — 1024x the work for large groups.",
   "Synchronous group fan-out blocking the sender's ACK — slow sends.",
   "Single global Redis for presence — single point of failure + hotspot.",
   "Storing full message history on the server — explodes storage cost."],
  ["WhatsApp (Meta)",
   "Telegram",
   "Signal",
   "Facebook Messenger",
   "iMessage"],
  ["Design WhatsApp. How do you handle 50M concurrent WebSocket connections?",
   "How do you prevent duplicate messages when the client retries after a network blip?",
   "A user sends to a 1024-person group. How do you avoid 1024 separate lookups?",
   "How does end-to-end encryption affect what the server can do?"],
  [{"system": "WhatsApp", "how": "Erlang/BEAM chat servers, 1M+ conns/host, custom binary protocol over WebSocket, E2E encryption via Signal Protocol. Acquired by Facebook in 2014; runs ~600 servers for 2B users."},
   {"system": "Signal", "how": "Open-source E2E-encrypted messenger. Pioneered the X3DH key agreement and Sender Key group framework that WhatsApp adopted."},
   {"system": "Telegram", "how": "Custom MTProto protocol over TCP/WebSocket. Not E2E by default (only 'secret chats'), but extremely efficient at scale."}])

print("Done with WhatsApp")


# =========================================================================
# 8. CHAT SYSTEM
# =========================================================================
chat_blocks = [
    prose("problem",
        "**What are we designing?** A general-purpose real-time chat system like Slack or "
        "Discord. Users join workspaces (servers), belong to channels (rooms), and exchange "
        "messages in real time. The system supports typing indicators, presence ('online "
        "now'), message edits/deletes, threaded replies, file attachments, and search. "
        "Unlike WhatsApp (mobile-first, push-driven), chat systems are often desktop-first "
        "with always-open apps that hold the connection for hours.\n\n"
        "The defining challenge is **presence and typing at scale**: a single Slack "
        "workspace can have 100K users across 10K channels, and every keystroke in a "
        "channel must be broadcast to every other viewer of that channel within 200 ms. "
        "Multiply by every active channel, every active user, and you have a brutal "
        "fan-out problem on a tiny, latency-sensitive payload."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Send a message to a channel (text + optional files + optional thread).\n"
        "- Receive messages in real time when the channel is open.\n"
        "- Typing indicators ('Alice is typing...').\n"
        "- Presence: see who's online in the workspace.\n"
        "- Edit / delete messages.\n"
        "- Threaded replies.\n"
        "- Search across message history.\n"
        "- Push notifications when offline or mentioned.\n\n"
        "**Non-functional requirements.**\n"
        "- **Message delivery latency**: p99 < 200 ms for online channel members.\n"
        "- **Typing broadcast latency**: < 200 ms.\n"
        "- **Presence update latency**: < 5 s.\n"
        "- **Availability**: 99.95% per workspace (a workspace outage is a business "
        "stopper).\n"
        "- **Durability**: no message loss; history preserved for years.\n"
        "- **Scale**: 10M+ concurrent users across 1M+ workspaces; some workspaces have "
        "100K+ members.\n\n"
        "**Non-goals.** No voice/video calls (separate system), no workflow automation "
        "(Slack Workflows, etc.)."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Messages.* Assume 50M messages/day globally. Each message ~1KB (text + metadata "
        "+ file refs). 50M x 1KB = 50 GB/day = ~18 TB/year. Tiny by modern standards.\n\n"
        "*Concurrent connections.* 10M concurrent users, each holding 1 WebSocket for "
        "their session. A chat server holds ~100K connections (Slack uses ~50K/host). "
        "Need ~100-200 chat servers globally.\n\n"
        "*Typing indicators.* Each user in an active channel types ~10 chars/sec while "
        "composing, generating ~1 typing event/sec. With 1M active channels averaging 5 "
        "viewers each = 5M typing broadcasts/sec. This dwarfs message traffic — typing is "
        "the real load.\n\n"
        "*Presence.* 10M users, presence updates every 30 s = 333K presence events/sec. "
        "Each event broadcasts to every workspace member viewing the member list — say "
        "100 viewers per workspace = 33M presence broadcasts/sec at the extreme. We need "
        "to throttle / batch presence updates.\n\n"
        "*Search.* 50M messages/day indexed. Search index ~5x message size = 250 GB/day. "
        "Elasticsearch cluster sharded by workspace.\n\n"
        "*Storage.* Messages stored in sharded SQL (per-workspace Postgres) or Cassandra. "
        "5-year retention: 50M x 365 x 5 = 91B messages x 1KB = ~91 TB. Fits in Cassandra."),
    prose("apis",
        "**APIs.** The chat system uses WebSocket for real-time frames and REST for "
        "non-real-time operations.\n\n"
        "```\n"
        "WS  /v1/connect  (auth token, workspace_id in handshake)\n"
        "  -> frame: MSG_SEND    { channel_id, text, thread_id?, client_msg_id }\n"
        "  <- frame: MSG_ACK     { server_msg_id, ts }\n"
        "  <- frame: MSG_RECV    { channel_id, sender_id, text, server_msg_id, ts }\n"
        "  -> frame: TYPING      { channel_id, is_typing }\n"
        "  <- frame: PRESENCE    { user_id, status }\n"
        "  -> frame: MSG_EDIT    { server_msg_id, new_text }\n"
        "  -> frame: MSG_DELETE   { server_msg_id }\n\n"
        "POST /v1/messages          (REST fallback for offline send)\n"
        "GET  /v1/channels/:id/messages?before=...\n"
        "GET  /v1/search?q=...&channel=...\n"
        "POST /v1/files             (presigned S3 URL for upload)\n"
        "```\n\n"
        "The WebSocket is the primary transport; REST is used when no connection is open "
        "(mobile notifications reply via REST) and for paginated history fetches."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Messages* (Cassandra, partitioned by (workspace_id, channel_id), clustered by "
        "server_msg_id):\n"
        "```\n"
        "messages (\n"
        "  workspace_id  BIGINT,\n"
        "  channel_id    BIGINT,\n"
        "  server_msg_id TIMEUUID,    -- Snowflake, sortable\n"
        "  sender_id     BIGINT,\n"
        "  text          TEXT,\n"
        "  thread_id     BIGINT NULL,\n"
        "  edited_at     TIMESTAMP NULL,\n"
        "  deleted_at    TIMESTAMP NULL,\n"
        "  file_urls     LIST<TEXT>,\n"
        "  ts            TIMESTAMP,\n"
        "  PRIMARY KEY ((workspace_id, channel_id), server_msg_id)\n"
        ")\n"
        "```\n\n"
        "*Channels* (per-workspace SQL):\n"
        "```\n"
        "channels (id, workspace_id, name, type ENUM('public','private','dm'), created_at)\n"
        "channel_members (channel_id, user_id, joined_at)\n"
        "```\n\n"
        "*Connection registry* (Redis, mapping user_id -> set of chat_server_ids):\n"
        "```\n"
        "key: conn:{user_id}\n"
        "value: SET of chat_server_ids (a user may have multiple devices)\n"
        "TTL: 60s\n"
        "```\n\n"
        "*Channel subscribers* (Redis, mapping channel_id -> set of online user_ids):\n"
        "```\n"
        "key: subs:{channel_id}\n"
        "value: SET of user_ids currently viewing the channel\n"
        "TTL: 300s   -- refreshed by client heartbeats\n"
        "```\n"
        "When a message arrives for channel C, we lookup subs:C and broadcast to each "
        "subscriber's chat server.\n\n"
        "*Presence* (Redis):\n"
        "```\n"
        "key: presence:{workspace_id}\n"
        "value: HASH { user_id: status (active|away|offline) }\n"
        "```\n"
        "Updates throttled to every 30s per user."),
    diagram("arch",
        "  [Client (browser/app)]\n"
        "        |\n"
        "        | WebSocket (long-lived)\n"
        "        v\n"
        "  [Chat Gateway / LB]   (sticky by user_id so reconnects hit the same chat server)\n"
        "        |\n"
        "        v\n"
        "  [Chat Server]    (stateful per connection; tracks user -> channel subscriptions)\n"
        "        |\n"
        "        +--- reads/writes messages ----------------> [Cassandra]\n"
        "        |                                                (sharded by\n"
        "        +--- reads/writes presence, conn registry ----> [Redis Cluster]\n"
        "        |                                                 (presence,\n"
        "        +--- search ---------------------------------> [Elasticsearch]\n"
        "                                                  subs, conn)\n"
        "\n"
        "  -- Send path --\n"
        "  A sends to channel C:\n"
        "    1. A's chat server writes message to Cassandra (assigns server_msg_id)\n"
        "    2. A's chat server ACKs to A (single tick)\n"
        "    3. A's chat server reads subs:{C} from Redis -> set of viewer user_ids\n"
        "    4. For each viewer, look up conn:{user_id} -> chat_server_ids\n"
        "    5. For each distinct chat server, send one RPC containing the message\n"
        "    6. Each chat server pushes the message to its local WebSockets\n"
        "    7. Offline viewers get a push notification (if mentioned)\n\n"
        "  -- Typing path --\n"
        "  A types in channel C:\n"
        "    1. A's chat server throttles (1 event/sec/user)\n"
        "    2. Lookup subs:{C}, broadcast TYPING frame to each viewer's chat server\n"
        "    3. Chat servers push the typing indicator to local WebSockets",
        "Chat system: stateful chat servers per connection, Redis for presence + channel subscriber set, Cassandra for messages, async broadcast per channel.",
        "A diagram of a chat system. Clients hold long-lived WebSockets through a sticky chat gateway to chat servers. Each chat server is stateful per connection, tracking which user is on which channel. Chat servers read and write messages to Cassandra, and read and write presence and connection registries to a Redis cluster. Search runs against Elasticsearch. The send path: A sends to channel C; A's chat server writes the message to Cassandra, ACKs to A, reads the subscriber set subs:C from Redis, then for each subscriber looks up their chat server via conn:user_id, groups subscribers by chat server, and sends one batched RPC per distinct chat server. Each chat server pushes the message to its local WebSockets. Offline viewers get a push notification if mentioned. The typing path is similar but throttled to one event per second per user and broadcast only to active viewers of the channel."),
    prose("deep-dive",
        "**Deep dive: presence, typing, and the broadcast fan-out.**\n\n"
        "The hardest part of a chat system is not storing messages — that's a solved problem "
        "(Cassandra, partitioned by channel). The hard part is **broadcasting small, "
        "high-frequency events (typing, presence, edits) to every viewer of every channel, "
        "within 200 ms, without melting the system**.\n\n"
        "**The subs:C set.** When a user opens channel C, their client subscribes via the "
        "chat server, which does `SADD subs:{C} user_id`. When they switch channels, "
        "`SREM` from the old, `SADD` to the new. The chat server reads subs:C to know who "
        "to broadcast to. TTL 300s means a closed laptop stops receiving broadcasts within "
        "5 minutes.\n\n"
        "**Typing throttling.** A naive implementation sends a typing event on every "
        "keystroke. At 10 chars/sec per user, this is 10 broadcasts/sec per typing user per "
        "channel. We throttle to 1 event/sec per (user, channel) — clients render an "
        "'Alice is typing...' indicator that fades after 3 seconds, so 1Hz is enough to "
        "keep it alive.\n\n"
        "**Presence batching.** Presence updates for 10M users at 30s interval = 333K "
        "events/sec. Each event broadcasts to every workspace member viewing the member "
        "list — potentially 100K viewers for a large workspace. Naive: 33M broadcasts/sec. "
        "We batch: presence updates are aggregated per workspace and pushed every 5s; "
        "clients render a slightly-stale member list.\n\n"
        "**Multi-device fan-out.** A user with 3 devices (desktop, phone, tablet) has 3 "
        "WebSocket connections, possibly to 3 different chat servers. The conn:{user_id} "
        "key holds a SET of chat_server_ids. Every broadcast to user X must reach all 3 "
        "servers. We do this by sending to each chat_server_id in the set.\n\n"
        "**Message edits and deletes.** Edits broadcast an MSG_EDIT frame to subs:C with "
        "the new text and server_msg_id; clients replace the message locally. Deletes "
        "broadcast MSG_DELETE; clients replace the message with '(deleted)'. The "
        "Cassandra row is updated with `edited_at` / `deleted_at`; reads filter deleted "
        "messages.\n\n"
        "**Search indexing.** Every message publish also goes to a Kafka topic per "
        "workspace; an indexer writes to Elasticsearch. Search returns message_ids; the "
        "client fetches full messages from Cassandra. Search is decoupled from the chat "
        "path — a search outage doesn't break chatting.\n\n"
        "**Idempotency and ordering.** Same as WhatsApp: client_msg_id for idempotency; "
        "Snowflake TIMEUUID for ordering within a channel. Channel messages are clustered "
        "by server_msg_id, so reads are in send order."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Typing broadcast storm.** A 1000-person channel where everyone is typing "
        "generates 1000 broadcasts/sec to 1000 viewers = 1M fan-out writes/sec for one "
        "channel. *Mitigation*: cap typing broadcasts to the first 50 viewers (you can't "
        "render 1000 typing indicators anyway); sample typing events at 1Hz per user.\n\n"
        "- **Chat server failure.** All connections on a dead chat server must reconnect. "
        "*Mitigation*: sticky-session rebalancing; clients reconnect with exponential "
        "backoff; new chat server re-subscribes to all the user's open channels.\n\n"
        "- **Hot channel.** A 100K-person company-wide channel where every message "
        "broadcasts to 100K subscribers. *Mitigation*: broadcast via a tree (the sender's "
        "chat server forwards to N 'aggregator' chat servers, each of which fans out to "
        "their local subscribers).\n\n"
        "- **Redis failure.** Without Redis, we can't look up subscribers; broadcasts "
        "fail. *Mitigation*: Redis cluster with replicas; fall back to broadcasting only to "
        "users on the sender's chat server (degraded mode).\n\n"
        "- **Search index lag.** Recently posted messages aren't searchable for 5-30s. "
        "*Mitigation*: accept it; show 'this message is being indexed' for the sender.\n\n"
        "- **Push notification spam.** A user mentioned in 5 channels while offline "
        "generates 5 separate push notifications. *Mitigation*: coalesce notifications "
        "into one 'you have 5 new mentions' push, with deep links.\n\n"
        "- **Workspace-level isolation failure.** A bug in one workspace affecting another. "
        "*Mitigation*: shard by workspace_id; per-workspace rate limits; per-workspace "
        "keyspaces in Cassandra.\n\n"
        "- **Message edit race.** Two devices edit the same message simultaneously. "
        "*Mitigation*: last-write-wins by `edited_at` timestamp; clients fetch the final "
        "version on reconnect."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Chat server scaling.* Add chat servers horizontally. Use sticky routing (hash of "
        "user_id -> chat server) so reconnects are cheap. A dead chat server's users "
        "reconnect with backoff.\n\n"
        "*Redis cluster.* Shard by user_id for conn: keys, by channel_id for subs: keys, "
        "by workspace_id for presence. Cross-shard operations (e.g. broadcasting to a "
        "channel whose subscribers span many shards) require fan-out at the application "
        "layer.\n\n"
        "*Cassandra scaling.* Shard by (workspace_id, channel_id). Each channel's "
        "messages live on one partition (cheap reads). For very active channels "
        "(company-wide), sub-partition by day.\n\n"
        "*Multi-region.* Run chat servers in 5+ regions. Each user connects to nearest. "
        "Cross-region broadcasts go through a backbone RPC. Messages are written to a "
        "single-region Cassandra primary and asynchronously replicated.\n\n"
        "*Search scaling.* Elasticsearch cluster per workspace (or per-shard for large "
        "workspaces). Use rollover indices (one per month) so old indices can be searched "
        "lazily.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose per-connection stateful chat servers — **gained** low-latency "
        "broadcasts, **lost** rebalancing ease (mitigated by sticky routing + client "
        "backoff).\n"
        "- We chose Cassandra for messages — **gained** write throughput and time-series "
        "friendliness, **lost** JOINs (hydrating a thread requires a separate query).\n"
        "- We chose 1Hz typing throttle — **gained** bounded broadcast load, **lost** UI "
        "responsiveness (acceptable; clients render the indicator for 3s).\n"
        "- We chose 5s presence batch — **gained** presence traffic manageable, **lost** "
        "real-time presence accuracy (acceptable; users won't notice 5s staleness).\n"
        "- We chose async search indexing — **gained** no impact on chat latency, "
        "**lost** instant search for very recent messages."),
    quiz("q1",
        "In a 1000-person channel, every user is typing simultaneously. What's the broadcast load, and how do you mitigate it?",
        ["1000 typing events/sec per user x 1000 viewers = 1M fan-out writes/sec for one channel. Mitigate by throttling to 1Hz per user AND sampling to the first 50 viewers (you can't render 1000 typing indicators anyway).",
         "1000 events/sec, fine — Redis handles 100K writes/sec easily.",
         "Typing is dropped entirely above 100 users.",
         "Each user's typing is broadcast to everyone in the workspace."],
        0,
        "Naively, 1000 typing users at 1Hz broadcasting to 1000 viewers = 1M fan-out writes/sec for one channel — this would melt a Redis shard. Two mitigations: (1) throttle typing events to 1Hz per (user, channel), and (2) cap the broadcast to the first 50 viewers (the UI can't usefully show 1000 'X is typing' indicators anyway — Slack shows 'Alice and 5 others are typing' at most). Together this caps the broadcast to 50 writes/sec per active channel, manageable.",
        "interview"),
    quiz("q2",
        "A user has 3 devices (desktop, phone, tablet) connected to 3 different chat servers. A message arrives for them. How is it delivered to all 3?",
        ["The sender's chat server picks one device to deliver to; the others sync on next reconnect.",
         "The conn:{user_id} Redis key holds a SET of chat_server_ids; the sender looks up all 3 and sends one RPC to each.",
         "The user's devices poll for new messages every 5s.",
         "Only the most-recently-active device receives the message."],
        1,
        "Multi-device delivery is a hard requirement (you want to read on phone while desktop is open). We store conn:{user_id} as a SET of chat_server_ids in Redis. When a message arrives for the user, the sender's chat server reads the set, gets 3 chat_server_ids, and sends one RPC to each distinct server. Each server then pushes the message to the specific WebSocket(s) it hosts for that user. The set is maintained by SADD on connect, SREM on disconnect, with TTL 60s as a safety net.",
        "solid"),
]

w("design-chat-system",
  "Design Chat System",
  "Design a Slack/Discord-style real-time chat system at 10M concurrent users. Covers stateful chat servers with sticky WebSocket routing, the subs:{channel_id} Redis set for channel subscriber tracking, throttled typing broadcasts (1Hz, capped to first 50 viewers), batched presence updates (5s), multi-device fan-out via conn:{user_id} SET, Cassandra for messages sharded by (workspace_id, channel_id), and Elasticsearch for search fed async by Kafka.",
  "Chat systems are the canonical 'real-time broadcast' problem. They combine three problems that each stress a system differently: high concurrent connections, high-frequency small broadcasts (typing/presence), and durable message storage with history. The patterns here — sticky WebSocket routing, the subs-channel-Redis pattern, throttled typing, and multi-device fan-out — are reusable for any real-time collaborative system (Figma cursors, Google Docs presence, multiplayer game state).",
  ["websockets", "message-queues"],
  ["design-whatsapp"],
  30, "interview",
  chat_blocks,
  ["Sticky WebSocket routing keeps reconnects cheap and broadcasts local.",
   "Throttled typing + capped viewer list bounds the worst-case broadcast load.",
   "Multi-device fan-out via conn:{user_id} SET delivers to every device.",
   "Async Kafka -> Elasticsearch decouples search from the chat path."],
  ["Typing broadcasts can melt a Redis shard without throttling + viewer capping.",
   "Per-connection stateful servers complicate rebalancing on failure.",
   "Presence staleness (5s) is acceptable but limits real-time apps.",
   "Search index lag (5-30s) makes very recent messages unsearchable briefly."],
  ["Typing broadcast storm in large channels — needs 1Hz throttle + 50-viewer cap.",
   "Chat server death causes reconnection thundering herd — needs backoff.",
   "Hot channel for company-wide broadcasts — needs tree-based fan-out.",
   "Redis failure kills broadcasts — needs cluster + degraded-mode fallback.",
   "Multi-device edit race — needs last-write-wins on edited_at."],
  ["Broadcasting typing to every viewer without throttling — melts Redis.",
   "Single WebSocket per user (no multi-device) — breaks mobile + desktop together.",
   "Storing presence in Cassandra instead of Redis — too slow for 5s updates.",
   "Sync search indexing on the chat path — adds latency to message sends.",
   "Per-user Redis keys instead of per-channel subs:C — 1000x more lookups."],
  ["Slack",
   "Discord",
   "Microsoft Teams",
   "Mattermost (self-hosted)",
   "Rocket.Chat"],
  ["Design a chat system like Slack. How do you handle typing indicators?",
   "A user has 3 devices open. How do you deliver a message to all 3?",
   "A 1000-person channel has everyone typing. What breaks, and how do you fix it?",
   "How do you make search not block the chat path?"],
  [{"system": "Slack", "how": "Stateful chat servers with sticky WebSocket routing, Redis for presence and channel subscriptions, Cassandra-style store for messages. Documented in their engineering blog."},
   {"system": "Discord", "how": "Originally used Elixir + Phoenix for chat servers; migrated to Rust + ScyllaDB (C++ Cassandra) for higher throughput. Handles 10M+ concurrent voice users."},
   {"system": "Microsoft Teams", "how": "Built on top of Skype's infrastructure with Azure Service Bus for fan-out. Uses Exchange Online for message storage."}])

print("Done with Chat System")


# =========================================================================
# 9. UBER
# =========================================================================
uber_blocks = [
    prose("problem",
        "**What are we designing?** Uber — a ride-hailing platform that connects riders "
        "with drivers in real time. A rider requests a ride; the system finds nearby "
        "drivers, dispatches one, tracks the ride in progress, processes payment, and "
        "adjusts price dynamically based on supply and demand (surge pricing).\n\n"
        "The defining challenges are **geospatial**: how do you find the nearest available "
        "drivers to a rider in <1 second, track 1M+ driver locations in real time, and "
        "balance supply and demand at city-block granularity? Most other systems we design "
        "are key-value or graph-shaped; Uber is fundamentally a spatial system."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Rider requests a ride; system matches them with a nearby driver.\n"
        "- Driver app reports location every 1-3 seconds.\n"
        "- Rider app shows driver location on the map in real time during ride.\n"
        "- System computes ETA, price, and route.\n"
        "- Surge pricing: price multipliers by zone based on demand/supply.\n"
        "- Trip history and receipts.\n"
        "- Rating system after each ride.\n\n"
        "**Non-functional requirements.**\n"
        "- **Dispatch latency**: < 1 s from ride request to driver notification.\n"
        "- **Driver location update**: every 1-3 s; p99 delivery to rider < 2 s.\n"
        "- **Availability**: 99.99% (an outage leaves riders stranded).\n"
        "- **Consistency**: a driver can only be assigned to one ride at a time.\n"
        "- **Scale**: 15M trips/day, 5M drivers, 100M+ riders, 1M+ concurrent trips.\n\n"
        "**Non-goals.** No delivery (Uber Eats), no freight, no autonomous vehicles."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Trips.* 15M trips/day. Average trip ~30 min, so concurrent trips at peak ~15M "
        "x 30/(24x60) = ~312K concurrent trips.\n\n"
        "*Driver location updates.* 5M drivers online at peak, each sending a location "
        "update every 3s = 1.67M updates/sec. Each update is ~100 bytes (driver_id, lat, "
        "lng, ts). 1.67M x 100 B = 167 MB/s = 1.3 Gbps of location ingress.\n\n"
        "*Rider location updates.* ~312K active riders sending every 5s = 62K updates/sec, "
        "smaller volume but similar pattern.\n\n"
        "*Dispatches.* 15M trips/day / 86400s = ~175 dispatches/sec average, peak ~500/sec. "
        "Each dispatch queries nearby drivers (radius ~3km) and notifies up to 3 drivers in "
        "parallel.\n\n"
        "*Storage.* Trip records: 15M/day x ~1KB = 15 GB/day = ~5.5 TB/year. Driver "
        "location history: 1.67M updates/sec x 100 B x 86400s = 14 TB/day — too much to "
        "keep hot; sample to every 30s for archival, keep only last 30 days for live "
        "queries.\n\n"
        "*Surge updates.* Surge multipliers per zone, recomputed every 5 min. ~10K zones "
        "globally. Surge is small data but read-heavy."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/rides                    (rider_id, pickup, dropoff, ride_type)\n"
        "  -> { ride_id, drivers_notified, eta, surge_multiplier, price }\n\n"
        "PATCH /v1/rides/:id               (driver accepts, completes, cancels)\n"
        "GET  /v1/rides/:id                (status, driver, eta)\n\n"
        "POST /v1/drivers/:id/location    (lat, lng, heading, speed)   -- every 1-3s\n"
        "GET  /v1/rides/:id/location      (current driver location for rider map)\n\n"
        "GET  /v1/surge?lat=..&lng=..     (current surge multiplier at a point)\n"
        "```\n\n"
        "Driver location is the hot path: drivers push every few seconds via WebSocket "
        "or HTTP POST. Rider location during a ride is the read counterpart."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Driver location* (Redis GEORADIUS, hot): each driver's current location is "
        "stored in a Redis GEO set per city:\n"
        "```\n"
        "key: drivers:{city_id}\n"
        "type: GEO sorted set\n"
        "members: driver_id, score = geohash of (lat, lng)\n"
        "```\n"
        "GEORADIUS drivers:nyc 40.74 -73.99 3 km → returns drivers within 3km.\n\n"
        "*Rides* (sharded SQL, source of truth):\n"
        "```\n"
        "rides (id BIGINT PK, rider_id, driver_id NULL, pickup GEO,\n"
        "       dropoff GEO, status ENUM('requested','accepted','en_route','completed','canceled'),\n"
        "       surge_mult FLOAT, price_cents INT, created_at, completed_at NULL)\n"
        "```\n\n"
        "*Drivers* (sharded SQL):\n"
        "```\n"
        "drivers (id, name, car_model, license_plate, rating_avg, status ENUM('online','offline','busy'),\n"
        "         current_lat, current_lng, current_zone_id)\n"
        "INDEX (status, current_zone_id)\n"
        "```\n\n"
        "*Surge zones* (Redis, computed every 5 min):\n"
        "```\n"
        "key: surge:{zone_id}\n"
        "value: { multiplier: 1.5, updated_at: ts }\n"
        "TTL:   10 min\n"
        "```\n\n"
        "*Trip history* (Cassandra, partitioned by rider_id):\n"
        "```\n"
        "trip_history (rider_id, ride_id, ts, driver_id, price_cents, ...)\n"
        "PRIMARY KEY ((rider_id), ts)\n"
        "```\n"
        "Time-ordered per rider, RF=3."),
    diagram("arch",
        "  [Rider App]                                    [Driver App]\n"
        "      |                                                |\n"
        "      | (1) request ride                               | (every 1-3s) POST location\n"
        "      v                                                v\n"
        "  [API Gateway] <------------------------------> [API Gateway]\n"
        "      |                                                |\n"
        "      v                                                v\n"
        "  [Ride Service]                              [Location Service]\n"
        "  - create ride (status=requested)            - update Redis GEO (drivers:{city})\n"
        "  - publish 'ride.requested' to Kafka        - publish 'driver.moved' to Kafka\n"
        "      |                                                |\n"
        "      v                                                v\n"
        "  [Dispatch Service]                          [Map Match Service]\n"
        "  - GEORADIUS Redis drivers:{city} 3km         (snaps GPS to road network)\n"
        "  - filter: status=online, not busy\n"
        "  - notify top 3 drivers via WebSocket / push\n"
        "      |\n"
        "      v\n"
        "  [Driver accepts] -> Ride Service updates driver_id, status=accepted\n"
        "      |\n"
        "      v\n"
        "  [Trip Tracker] (subscribes to driver.moved for this driver)\n"
        "  - pushes driver location to rider via WebSocket\n"
        "  - recomputes ETA\n\n"
        "  -- Surge pricing background --\n"
        "  Kafka: ride.requested + driver.moved -> [Surge Worker]\n"
        "    - aggregate demand (ride requests) and supply (online drivers) per zone\n"
        "    - recompute multiplier every 5 min\n"
        "    - publish to Redis surge:{zone_id}",
        "Uber: rider requests ride, dispatch service queries Redis GEO for nearby drivers, driver accepts via WebSocket, trip tracker streams driver location to rider, surge worker recomputes multipliers from demand/supply streams.",
        "A diagram of Uber's architecture. The rider app requests a ride through the API gateway to a Ride Service, which creates a ride record and publishes a ride-requested event to Kafka. The driver app posts its location every 1-3 seconds through the API gateway to a Location Service, which updates a Redis GEO sorted set of drivers per city and publishes a driver-moved event to Kafka. A Dispatch Service consumes ride-requested events, runs GEORADIUS on Redis to find drivers within 3 kilometers, filters by online and not-busy status, and notifies the top 3 drivers via WebSocket or push. The first driver to accept is assigned; the Ride Service updates the ride's driver_id and status. A Trip Tracker subscribes to driver-moved events for the assigned driver and pushes their location to the rider via WebSocket while recomputing ETA. A separate Surge Worker consumes both ride-requested and driver-moved events, aggregates demand and supply per zone every 5 minutes, recomputes the surge multiplier, and publishes it to Redis."),
    prose("deep-dive",
        "**Deep dive: geospatial indexing (geohash vs quadtree) and dispatch.**\n\n"
        "The hardest problem is: 'given a rider at (lat, lng), find the nearest available "
        "drivers within 3 km, in <1 second, across 1M+ drivers.' Three approaches:\n\n"
        "**1. Redis GEO (geohash).** Redis stores driver locations in a sorted set scored "
        "by geohash (a 52-bit encoding of lat/lng into a single integer that preserves "
        "proximity). GEORADIUS is O(log N + M) where M is the number of matches. This is "
        "what most ride-hailing systems use as the first cut. Pros: simple, fast, built-in. "
        "Cons: limited filtering (you can't filter by 'driver has 4+ rating' in Redis; "
        "must fetch and filter in app code).\n\n"
        "**2. Quadtree.** Recursively subdivide the map into 4 quadrants until each leaf "
        "has <K drivers. To find nearby drivers, walk the tree down to the rider's leaf, "
        "then expand to neighbors until enough drivers are found. Pros: more flexible "
        "(can store metadata per node, e.g. only drivers with rating >= 4.5). Cons: harder "
        "to update (drivers move constantly, so the tree is rebuilt frequently).\n\n"
        "**3. Google S2 / H3 cells.** Hierarchical hexagonal (H3, from Uber itself) or "
        "spherical (S2, from Google) cell systems. Each cell has a 64-bit ID; nearby "
        "cells have nearby IDs. Hexagonal cells avoid the 'diagonal neighbor' problem of "
        "quadtrees (every hex has 6 equidistant neighbors). H3 is what Uber actually uses "
        "internally for surge zones and driver search.\n\n"
        "**Our choice: Redis GEO + H3 zones.** Redis GEO handles the fast 'nearest drivers' "
        "query; H3 cells drive surge pricing and zone-based dispatch (e.g. only dispatch "
        "to drivers in the rider's H3 cell or its 6 neighbors).\n\n"
        "**Dispatch flow.** When a ride is requested:\n"
        "1. The Dispatch Service runs GEORADIUS drivers:nyc lat lng 3 km, getting ~10-50 "
        "candidate driver_ids.\n"
        "2. Fetch driver metadata from Redis (status, rating, vehicle type) — a batched "
        "MGET against driver_meta:{id} keys.\n"
        "3. Filter: status=online, rating >= 4.5, vehicle matches ride_type.\n"
        "4. Rank by distance + rating (closer and higher-rated first).\n"
        "5. Send a 'ride offer' WebSocket/push to the top 3 drivers in parallel.\n"
        "6. First driver to accept gets the ride; others get a 'ride taken' message.\n"
        "7. If no driver accepts in 10s, expand the radius to 5km and retry.\n\n"
        "**Driver concurrency control.** A driver can only be on one ride at a time. "
        "When a driver accepts, we SET their status to 'busy' atomically via a Lua script "
        "(so two concurrent ride offers can't both be accepted). The losing offers are "
        "rolled back to 'online' status.\n\n"
        "**Surge pricing.** A background worker aggregates ride requests and online "
        "drivers per H3 zone every 5 min, computes a demand/supply ratio, and emits a "
        "multiplier (e.g. 1.0x normal, 1.5x high demand, 2.5x very high). The multiplier "
        "is published to Redis and read by the Ride Service when pricing a new ride. "
        "Surge updates push notifications to drivers in high-surge zones (incentivizing "
        "them to drive there)."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Redis GEO hot shard.** All drivers in NYC live in one Redis GEO key; a "
        "single shard handles all NYC queries. *Mitigation*: shard by zone (one key per "
        "borough); replicate read-heavy keys.\n\n"
        "- **Driver location write hotspot.** 1.67M driver location updates/sec, each "
        "updating a Redis GEO key. A single Redis primary handles ~100K writes/sec. "
        "*Mitigation*: shard Redis by city; use Redis Cluster with 16+ shards per metro.\n\n"
        "- **Dispatch thundering herd.** A popular event (concert ending) triggers 10K "
        "ride requests in 1 minute, all from the same area. *Mitigation*: queue requests; "
        "rate-limit dispatch; pre-position drivers (predict where demand will be).\n\n"
        "- **Driver accept race.** Two rides try to dispatch the same driver "
        "simultaneously. *Mitigation*: Lua script atomic SET status='busy' IF status='online'; "
        "only one wins.\n\n"
        "- **GPS jitter.** Driver GPS bounces around when in a tunnel; the rider map shows "
        "the car teleporting. *Mitigation*: snap GPS to the road network (map matching); "
        "smooth the location stream with a Kalman filter.\n\n"
        "- **WebSocket failure during ride.** If the rider's WebSocket drops, they can't "
        "see driver location. *Mitigation*: client retries with backoff; falls back to "
        "HTTP polling every 5s; driver-side ETA still works.\n\n"
        "- **Surge lag.** Surge is recomputed every 5 min; a sudden demand spike takes 5 "
        "min to reflect in pricing. *Mitigation*: trigger an immediate surge recompute "
        "when demand in a zone exceeds 2x normal.\n\n"
        "- **Payment failure mid-trip.** The rider's card is declined at trip end. "
        "*Mitigation*: charge a pre-authorization hold at ride request; if the hold "
        "fails, reject the ride request before dispatch."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Geospatial sharding.* Shard by city — each metro has its own Redis GEO cluster, "
        "Dispatch Service instances, and trip storage. Cross-city traffic is zero (you "
        "can't drive from NYC to LA mid-ride).\n\n"
        "*Driver location write path.* Drivers POST location every 1-3s; the Location "
        "Service batches writes per driver (one Redis update per second, not per request) "
        "to reduce Redis load. Driver apps throttle themselves on slow networks.\n\n"
        "*Multi-region.* Each city runs in its nearest region. Cross-region replication is "
        "not needed for live data (drivers and rides are local); only trip history is "
        "replicated to a central warehouse for analytics.\n\n"
        "*Surge scaling.* Per-zone multipliers are small data; the surge worker can run "
        "in a single region per metro, writing to a local Redis that the Ride Service "
        "reads from.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose Redis GEO over a custom quadtree — **gained** operational simplicity "
        "and built-in commands, **lost** rich filtering (must fetch and filter).\n"
        "- We chose H3 hex cells for zones — **gained** equidistant neighbors (vs "
        "quadtrees' diagonal problem), **lost** the S2 ecosystem's maturity.\n"
        "- We chose 1-3s driver location update — **gained** fine-grained rider map, "
        "**lost** battery on the driver's phone (mitigated by adaptive update rate).\n"
        "- We chose per-city sharding — **gained** isolation, **lost** cross-city "
        "optimization (e.g. a driver near a city boundary could pick up rides in either).\n"
        "- We chose 5-min surge recompute — **gained** low surge compute cost, **lost** "
        "real-time surge accuracy (mitigated by event-triggered recomputes on spikes)."),
    quiz("q1",
        "A rider in NYC requests a ride. The system needs to find nearby drivers. Which data structure should the Dispatch Service query?",
        ["A full table scan of the drivers table filtered by city.",
         "Redis GEO sorted set (GEORADIUS) sharded by city — O(log N + M) for nearby driver lookup.",
         "A graph database of all drivers and riders.",
         "Elasticsearch geo_point query."],
        1,
        "Redis GEO uses geohash encoding to store lat/lng as a single sortable score, so GEORADIUS is O(log N + M) where M is the number of matches. For 1M+ drivers in NYC, this returns ~50 candidates in <10ms. A full table scan (option A) is O(N) — orders of magnitude too slow. Elasticsearch geo_point (option D) works but adds a separate system to operate and has higher latency than Redis for in-memory queries. Graph DBs (option C) are for relationships, not spatial queries.",
        "interview"),
    quiz("q2",
        "Two rides simultaneously dispatch the same driver. Without protection, both could 'accept' the driver. How do you prevent this?",
        ["The driver's app shows only one ride offer at a time, so this can't happen.",
         "A Lua script atomically checks status='online' and sets status='busy' in Redis — only one of the two SETs succeeds.",
         "The Ride Service locks the driver row in Postgres with SELECT FOR UPDATE.",
         "The driver accepts both; the system picks the higher-paying ride."],
        1,
        "Even if the driver's app shows one offer at a time, the system must protect against races. The atomic check-and-set is the standard solution: a Lua script in Redis executes `if status='online' then status='busy' return ok else return fail` as a single atomic operation. Only one of the two concurrent accept calls succeeds; the other gets a 'fail' response and the ride is re-dispatched. SELECT FOR UPDATE (option C) works but adds a database round trip and lock contention; the Redis Lua approach is faster and decoupled from the SQL store.",
        "solid"),
]

w("design-uber",
  "Design Uber",
  "Design Uber at 15M trips/day, 5M drivers, 1M+ concurrent trips. Covers Redis GEO sorted sets for nearest-driver queries, H3 hex cells for surge zones, 1-3s driver location updates, parallel dispatch to top-3 drivers with atomic Lua-script concurrency control, surge pricing recomputed every 5 min from demand/supply streams, GPS map-matching with Kalman filtering, and per-city geospatial sharding.",
  "Uber is the canonical geospatial system design. The patterns — Redis GEO for nearest-neighbor, H3/quadtree for spatial aggregation, atomic driver assignment, surge pricing from event streams — are reusable for any spatial problem: food delivery (DoorDash, Uber Eats), fleet tracking, real estate search, dating apps with proximity, and even multiplayer game state. Spatial indexing is a distinct skill from key-value or graph indexing.",
  ["websockets", "pub-sub"],
  ["design-ride-matching"],
  40, "interview",
  uber_blocks,
  ["Redis GEORADIUS gives O(log N + M) nearest-driver queries in <10 ms.",
   "Atomic Lua-script driver assignment prevents double-booking races.",
   "H3 hex cells make surge zones equidistant (no quadtree diagonal problem).",
   "Per-city sharding isolates traffic and bounds Redis GEO key size."],
  ["Redis GEO hotspot for large metros (NYC has 500K+ drivers in one key) — needs zone sharding.",
   "Driver location write load (1.67M updates/sec) is heavy — needs batching + sharding.",
   "Surge recompute every 5 min lags sudden demand spikes — needs event-triggered recomputes.",
   "GPS jitter shows drivers teleporting on the rider map — needs map matching + Kalman filter."],
  ["Redis GEO hot shard in big metros — needs zone-level sharding.",
   "Driver accept race — needs atomic Lua check-and-set.",
   "Dispatch thundering herd at event endings — needs queueing + pre-positioning.",
   "GPS jitter on the rider map — needs map matching + Kalman filter.",
   "Payment failure mid-trip — needs pre-auth at ride request."],
  ["Full table scan for nearby drivers — O(N) is far too slow at 1M drivers.",
   "Driver location updates going straight to SQL — too slow and write-heavy.",
   "Single global Redis for all drivers — hotspot and single point of failure.",
   "Non-atomic driver accept (SET status='busy' without checking) — double-booking.",
   "Surge recompute on every ride request — too expensive and inconsistent."],
  ["Uber",
   "Lyft",
   "DiDi",
   "DoorDash / Uber Eats (delivery variant)",
   "Grab"],
  ["Design Uber. How do you find the nearest driver to a rider?",
   "Two rides try to dispatch the same driver. How do you prevent double-booking?",
   "How do you implement surge pricing?",
   "A driver's GPS bounces around in a tunnel. How do you fix the rider map?"],
  [{"system": "Uber", "how": "H3 hex cells for zones, Redis-style geo index for nearest drivers, Kafka for event streaming, geobased sharding per city. Documented in Uber engineering blog 'H3: Hexagonal Hierarchical Spatial Index'."},
   {"system": "Lyft", "how": "Similar architecture; uses a custom quadtree and S2 cells. Per-city sharding. Documented in their engineering blog."},
   {"system": "DoorDash", "how": "Adapts the Uber pattern for food delivery: rider becomes 'customer', driver becomes 'dasher', ETA computation is more complex (restaurant prep time + drive time)."}])

print("Done with Uber")


# =========================================================================
# 10. NETFLIX
# =========================================================================
netflix_blocks = [
    prose("problem",
        "**What are we designing?** Netflix — a global on-demand video streaming service. "
        "Users browse a catalog of movies/shows, click play, and the video starts streaming "
        "within 2 seconds and plays smoothly even on flaky mobile networks. Netflix must "
        "serve 250M+ subscribers across 190 countries, handle 30%+ of US peak internet "
        "traffic, and produce original content that must be ingested, transcoded, and "
        "delivered worldwide.\n\n"
        "The defining challenges are **video at scale** (each stream is multi-Mbps, "
        "sustained for hours) and **adaptive playback** (the video must smoothly switch "
        "quality as the user's bandwidth fluctuates). The CDN strategy is the heart of "
        "this case study — Netflix famously built its own CDN (Open Connect) because "
        "generic CDNs couldn't handle the load."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Browse catalog (titles, posters, metadata).\n"
        "- Search titles.\n"
        "- Play a video on demand; supports resume, scrub, skip intro.\n"
        "- Adaptive bitrate: video quality adjusts to network conditions.\n"
        "- Subtitles / audio tracks in multiple languages.\n"
        "- Continue-watching, personalized recommendations.\n\n"
        "**Non-functional requirements.**\n"
        "- **Time-to-first-frame**: < 2 s (longer = users abandon).\n"
        "- **Rebuffer ratio**: < 1% of play time (rebuffering causes churn).\n"
        "- **Availability**: 99.99% (Saturday-night outages are news).\n"
        "- **Catalog size**: 100K+ titles, each in 5+ bitrates and 5+ resolutions.\n"
        "- **Scale**: 250M subscribers, 200M+ hours streamed/day.\n\n"
        "**Non-goals.** No live streaming, no user-generated content (that's YouTube)."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Streaming volume.* 250M subscribers, average 2 hours/day viewing = 500M "
        "hours/day = ~6 TB/day compressed at 5 Mbps = ~30 PB/day of egress. Netflix is "
        "~15% of global internet traffic.\n\n"
        "*Storage.* Each title is encoded in ~5 bitrates (240p to 4K) and multiple codecs "
        "(H.264, HEVC, AV1). A 2-hour movie at 4K = ~7 GB per encoding; 5 encodings x 3 "
        "codecs = ~100 GB per title. 100K titles x 100 GB = 10 PB of media storage. "
        "Stored on object storage (S3) and pushed to CDN edges.\n\n"
        "*Catalog metadata.* Each title ~10KB (title, synopsis, cast, posters, etc.). "
        "100K titles x 10 KB = 1 GB. Trivial — fits in a single database.\n\n"
        "*CDN edge capacity.* Netflix Open Connect Appliance (OCA) caches sit inside "
        "ISPs. Each OCA holds ~100 TB-2 PB. There are 1000+ OCAs globally.\n\n"
        "*Recommendations.* Pre-compute top-N recommendations per user, refreshed daily. "
        "250M users x 100 recs x 8 bytes = 200 GB in Redis.\n\n"
        "*Watch history.* 250M users x ~1000 watched items x 100 bytes = 25 GB in "
        "Cassandra."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "GET  /v1/catalog?genre=...               -> titles list (paginated)\n"
        "GET  /v1/titles/:id                       -> metadata + available encodings\n"
        "GET  /v1/search?q=...                     -> search results\n"
        "POST /v1/playback/start                   (title_id, device, bitrate_hint)\n"
        "  -> { manifest_url, license_url, cdn_node }    (HLS/DASH manifest URL)\n"
        "POST /v1/playback/progress                (every 30s, for resume + analytics)\n"
        "GET  /v1/recommendations                  -> personalized top-N\n"
        "```\n\n"
        "Playback is HLS or DASH: the player fetches a manifest (m3u8 or mpd) listing "
        "available bitrates; the player requests segments (2-10s video chunks) and "
        "decides which bitrate to fetch based on observed throughput."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Titles* (sharded SQL):\n"
        "```\n"
        "titles (id BIGINT PK, name, synopsis, runtime_sec, release_year,\n"
        "       maturity_rating, default_poster_url)\n"
        "title_genres (title_id, genre)\n"
        "title_cast (title_id, actor_id, role)\n"
        "```\n\n"
        "*Encodings* (object storage S3 + CDN edge):\n"
        "```\n"
        "encodings (id, title_id, resolution ENUM('240p','480p','720p','1080p','4K'),\n"
        "           codec ENUM('h264','hevc','av1'), bitrate_kbps, manifest_url)\n"
        "```\n\n"
        "*Watch progress* (Cassandra, partitioned by user_id):\n"
        "```\n"
        "watch_progress (user_id, title_id, position_sec, ts, PRIMARY KEY ((user_id), title_id))\n"
        "```\n\n"
        "*Recommendations* (Redis, pre-computed):\n"
        "```\n"
        "key: recs:{user_id}\n"
        "value: LIST of title_ids, top 100\n"
        "TTL:   24h (refreshed daily)\n"
        "```\n\n"
        "*Manifest* (HLS m3u8 file, served from CDN):\n"
        "```\n"
        "#EXTM3U\n"
        "#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\n"
        "1080p/playlist.m3u8\n"
        "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360\n"
        "360p/playlist.m3u8\n"
        "```\n"
        "Each sub-playlist lists 10s .ts segments."),
    diagram("arch",
        "  -- INGESTION / TRANSCODING PIPELINE --\n"
        "  [Studio / Original Content]\n"
        "       |\n"
        "       v\n"
        "  [S3 source bucket]  (master mezzanine file, ~10s of GB)\n"
        "       |\n"
        "       v\n"
        "  [Transcode Workers]  (parallel FFmpeg jobs:\n"
        "       - 5 resolutions x 3 codecs = 15 encodings\n"
        "       - segment into 10s chunks\n"
        "       - DRM encrypt (Widevine / FairPlay)\n"
        "       - package as HLS/DASH manifests)\n"
        "       |\n"
        "       v\n"
        "  [S3 encoding bucket]  -> [Open Connect Appliance (OCA)] (pushed to ISP edges)\n\n"
        "  -- PLAYBACK PATH --\n"
        "  [Device] --(1) GET /playback/start--> [Playback Service]\n"
        "       <-- manifest_url + cdn_node ---------------\n"
        "       |\n"
        "       | (2) device chooses nearest OCA (DNS-based routing)\n"
        "       v\n"
        "  [OCA at ISP]  --serves HLS segments-->\n"
        "       |\n"
        "       | device's ABR algorithm:\n"
        "       |   - probe bandwidth with 1st segment\n"
        "       |   - fetch 240p segment, switch up if throughput > 5Mbps\n"
        "       |   - switch down on rebuffers\n"
        "       v\n"
        "  Smooth playback on flaky networks\n\n"
        "  -- METADATA + RECS --\n"
        "  [Device] -> [Catalog API] -> [Cassandra]\n"
        "                            -> [Redis recommendations]\n"
        "  [Batch job nightly] computes recs per user from watch history -> writes Redis",
        "Netflix: ingestion transcodes master files into multi-bitrate HLS/DASH segments, pushes to ISP-edge OCAs; playback fetches segments from the nearest OCA with adaptive bitrate switching.",
        "A diagram of Netflix's architecture. The ingestion and transcoding pipeline: studios upload master mezzanine files to an S3 source bucket; transcode workers run parallel FFmpeg jobs producing 15 encodings (5 resolutions x 3 codecs), segment them into 10-second chunks, DRM-encrypt them with Widevine or FairPlay, and package them as HLS or DASH manifests. The encodings are stored in an S3 bucket and pushed to Open Connect Appliances (OCAs) located inside ISP networks. The playback path: a device requests playback start from the Playback Service, receiving a manifest URL and CDN node hint; the device's player uses DNS-based routing to choose the nearest OCA, then fetches HLS segments. The adaptive bitrate algorithm probes bandwidth with the first segment, fetches a low-resolution segment, switches up if throughput is high, and switches down on rebuffers. A separate metadata path serves catalog and pre-computed recommendations, with a nightly batch job computing personalized top-N recommendations per user from watch history and writing them to Redis."),
    prose("deep-dive",
        "**Deep dive: adaptive bitrate streaming and the Open Connect CDN.**\n\n"
        "**Why ABR exists.** A user's bandwidth fluctuates constantly — WiFi interference, "
        "cellular handoff, household members streaming. If Netflix sent a fixed 5 Mbps "
        "stream and the user's throughput dropped to 2 Mbps, the player would rebuffer "
        "(stall). ABR (Adaptive Bitrate) solves this by splitting the video into 2-10s "
        "segments at multiple bitrates (240p, 480p, 720p, 1080p, 4K) and letting the "
        "player switch on the fly.\n\n"
        "**ABR algorithm.** A typical ABR player (e.g. dash.js, Shaka):\n"
        "1. Fetch the manifest, list available bitrates.\n"
        "2. Start with the lowest bitrate segment (fast time-to-first-frame).\n"
        "3. Measure throughput while fetching.\n"
        "4. Estimate next-segment bandwidth = EWMA of recent throughput.\n"
        "5. Pick the highest bitrate whose bandwidth <= 0.7 x estimated throughput "
        "(0.7 buffer factor avoids edge-of-cliff rebuffers).\n"
        "6. Maintain a buffer of ~10s ahead so brief throughput dips don't rebuffer.\n\n"
        "**Why Netflix built Open Connect.** In 2011-2012, Netflix used third-party CDNs "
        "(Akamai, Limelight, Level3). At Netflix's scale (~30% of US internet traffic), "
        "generic CDNs couldn't economically deliver, and Netflix wanted more control over "
        "where bytes were cached (e.g. pre-position new episodes on edges before release). "
        "Open Connect: Netflix ships physical appliances (OCAs) into ISP data centers. "
        "Each OCA holds 100 TB - 2 PB. ISPs get free peering (Netflix traffic doesn't "
        "traverse their paid transit); Netflix gets free edge capacity. Win-win.\n\n"
        "**OCA fill strategy.** New content is pushed to OCAs proactively (before release) "
        "based on predicted demand. Popular content is on every OCA; long-tail content is "
        "served from regional origins on cache miss.\n\n"
        "**Transcoding pipeline.** Master mezzanine files (huge, ~10s of GB per title) are "
        "transcoded in parallel on AWS EC2 spot instances. Each encoding is a separate FFmpeg "
        "job; 15 encodings per title takes hours but is done once at ingestion. AV1 codec "
        "(newer, ~30% smaller than HEVC) is transcoded last because it's 10x slower.\n\n"
        "**DRM.** Every segment is encrypted (Widevine for Android/Chrome, FairPlay for "
        "iOS/Safari, PlayReady for Windows). The Playback Service issues a short-TTL license "
        "to the device; the device decrypts on playback. Without a license, segments are "
        "useless bytes."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **OCA cache miss.** A user requests a long-tail title not on their local OCA. "
        "*Mitigation*: OCA fetches from regional origin (adds 50-200ms latency for the "
        "first segment); after that, cached.\n\n"
        "- **ISP outage.** An ISP's OCA goes offline; users in that ISP fall back to a "
        "regional origin. *Mitigation*: regional origins have capacity; DNS health checks "
        "redirect users.\n\n"
        "- **Release-day spike.** A new Stranger Things episode drops; everyone tries to "
        "watch at once. *Mitigation*: pre-position the episode on every OCA 24h before "
        "release; warm edge caches.\n\n"
        "- **ABR over-reaction.** The player sees a brief throughput dip and switches down "
        "to 240p, then back up — visible quality flicker. *Mitigation*: ABR algorithms "
        "(e.g. BOLA, MPC) use buffer-aware logic to avoid flapping.\n\n"
        "- **DRM license server failure.** Without a license, no playback. *Mitigation*: "
        "license servers are HA multi-region; client caches license for the session.\n\n"
        "- **Transcoding bottleneck.** AV1 transcode is 10x slower than HEVC; a new "
        "title can take days to fully transcode. *Mitigation*: parallelize across "
        "thousands of spot instances; accept that AV1 lags other codecs by weeks.\n\n"
        "- **Recommendations freshness.** Recs are recomputed nightly; a user who binge-"
        "watches a show may see stale recs the next day. *Mitigation*: trigger a rec "
        "recompute on significant watch events.\n\n"
        "- **Subtitle / audio track load.** A title with 30 subtitle languages and 10 "
        "audio tracks has 300 track combinations. *Mitigation*: subtitles and audio are "
        "stored as separate tracks; the player fetches only the one selected."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*CDN scaling.* Open Connect scales by adding more OCAs inside ISPs. Each OCA is a "
        "commodity x86 server with disks; Netflix ships them free to ISPs.\n\n"
        "*Transcoding scaling.* Parallelize per (title, resolution, codec) job on spot "
        "instances. Cost-optimized: run on spot, retry on eviction.\n\n"
        "*Catalog scaling.* 100K titles is small for a database; even 10M titles would fit "
        "in a sharded Postgres. The bottleneck is search and discovery, not storage.\n\n"
        "*Recommendations scaling.* Pre-compute top-N per user nightly using Spark. 250M "
        "users x 1000 watched items x cosine similarity = trillions of operations, but "
        "Spark handles it in hours.\n\n"
        "*Multi-region.* Catalog and metadata are globally replicated. Streaming is "
        "inherently regional (each user's nearest OCA).\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose Open Connect (own CDN) — **gained** cost control and edge caching "
        "policy, **lost** the operational simplicity of a managed CDN.\n"
        "- We chose HLS/DASH segments of 10s — **gained** fine-grained ABR switching, "
        "**lost** segment overhead (more HTTP requests) and slight latency.\n"
        "- We chose multi-codec (H.264 + HEVC + AV1) — **gained** bandwidth savings "
        "(AV1 is 30% smaller), **lost** transcoding cost and storage.\n"
        "- We chose pre-computed recommendations nightly — **gained** fast reads, "
        "**lost** freshness (recs up to 24h stale).\n"
        "- We chose DRM on every segment — **gained** content protection (studios "
        "require it), **lost** license-server dependency for playback."),
    quiz("q1",
        "Why does Netflix split videos into 10-second segments at multiple bitrates?",
        ["To make seek/scrub responsive — only the segments after the seek point need to be re-fetched.",
         "To allow adaptive bitrate streaming — the player switches bitrate per segment based on observed throughput, preventing rebuffers on flaky networks.",
         "To reduce storage cost.",
         "To make transcoding parallelizable."],
        1,
        "Adaptive Bitrate Streaming (ABR) splits video into 2-10s segments, each available at multiple bitrates (240p to 4K). The player continuously measures throughput and picks the highest bitrate it can sustain without rebuffers. Without segments, a 2-hour movie is one giant file; the player can't switch quality mid-stream. Segments also make seek responsive (only fetch segments after the seek point) and make transcoding parallelizable (each segment is an independent FFmpeg job). The PRIMARY reason for ABR is bandwidth adaptation; the other benefits are side effects.",
        "interview"),
    quiz("q2",
        "Why did Netflix build its own CDN (Open Connect) instead of using Akamai/Cloudflare?",
        ["Generic CDNs were too slow for video.",
         "At ~30% of US internet traffic, generic CDNs were uneconomical; Netflix wanted control over edge caching (e.g. pre-positioning new episodes) and got free ISP peering by placing appliances inside ISPs.",
         "Open Connect is cheaper to operate than paying Akamai.",
         "Akamai refused to serve Netflix."],
        1,
        "Netflix's traffic is so large that commercial CDN pricing was prohibitive — they would have been Akamai's largest customer by far, with little negotiation leverage. By building Open Connect, Netflix (a) pays only for the hardware (a one-time cost), (b) gets free peering with ISPs (because the OCA is INSIDE the ISP, traffic doesn't transit paid links), (c) controls caching policy (can pre-position a new Stranger Things episode on every edge 24h before release), and (d) eliminates a single-vendor risk. Generic CDNs are NOT slower (option A is wrong); they just don't make economic sense at this scale.",
        "interview"),
]

w("design-netflix",
  "Design Netflix",
  "Design Netflix at 250M subscribers, 30% of US internet traffic. Covers the transcoding pipeline (master mezzanine -> 15 encodings per title -> HLS/DASH segments -> DRM), the Open Connect CDN (appliances inside ISPs), adaptive bitrate streaming (player switches bitrate per segment based on throughput), and pre-computed recommendations refreshed nightly. The deep dive walks through why Netflix built its own CDN and how ABR works.",
  "Netflix is the canonical video-streaming design. The patterns — segment-based ABR, multi-codec transcoding, edge-appliance CDN, DRM — are reusable for any video product (Disney+, HBO Max, Prime Video). The Open Connect story is also a masterclass in scale economics: when you're a third of all internet traffic, the standard managed-CDN model stops working and you must build your own.",
  ["cdn", "object-storage"],
  ["design-youtube"],
  35, "interview",
  netflix_blocks,
  ["Adaptive bitrate (segment switching) handles flaky networks gracefully.",
   "Open Connect (appliances inside ISPs) gives free peering and edge caching control.",
   "Multi-codec (H.264/HEVC/AV1) saves 30% bandwidth for capable devices.",
   "Pre-computed nightly recommendations keep reads fast."],
  ["Open Connect is operationally complex — physical appliances, ISP relationships.",
   "AV1 transcoding is 10x slower than HEVC — new titles lag in AV1 by weeks.",
   "Recommendations are up to 24h stale.",
   "DRM license server is a playback dependency."],
  ["OCA cache miss on long-tail titles — needs regional origin fallback.",
   "ISP / OCA outage — needs DNS health-check redirect to regional origin.",
   "Release-day spike — needs proactive pre-positioning on edges 24h before.",
   "ABR over-reaction causing quality flicker — needs buffer-aware algorithms (BOLA/MPC).",
   "DRM license server failure — needs multi-region HA + client-side license cache."],
  ["Serving a single giant video file instead of segmented HLS/DASH — no ABR possible.",
   "Using a managed CDN at Netflix's scale — uneconomical.",
   "Single-codec encoding — wastes bandwidth for capable devices.",
   "Computing recommendations on read — blows latency budget.",
   "Single-region DRM license server — playback breaks on regional outage."],
  ["Netflix",
   "Disney+",
   "HBO Max / Max",
   "Amazon Prime Video",
   "Hulu"],
  ["Design Netflix. How do you handle 30% of US internet traffic?",
   "Why does Netflix use 10-second video segments at multiple bitrates?",
   "Why did Netflix build Open Connect instead of using Akamai?",
   "How does the player switch video quality during playback?"],
  [{"system": "Netflix Open Connect", "how": "Custom CDN with physical appliances (OCAs) inside ISP data centers. Netflix handles origin and transcoding on AWS; OCAs serve bytes from inside ISPs. Documented in their tech blog."},
   {"system": "HLS / DASH", "how": "Open standards for ABR streaming. HLS (HTTP Live Streaming, Apple) uses .m3u8 manifests + .ts segments. DASH (Dynamic Adaptive Streaming over HTTP, MPEG) uses .mpd manifests + .m4s segments."},
   {"system": "Disney+ Hotstar", "how": "India-scale streaming (100M+ concurrent viewers for cricket). Uses Akamai + multi-CDN strategy and aggressive pre-warming for live events."}])

print("Done with Netflix")


# =========================================================================
# 11. YOUTUBE
# =========================================================================
youtube_blocks = [
    prose("problem",
        "**What are we designing?** YouTube — a user-generated video sharing platform at "
        "massive scale. Anyone can upload a video; the system transcodes it into multiple "
        "resolutions/codecs, serves it to viewers via adaptive bitrate streaming, indexes "
        "it for search, and recommends related videos. Unlike Netflix (curated, ~100K "
        "titles), YouTube is UGC: 500 hours of video uploaded per minute, with wildly "
        "varying quality and popularity.\n\n"
        "The defining challenges: **massive ingestion volume** (transcoding 500 "
        "hours/minute of uploads in real time), **long-tail access patterns** (most videos "
        "get <1000 views; a few go viral), and **search + recommendation** over billions of "
        "videos."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Upload a video (any size, any format).\n"
        "- Watch a video on demand; supports quality selection, scrub, captions.\n"
        "- Like, comment, subscribe.\n"
        "- Search by title / description / tags.\n"
        "- 'Up next' recommendations.\n"
        "- Live streaming (a stretch goal).\n\n"
        "**Non-functional requirements.**\n"
        "- **Upload-to-available**: < 5 min for a 10-min video (transcode pipeline).\n"
        "- **Time-to-first-frame**: < 2 s for playback.\n"
        "- **Availability**: 99.99%.\n"
        "- **Scale**: 2B+ users, 1B hours watched/day, 500 hours uploaded/minute.\n\n"
        "**Non-goals.** No YouTube TV, no Shorts (separate vertical), no community posts."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Uploads.* 500 hours/minute = 30K hours/hour = 720K hours/day. At ~1 GB/hour "
        "raw (compressed HD), 720K GB/day = 720 TB/day of raw uploads = ~260 PB/year.\n\n"
        "*Transcoding.* Each video is transcoded into ~5 resolutions x 2 codecs = 10 "
        "encodings. So 7.2 PB/day of transcoded output. With 10x for transcode compute "
        "(CPU-hours per video hour), this is ~7M CPU-hours/day — distributed across "
        "thousands of worker instances.\n\n"
        "*Watch volume.* 1B hours/day watched. At ~3 Mbps average stream = ~1.4 EB/day "
        "of egress. YouTube is ~10% of global internet traffic.\n\n"
        "*Storage.* 720K hours/day raw + 7.2 PB transcoded = ~8 PB/day new content. After "
        "3 years: ~9 EB. Stored on cold object storage (GCS) for originals; transcoded "
        "encodings on hot object storage and CDN edges.\n\n"
        "*Metadata.* Each video ~10KB (title, description, tags, uploader, ts). 720K "
        "uploads/day = 7.2 GB/day metadata = ~2.6 TB/year. Search index ~5x that = 13 TB/year.\n\n"
        "*Search.* 3B+ queries/day globally."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/upload/start          -> { upload_id, presigned_url_parts[] }   (multipart)\n"
        "POST /v1/upload/complete        (upload_id)  -> kicks off transcoding\n"
        "GET  /v1/videos/:id             -> metadata, available resolutions, captions\n"
        "GET  /v1/playback/:id           -> manifest_url (HLS/DASH) + ad markers\n"
        "POST /v1/videos/:id/like\n"
        "POST /v1/videos/:id/comments\n"
        "POST /v1/users/:id/subscribe\n"
        "GET  /v1/search?q=...&type=video\n"
        "GET  /v1/recommendations         -> 'up next' list for the current user+video\n"
        "```\n\n"
        "Upload uses **resumable multipart upload** to GCS / S3 — each part can retry "
        "independently, and the upload can pause/resume across network blips."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Videos* (sharded SQL):\n"
        "```\n"
        "videos (id BIGINT PK, uploader_id, title, description, tags JSON,\n"
        "       duration_sec, upload_status ENUM('uploading','transcoding','ready','failed'),\n"
        "       view_count, like_count, created_at)\n"
        "INDEX (uploader_id, created_at DESC)\n"
        "FULLTEXT(title, description, tags)\n"
        "```\n\n"
        "*Encodings* (object storage):\n"
        "```\n"
        "encodings (id, video_id, resolution, codec, bitrate_kbps, manifest_url)\n"
        "```\n\n"
        "*Comments* (Cassandra, partitioned by video_id):\n"
        "```\n"
        "comments (video_id, comment_id TIMEUUID, author_id, text, like_count, ts,\n"
        "          PRIMARY KEY ((video_id), comment_id))\n"
        "```\n\n"
        "*Subscriptions* (sharded SQL):\n"
        "```\n"
        "subscriptions (subscriber_id, channel_id, created_at,\n"
        "               PRIMARY KEY (subscriber_id, channel_id))\n"
        "INDEX (channel_id)   -- for 'who subscribes to me'\n"
        "```\n\n"
        "*Search index* (Elasticsearch, fed by Kafka from uploads):\n"
        "```\n"
        "video_search: { video_id, title, description, tags, view_count, ts }\n"
        "```\n\n"
        "*Recommendations* (pre-computed per user in Redis):\n"
        "```\n"
        "key: recs:{user_id}:{seed_video_id}\n"
        "value: LIST of video_ids   -- context-aware recs\n"
        "TTL:   1h\n"
        "```"),
    diagram("arch",
        "  -- UPLOAD + TRANSCODE PIPELINE --\n"
        "  [Uploader] --(1) start upload--> [Upload Service] -> presigned GCS URLs\n"
        "       |\n"
        "       | (2) client uploads parts directly to GCS (resumable, multipart)\n"
        "       v\n"
        "  [GCS raw bucket]\n"
        "       |\n"
        "       | (3) Upload Service publishes 'video.uploaded' to Kafka\n"
        "       v\n"
        "  [Transcode Orchestrator] consumes Kafka, splits video into N chunks\n"
        "       |\n"
        "       v\n"
        "  [Transcode Workers (autoscaled)]\n"
        "       - per (chunk, resolution, codec) FFmpeg job\n"
        "       - 10 encodings per video\n"
        "       - generate HLS segments + manifests\n"
        "       - generate thumbnails + captions (speech-to-text)\n"
        "       |\n"
        "       v\n"
        "  [GCS transcoded bucket] -> [CDN edge cache]\n"
        "       |\n"
        "       | (4) mark video 'ready', index into Elasticsearch\n"
        "       v\n"
        "  -- PLAYBACK PATH --\n"
        "  [Viewer] -> /playback/:id -> [Playback Service] -> manifest_url + CDN hint\n"
        "       |\n"
        "       v\n"
        "  [CDN edge] serves HLS segments with ABR\n"
        "       |\n"
        "       v\n"
        "  Smooth playback\n\n"
        "  -- SEARCH + RECS --\n"
        "  [Viewer] -> /search -> [Search Service] -> [Elasticsearch]\n"
        "            -> /recs  -> [Rec Service]   -> Redis (pre-computed)",
        "YouTube: upload via resumable multipart to GCS, async transcode pipeline (10 encodings per video), playback via CDN with ABR, search via Elasticsearch, recommendations pre-computed in Redis.",
        "A diagram of YouTube's architecture. The upload and transcode pipeline: an uploader starts an upload through the Upload Service, which returns presigned GCS URLs. The client uploads parts directly to GCS using resumable multipart upload. When the upload completes, the Upload Service publishes a video-uploaded event to Kafka. A Transcode Orchestrator consumes the event, splits the video into chunks, and dispatches per-chunk FFmpeg jobs to autoscaled Transcode Workers. Each worker produces 10 encodings per video (5 resolutions x 2 codecs), generates HLS segments and manifests, thumbnails, and captions via speech-to-text. The transcoded output goes to a GCS bucket and is pushed to CDN edge caches. The video is marked ready and indexed into Elasticsearch. The playback path: a viewer requests playback, the Playback Service returns a manifest URL and CDN hint, the viewer fetches HLS segments from the CDN with adaptive bitrate. Search and recommendations: search queries go through a Search Service to Elasticsearch; recommendation requests go through a Rec Service to Redis where pre-computed recs are stored."),
    prose("deep-dive",
        "**Deep dive: the transcoding pipeline and adaptive streaming.**\n\n"
        "**Why transcoding is hard at YouTube's scale.** 500 hours uploaded per minute "
        "means 500 hours of CPU work per minute (transcoding is roughly 1:1 real-time on "
        "a single core). To keep up, YouTube runs thousands of transcode workers (likely "
        "tens of thousands of CPU cores). Each video is split into N chunks (e.g. 10s "
        "each); each chunk is transcoded independently and in parallel. A 10-min video = "
        "60 chunks, each transcoded in parallel — total wall-clock time ~10s per encoding.\n\n"
        "**The 10-encodings-per-video problem.** Each video is encoded in:\n"
        "- 5 resolutions: 144p, 360p, 720p, 1080p, 4K\n"
        "- 2 codecs: H.264 (universal), VP9/AV1 (saves 30-50% bandwidth on capable devices)\n"
        "= 10 encodings per video. With 720K hours uploaded/day, that's 7.2M hours of "
        "transcoded output per day. YouTube does this with a huge fleet of spot/preemptible "
        "instances.\n\n"
        "**Chunked upload + resumable.** A 1-hour 4K video is ~7 GB. If the upload fails "
        "at 99%, restarting from zero is unacceptable. YouTube uses GCS resumable upload "
        "(multipart): the client uploads the file in parts; each part can retry "
        "independently; the upload can pause and resume across hours.\n\n"
        "**Adaptive bitrate playback.** Same as Netflix: HLS/DASH with 10s segments; "
        "player switches bitrate based on throughput. YouTube adds VP9/AV1 segments for "
        "capable devices, saving bandwidth (and YouTube's bandwidth bill).\n\n"
        "**Search indexing.** Every upload publishes a Kafka event; an indexer writes the "
        "video's title, description, tags, and channel to Elasticsearch. Search returns "
        "video_ids; the player fetches metadata separately. View count is a ranking signal "
        "(boosted in the index periodically).\n\n"
        "**Recommendations.** YouTube's recommendation model is famously a deep neural "
        "net over user history and video features. For our design: a candidate generator "
        "produces 500 candidate videos per (user, seed_video) pair from collaborative "
        "filtering; a ranker scores them with a DNN; top 20 are cached in Redis with a "
        "1-hour TTL. The ranker weighs signals like watch time (not just clicks), recency, "
        "and channel affinity.\n\n"
        "**Captions.** Auto-generated via speech-to-text (Whisper-style models) on the "
        "transcode worker. Captions are stored as WebVTT files served alongside segments."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **Transcode backlog.** A viral spike in uploads saturates the worker pool; new "
        "videos take 30+ minutes to become watchable. *Mitigation*: autoscale on queue "
        "depth; pre-emptible instances for capacity headroom; serve a low-res preview from "
        "the raw upload while transcoding.\n\n"
        "- **Viral video hot edge.** A new viral video gets 10M views in an hour; the CDN "
        "edge that first serves it saturates. *Mitigation*: CDN multi-tier caching; "
        "replicate to multiple edges; serve from origin on edge miss.\n\n"
        "- **Comment hotspot.** A viral video's comments table gets 100K writes/sec to "
        "one Cassandra partition. *Mitigation*: shard comments by sub-partition "
        "(video_id, comment_id_range).\n\n"
        "- **Elasticsearch index lag.** Recent uploads aren't searchable for 5-30s. "
        "*Mitigation*: accept it; show 'this video is being indexed' for the uploader.\n\n"
        "- **Search index size.** Billions of videos = petabyte-scale ES cluster. "
        "*Mitigation*: shard by year (recent videos get more replicas); archive old videos "
        "to a cold index.\n\n"
        "- **Storage cost.** 8 PB/day of new content is expensive. *Mitigation*: tiered "
        "storage (hot for popular, cold for long-tail); deduplicate identical encodings "
        "across formats; delete failed/copyright-taken-down uploads after grace period.\n\n"
        "- **Live streaming.** Live is a fundamentally different workload (no transcoding "
        "ahead of time; transcode on the fly). *Mitigation*: separate live pipeline with "
        "lower latency targets; HLS-LL or WebRTC for sub-second latency.\n\n"
        "- **Copyright / content moderation.** Every upload must be checked against a "
        "fingerprint database (Content ID). *Mitigation*: fingerprint on transcode; "
        "compare against Content ID DB; flag matches for review."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Transcoding scaling.* Spot/preemptible instances autoscaled on queue depth. "
        "Each worker pulls jobs from Kafka, transcodes a chunk, uploads to GCS.\n\n"
        "*CDN scaling.* Multi-tier CDN: edge caches (closest to users) -> regional caches "
        "-> origin (GCS). Popular videos propagate up the tiers; long-tail content stays "
        "near origin.\n\n"
        "*Search scaling.* Elasticsearch sharded by video_id hash, with time-based "
        "rollover indices. Old indices (videos >1 year) get fewer replicas (less queried).\n\n"
        "*Storage scaling.* GCS / S3 with lifecycle policies: hot for first 30 days, "
        "nearline for 30-365 days, coldline after 1 year. Re-hydrate on view.\n\n"
        "*Multi-region.* Uploads go to the nearest region; transcoded encodings are "
        "replicated globally. Search and recs run per-region.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose async transcoding — **gained** fast upload responses, **lost** "
        "instant playback (5-min delay for new videos).\n"
        "- We chose multi-codec (H.264 + VP9/AV1) — **gained** bandwidth savings, "
        "**lost** 2x transcoding cost.\n"
        "- We chose ES for search — **gained** flexible ranking, **lost** a finicky "
        "operational system at petabyte scale.\n"
        "- We chose pre-computed recs with 1h TTL — **gained** fast reads, **lost** "
        "freshness (a brand-new viral video won't appear in recs for up to 1h).\n"
        "- We chose chunk-based transcoding — **gained** parallelism, **lost** the "
        "ability to seek within a not-yet-complete video."),
    quiz("q1",
        "YouTube receives 500 hours of uploads per minute. How can transcoding keep up?",
        ["Use a single huge FFmpeg cluster that processes sequentially.",
         "Split each video into chunks, transcode chunks in parallel across thousands of autoscaled workers, with each chunk being an independent FFmpeg job.",
         "Skip transcoding and serve the raw upload.",
         "Use a queue with one worker per video."],
        1,
        "500 hours of uploads per minute requires ~500 CPU-hours of transcoding per minute (transcoding is ~1:1 real-time on one core). Splitting each video into chunks (e.g. 10s each) means a 10-minute video becomes 60 independent FFmpeg jobs, each finishing in ~10s wall-clock time. With thousands of workers in an autoscaled fleet (spot instances for cost), YouTube can sustain the ingestion rate. Sequential processing (option A) would never keep up; one worker per video (option D) underutilizes parallelism within long videos; serving raw (option C) breaks ABR.",
        "interview"),
    quiz("q2",
        "A user uploads a 1-hour 4K video (~7 GB) and the upload fails at 99%. What upload strategy prevents restarting from zero?",
        ["Use a single PUT request with a long timeout.",
         "Use resumable multipart upload — the file is split into parts; each part can retry independently; completed parts are not re-sent on retry.",
         "Compress the video on the client before uploading.",
         "Use UDP for faster uploads."],
        1,
        "Resumable multipart upload (a feature of S3/GCS) splits the file into parts (e.g. 5-100 MB each); each part is uploaded via its own presigned URL and can be retried independently. The object storage server tracks which parts have arrived. On retry, the client asks 'which parts are missing?' and only re-uploads those. If the network drops at 99%, only the last partial part is re-sent. This is essential for large video uploads over flaky mobile networks. Single PUT (option A) would restart from zero on any failure; UDP (option D) doesn't give reliable upload.",
        "solid"),
]

w("design-youtube",
  "Design YouTube",
  "Design YouTube at 2B users, 500 hours uploaded/minute. Covers resumable multipart upload to GCS, a chunked parallel transcoding pipeline producing 10 encodings per video (5 resolutions x 2 codecs), HLS/DASH adaptive bitrate playback via multi-tier CDN, search via Elasticsearch fed async by Kafka, and recommendation ranking via a candidate-then-rank two-stage model with pre-computed top-N cached in Redis. The deep dive walks through how transcoding keeps up with 500 hours/minute.",
  "YouTube is the canonical UGC video design. The patterns — chunked transcoding for parallelism, multi-codec encoding for bandwidth savings, multi-tier CDN, async search indexing — are reusable for any video product at scale (TikTok, Vimeo, Twitch VODs). The transcoding pipeline is also a masterclass in embarrassingly-parallel workload design: split the work, fan out, gather.",
  ["cdn", "object-storage"],
  ["design-netflix"],
  35, "interview",
  youtube_blocks,
  ["Chunked parallel transcoding keeps up with 500 hours/min of uploads.",
   "Resumable multipart upload handles multi-GB videos on flaky networks.",
   "Multi-codec (H.264 + VP9/AV1) saves 30-50% bandwidth on capable devices.",
   "Two-stage recommendation (candidate generation then ranking) is the standard pattern."],
  ["Transcode backlog on upload spikes — needs autoscaling + spot capacity.",
   "Long-tail videos stay near origin (CDN miss) — slower first-byte for rare videos.",
   "Petabyte-scale Elasticsearch is operationally hard.",
   "Recommendations have a freshness lag (1h TTL on cached recs)."],
  ["Viral video saturating one CDN edge — needs multi-tier CDN with replication.",
   "Comment hotspot on viral videos — needs Cassandra sub-partitioning.",
   "Transcode backlog — needs autoscaling on queue depth.",
   "Search index lag (5-30s) for brand-new uploads.",
   "Live streaming fundamentally different — needs separate low-latency pipeline."],
  ["Single PUT upload for large videos — fails catastrophically on network blip.",
   "Sequential per-video transcoding — can't keep up with 500 hours/min.",
   "Single-codec encoding — wastes bandwidth on capable devices.",
   "On-read recommendations — blows latency budget.",
   "Single Elasticsearch cluster for billions of videos — no sharding strategy."],
  ["YouTube (Google)",
   "TikTok (UGC video at scale)",
   "Vimeo",
   "Twitch VODs",
   "Dailymotion"],
  ["Design YouTube. How do you transcode 500 hours of uploads per minute?",
   "A user uploads a 7 GB 4K video and the upload fails at 99%. How do you prevent restarting from zero?",
   "How do you make search not block the upload pipeline?",
   "A video goes viral and saturates one CDN edge. What do you do?"],
  [{"system": "YouTube", "how": "GCS resumable upload, chunked parallel transcoding on Borg/GKE, multi-tier CDN, VP9/AV1 codecs, deep-learning recommendations. Documented in Google research papers."},
   {"system": "TikTok", "how": "Similar ingestion pipeline; shorter videos mean transcoding is faster per video but the upload rate is 10x higher. Recommendations heavily weighted toward watch completion rate."},
   {"system": "Vimeo", "how": "Smaller scale but higher per-video quality focus. Uses AWS MediaConvert for transcoding, CloudFront CDN."}])

print("Done with YouTube")


# =========================================================================
# 12. NOTIFICATION SYSTEM
# =========================================================================
notif_blocks = [
    prose("problem",
        "**What are we designing?** A multi-channel notification system: one trigger (e.g. "
        "'user X commented on your post') fans out to email, SMS, push, and in-app "
        "channels. Marketing campaigns blast millions of users; transactional alerts "
        "send to one user with strict latency. The system must respect user preferences "
        "(do not email at 3am), per-channel rate limits (Twitter allows 320 DM/hour), "
        "and template rendering (different content per channel / locale).\n\n"
        "The defining challenges are **fan-out at scale** (a single campaign sends to "
        "10M users across 3 channels = 30M deliveries) and **multi-channel coordination** "
        "(don't email AND SMS the same user for the same event unless they've opted in)."),
    prose("requirements",
        "**Functional requirements.**\n"
        "- Send a notification via any of: email, SMS, push, in-app.\n"
        "- Fan out a single event to multiple channels (one-to-many).\n"
        "- Send bulk campaigns (e.g. marketing email to 10M users).\n"
        "- Respect user preferences (per-channel opt-in, quiet hours).\n"
        "- Per-channel rate limiting (e.g. SMS 1/user/hour).\n"
        "- Templates with variables (e.g. 'Hi {{name}}, your order #{{order_id}} shipped').\n"
        "- Delivery status tracking (sent, delivered, failed, bounced).\n"
        "- Retry with exponential backoff on failures.\n\n"
        "**Non-functional requirements.**\n"
        "- **Transactional latency**: < 5 s from trigger to channel handoff.\n"
        "- **Campaign throughput**: 1M notifications/min sustained.\n"
        "- **Availability**: 99.95% (transactional notifications are critical — payment "
        "alerts, security warnings).\n"
        "- **At-least-once delivery**: no lost notifications; duplicates are tolerable.\n"
        "- **Compliance**: CAN-SPAM, GDPR opt-out, TCPA for SMS.\n\n"
        "**Non-goals.** No ML-driven send-time optimization, no A/B testing of subject lines."),
    prose("capacity",
        "**Capacity estimation.**\n\n"
        "*Volume.* Assume 1B notifications/day globally across channels.\n"
        "- Email: 700M/day (bulk marketing dominates).\n"
        "- Push: 250M/day.\n"
        "- SMS: 30M/day (expensive; transactional only).\n"
        "- In-app: 20M/day (webhook delivered).\n\n"
        "*Peak.* Marketing campaigns blast 1-10M notifications in a few minutes. "
        "Sustained throughput target: 1M/min = 17K/sec.\n\n"
        "*Storage.* Each notification record ~500 bytes (recipient, template_id, "
        "rendered_content, status, ts). 1B/day x 500B = 500 GB/day. 30-day retention "
        "= 15 TB. Fits in Cassandra.\n\n"
        *External limits.*\n"
        "- SES / SendGrid: ~10K emails/sec per account; we shard across multiple accounts.\n"
        "- APNs / FCM: ~10K pushes/sec per app; shard across multiple sender IDs.\n"
        "- Twilio SMS: pay-per-message; throughput tiered.\n\n"
        "*Template storage.* ~10K templates x 5KB = 50 MB. Trivial; cached in Redis."),
    prose("apis",
        "**APIs.**\n\n"
        "```\n"
        "POST /v1/notify\n"
        "  body: { user_id, event_type, channels: ['email','push'],\n"
        "         template_id, variables: {name, order_id}, priority: 'transactional'|'bulk' }\n"
        "  -> { notification_id, accepted_channels[] }\n\n"
        "POST /v1/campaigns      (start a bulk send to a segment)\n"
        "GET  /v1/notifications/:id/status\n"
        "PUT  /v1/preferences/:user_id   (per-channel opt-ins, quiet hours)\n"
        "POST /v1/templates       (admin: create or update template)\n"
        "```\n\n"
        "Transactional notifications go through a high-priority queue; bulk campaigns go "
        "through a separate low-priority queue so they don't starve transactional alerts."),
    prose("data-model",
        "**Data model.**\n\n"
        "*Notifications* (Cassandra, partitioned by recipient_id):\n"
        "```\n"
        "notifications (\n"
        "  notification_id TIMEUUID,\n"
        "  recipient_id    BIGINT,\n"
        "  event_type      TEXT,\n"
        "  template_id     TEXT,\n"
        "  variables       JSON,\n"
        "  channels        LIST<TEXT>,   -- ['email','push']\n"
        "  status          ENUM('queued','sent','delivered','failed','bounced'),\n"
        "  priority        ENUM('transactional','bulk'),\n"
        "  created_at      TIMESTAMP,\n"
        "  PRIMARY KEY ((recipient_id), notification_id)\n"
        ")\n"
        "```\n\n"
        "*User preferences* (sharded SQL):\n"
        "```\n"
        "preferences (\n"
        "  user_id BIGINT PK,\n"
        "  email_opt_in BOOL, sms_opt_in BOOL, push_opt_in BOOL,\n"
        "  quiet_hours_start TIME, quiet_hours_end TIME,\n"
        "  timezone TEXT\n"
        ")\n"
        "```\n\n"
        "*Templates* (sharded SQL, cached in Redis):\n"
        "```\n"
        "templates (\n"
        "  id VARCHAR PK, name, channel ENUM('email','sms','push','inapp'),\n"
        "  subject TEXT, body TEXT, locale VARCHAR,\n"
        "  version INT, updated_at TIMESTAMP\n"
        ")\n"
        "```\n\n"
        "*Rate limit counters* (Redis, sliding window):\n"
        "```\n"
        "key: rl:email:{user_id}     value: ZSET of send timestamps\n"
        "key: rl:sms:{user_id}       value: ZSET of send timestamps\n"
        "key: rl:push:{user_id}      value: ZSET of send timestamps\n"
        "```"),
    diagram("arch",
        "  [Trigger Source: app, cron, event]\n"
        "        |\n"
        "        v\n"
        "  [Notification API]\n"
        "        |\n"
        "        | (1) validate + render template + check preferences\n"
        "        v\n"
        "  [Queue: transactional]   [Queue: bulk]\n"
        "        |                       |\n"
        "        v                       v\n"
        "  [Channel Router]              (lower priority, throttled)\n"
        "        |\n"
        "        +--------+--------+--------+\n"
        "        |        |        |        |\n"
        "        v        v        v        v\n"
        "  [Email   [SMS     [Push    [In-App\n"
        "  Worker]  Worker]  Worker] Worker]\n"
        "        |        |        |        |\n"
        "        v        v        v        v\n"
        "  [SES/    [Twilio] [APNs/   [WebSocket\n"
        "   SendGrid]        FCM]     /pubsub]\n"
        "        |        |        |        |\n"
        "        +--------+--------+--------+\n"
        "        |\n"
        "        v\n"
        "  [Status Tracker]\n"
        "  - updates notification status\n"
        "  - handles bounces (mark user as undeliverable)\n"
        "  - feeds analytics\n\n"
        "  -- Rate limit + preference plane --\n"
        "  [Redis: rl:{channel}:{user_id} + prefs cache]\n"
        "  [SQL: user preferences, templates]",
        "Notification system: triggers go to API which validates, renders, and routes to per-channel workers; rate limits and preferences checked at the router; status tracker records delivery.",
        "A diagram of a multi-channel notification system. A trigger source (an application, a cron job, or an event) calls the Notification API, which validates the request, renders the template, and checks user preferences. The notification is published to either a transactional queue (high priority) or a bulk queue (throttled, lower priority). A Channel Router consumes from the queues and fans out to per-channel workers: an Email Worker that sends via SES or SendGrid, an SMS Worker that sends via Twilio, a Push Worker that sends via APNs or FCM, and an In-App Worker that delivers via WebSocket or pubsub. Each worker updates a Status Tracker that records delivery, handles bounces by marking users as undeliverable, and feeds analytics. A separate rate-limit and preference plane runs in Redis with per-channel-per-user counters, plus a SQL store for user preferences and templates."),
    prose("deep-dive",
        "**Deep dive: fan-out, templates, rate limiting, and quiet hours.**\n\n"
        "**Channel routing.** A notification request specifies which channels to use "
        "('email,push'). The router fetches user preferences and filters out opted-out "
        "channels. Then for each remaining channel, it creates a child job in that channel's "
        "queue.\n\n"
        "**Template rendering.** Templates use Mustache / Handlebars syntax with variables "
        "from the trigger ('Hi {{name}}, your order {{order_id}} shipped'). Rendering must "
        "happen BEFORE enqueueing so workers don't have to fetch the template per-message. "
        "We render at API time and store the rendered text in the notification record.\n\n"
        "**Multi-locale.** A template has per-locale variants (en-US, es-MX, fr-FR). The "
        "renderer picks the user's locale and falls back to en-US. Templates are versioned; "
        "a notification stores the template_version used so we can reproduce rendering later.\n\n"
        "**Rate limiting.** Each (user, channel) pair has a rate limit (e.g. SMS 1/hour, "
        "push 10/hour). The router checks Redis before enqueueing; if the user is over "
        "limit, the notification is dropped (for bulk) or queued for later (for "
        "transactional). Bulk campaigns are also limited globally (e.g. 100K emails/min "
        "per SES account) so we don't blow through external provider quotas.\n\n"
        "**Quiet hours.** User preferences specify 'no notifications 10pm-7am local time'. "
        "If a notification arrives during quiet hours: transactional alerts are still sent "
        "(payment / security must not wait); bulk notifications are scheduled for the next "
        "morning. This requires a per-user 'wake-up' scheduler — typically a delayed queue "
        "(Redis ZSET by wake-up timestamp, with a worker that polls).\n\n"
        **Deduplication.** A user might trigger the same event multiple times (e.g. three "
        "'comment on your post' notifications in 1 minute). We dedupe by (user_id, "
        "event_type, target_id) within a 1-minute window, batching the three comments into "
        "'3 people commented on your post'.\n\n"
        "**Delivery status + bounces.** External providers send webhooks for delivery "
        "events (sent, delivered, bounced, complaint). The Status Tracker ingests these and "
        "updates the notification record. A bounce marks the user's email as undeliverable; "
        "future sends skip them.\n\n"
        **Provider failover.** If SES is down, we fail over to SendGrid (and vice versa). "
        "Each channel worker supports multiple providers; we round-robin and track per-"
        "provider error rates."),
    prose("bottlenecks",
        "**Bottlenecks and failure modes.**\n\n"
        "- **External provider rate limits.** SES allows 10K emails/sec per account; a 10M-"
        "user campaign exceeds this. *Mitigation*: shard across multiple SES accounts; "
        "queue + throttle at the campaign rate.\n\n"
        "- **Campaign starvation.** A 10M-user marketing blast can starve transactional "
        "alerts if they share a queue. *Mitigation*: separate queues per priority; "
        "transactional always drains first.\n\n"
        "- **Hot user.** A user receiving 1000 notifications/minute (e.g. a viral post "
        "owner) saturates their rate limit and email quota. *Mitigation*: deduplicate by "
        "event; batch into a daily digest.\n\n"
        "- **Template render failure.** A bad template (missing variable) breaks all sends. "
        "*Mitigation*: render at API time, fail fast on missing variables; canary templates "
        "to 1% before full send.\n\n"
        "- **Provider outage.** APNs goes down globally; push notifications fail. "
        "*Mitigation*: detect via webhook error rates; fail over to FCM (if cross-platform) "
        "or queue for later retry.\n\n"
        "- **Bounce storms.** A bad sender reputation causes Gmail to start bouncing all "
        "emails. *Mitigation*: monitor bounce rate; halt the campaign; warm up the sender "
        "domain.\n\n"
        "- **Quiet-hours timezone bug.** A bug in timezone math sends 3am emails to "
        "thousands of users. *Mitigation*: store user timezone explicitly; unit-test the "
        "quiet-hours check across timezones.\n\n"
        "- **Compliance violation.** Sending marketing to an opted-out user violates "
        "CAN-SPAM/GDPR. *Mitigation*: re-check preferences at send time (not just at API "
        "time), in case the user opted out between trigger and send."),
    prose("scaling",
        "**Scaling strategy and trade-offs.**\n\n"
        "*Queue scaling.* Use Kafka or SQS for the per-channel queues. Workers autoscale "
        "on queue depth; transactional queue gets priority autoscaling.\n\n"
        "*Provider scaling.* Maintain multiple provider accounts per channel (multiple SES "
        "accounts, multiple FCM sender IDs). Round-robin across accounts; track per-account "
        "error rates and quarantine bad accounts.\n\n"
        "*Template caching.* Templates are read-heavy and rarely change; cache in Redis "
        "with 5-min TTL, fallback to SQL on miss.\n\n"
        "*Multi-region.* Run notification workers in each region. The trigger API can be "
        "global; workers fan out locally to reduce cross-region traffic to APNs/FCM "
        "(which have regional endpoints).\n\n"
        "*Campaign batching.* A 10M-user campaign doesn't enqueue 10M messages at once; "
        "the campaign service enqueues in batches of 10K every second, throttled to the "
        "external provider's rate.\n\n"
        "*Trade-offs made explicit.*\n"
        "- We chose at-least-once delivery — **gained** no lost notifications, **lost** "
        "potential duplicates (acceptable; clients dedupe by event_type+target_id).\n"
        "- We chose per-channel workers — **gained** independent provider scaling, "
        "**lost** cross-channel coordination (mitigated by the router).\n"
        "- We chose Redis sliding-window rate limiting — **gained** exact limits, **lost** "
        "O(N) memory per user (mitigated by TTL).\n"
        "- We chose async send (return immediately, deliver later) — **gained** fast API "
        "responses, **lost** synchronous delivery confirmation (acceptable for transactional).\n"
        "- We chose quiet-hours delay — **gained** better UX, **lost** immediate delivery "
        "for bulk notifications (acceptable; transactional bypasses)."),
    quiz("q1",
        "A marketing campaign tries to send 10M emails in 1 minute, but your SES account is rate-limited to 10K emails/sec. What's the correct architecture?",
        ["Send all 10M immediately and let SES queue them.",
         "Enqueue in batches of 10K/sec from a campaign service; the email worker drains the queue at the SES rate. Transactional alerts use a separate queue so they're not starved.",
         "Tell the marketing team to wait.",
         "Use multiple SES accounts, one per email."],
        1,
        "External providers (SES, SendGrid, APNs, FCM) all rate-limit per account. The correct pattern is a queueing campaign service that throttles enqueue rate to match the provider's limit. Critical: separate queues for transactional vs bulk so a big campaign can't starve a 'your password reset' email. Multiple SES accounts (option D) helps but is not the primary answer; you still need throttling. Option A would burn through SES quota and trigger throttling errors; option C is not engineering.",
        "interview"),
    quiz("q2",
        "A user posts a viral tweet and gets 5000 'liked your tweet' notifications in 1 minute. How do you prevent notification spam?",
        ["Send all 5000 individually — the user wants to know.",
         "Dedupe by (user_id, event_type, target_id) within a 1-minute window, batching into '5000 people liked your tweet' (or 'Alice and 4999 others').",
         "Rate-limit the user to 1 notification per hour.",
         "Disable notifications for that user until the viral wave subsides."],
        1,
        "Real systems (Twitter, Instagram) batch duplicate notification events within a short window. They dedupe by (user_id, event_type, target_id) and either coalesce into a single 'X and N others' notification or send one summary per minute. Sending 5000 individual notifications (option A) is both bad UX and wasteful; rate-limiting the user (option C) means they miss other notification types; disabling notifications (option D) hides information they explicitly opted into. The dedupe-and-batch pattern is the standard solution.",
        "solid"),
]

w("design-notification-system",
  "Design Notification System",
  "Design a multi-channel notification system (email, SMS, push, in-app) at 1B notifications/day. Covers fan-out from a single event to multiple channels, template rendering with locale fallback, per-channel per-user rate limiting via Redis sliding windows, quiet-hours scheduling, deduplication of repeated events, separate transactional vs bulk queues to prevent starvation, multi-provider failover (SES+SendGrid, APNs+FCM), and delivery status tracking via provider webhooks.",
  "Every product with users has a notification system, and they're surprisingly hard to get right. The patterns — priority queues to prevent bulk from starving transactional, rate-limiting per channel per user, template rendering with locale fallback, deduplication of viral events, multi-provider failover — are reusable for any fan-out-and-deliver system (notifications, billing alerts, webhook delivery, marketing automation).",
  ["message-queues", "pub-sub"],
  ["design-rate-limiter"],
  25, "interview",
  notif_blocks,
  ["Priority separation keeps transactional alerts fast even during bulk campaigns.",
   "Per-channel per-user rate limiting respects user fatigue and provider quotas.",
   "Multi-provider failover (SES+SendGrid, APNs+FCM) survives single-provider outages.",
   "Deduplication of viral events prevents notification spam."],
  ["At-least-once delivery means duplicates are possible; clients must dedupe.",
   "Quiet-hours handling requires per-user timezone math, easy to get wrong.",
   "External provider rate limits cap campaign throughput; needs sharding.",
   "Compliance (CAN-SPAM, GDPR) requires re-checking opt-in at send time."],
  ["Campaign starvation of transactional alerts — needs separate priority queues.",
   "External provider outage — needs multi-provider failover.",
   "Hot user from viral post — needs event deduplication.",
   "Bounce storms from bad sender reputation — needs rate monitoring + campaign halt.",
   "Quiet-hours timezone bug — needs explicit timezone storage and unit tests."],
  ["Single shared queue for transactional + bulk — bulk starves transactional.",
   "No rate limiting per channel per user — notification spam and provider bans.",
   "Single provider per channel — outage breaks the whole channel.",
   "Sending bulk notifications during user's quiet hours — bad UX.",
   "No deduplication — viral posts generate 5000 notifications for one user."],
  ["AWS SNS + SES",
   "Twilio (SMS, push via SendGrid acquisition)",
   "OneSignal (push)",
   "SendGrid / Mailchimp (email campaigns)",
   "Iterable / Braze (multi-channel marketing)"],
  ["Design a multi-channel notification system.",
   "A marketing campaign tries to send 10M emails in 1 minute. How do you handle the SES rate limit?",
   "A user gets 5000 'liked your tweet' notifications in 1 minute. How do you prevent spam?",
   "How do you make sure transactional alerts aren't delayed by marketing campaigns?"],
  [{"system": "AWS SNS + SES", "how": "SNS for fan-out and pub-sub; SES for email delivery. Combine with SQS for queueing. Cloud-native pattern for multi-channel notifications."},
   {"system": "Twilio", "how": "Multi-channel (SMS, WhatsApp, email via SendGrid, voice) with a unified API. Per-channel routing, template rendering, and webhook-based status tracking."},
   {"system": "Iterable / Braze", "how": "Marketing-automation platforms with multi-channel orchestration, user preference management, and event-triggered campaigns. Built on similar patterns to this design."}])

print("Done with Notification System")
