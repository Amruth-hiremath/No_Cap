#!/usr/bin/env python3
"""Deep content for: Cache Aside, Consistent Hashing, Horizontal Scaling, SQL vs NoSQL, Replication, Sharding, Retry, Circuit Breaker."""
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
# CACHE ASIDE
# ═══════════════════════════════════════════════════════════════════
write_concept('cache-aside', {
    "slug": "cache-aside",
    "version": 3,
    "title": "Cache Aside (Lazy Loading)",
    "phase": "caching",
    "area": "Caching",
    "estimated_minutes": 14,
    "difficulty": "core",
    "summary": "Cache aside is the most common caching strategy. The application checks the cache first; on a miss, it fetches from the database, writes to the cache with a TTL, and returns. Writes update the DB and invalidate the cache. It is simple, fault-tolerant, and wastes no memory on unread data — but it allows stale reads and cache stampedes.",
    "why_it_matters": "Cache aside is the default caching pattern for most web applications. If you use Redis or Memcached in front of a database, you are almost certainly using cache aside. Understanding its failure modes (stale data, stampede, thundering herd) is essential for building reliable systems.",
    "prerequisites": ["caching-strategies"],
    "related": ["write-through", "write-behind", "refresh-ahead"],
    "used_in": ["Netflix, web apps, APIs — everywhere reads outnumber writes."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "In cache aside (also called lazy loading), the application code manages the cache explicitly. The cache is not pre-populated — it fills lazily based on actual access patterns. Only data that is actually read gets cached.\n\nThis is the most common caching strategy because it is simple, fault-tolerant, and memory-efficient. If the cache crashes, the system still works (just slower). If data is never read, it never enters the cache (no wasted memory)."}},

        {"type": "code", "id": "code-example", "payload": {"language": "python", "code": "from redis import Redis\n\ncache = Redis(...)\n\ndef get_user(user_id):\n    key = f'user:{user_id}'\n\n    # 1. Check cache first\n    cached = cache.get(key)\n    if cached:\n        return cached  # cache HIT\n\n    # 2. Cache MISS — fetch from DB\n    user = db.fetch_user(user_id)\n\n    # 3. Write to cache with TTL (safety net)\n    cache.set(key, user, ttl=300)  # 5 minutes\n\n    return user\n\ndef update_user(user_id, data):\n    # 1. Update DB first (source of truth)\n    db.update_user(user_id, data)\n    # 2. Invalidate cache (next read will re-populate)\n    cache.delete(f'user:{user_id}')", "caption": "Cache aside in Python with Redis. Reads check cache, fall through to DB on miss, then populate. Writes invalidate."}},

        {"type": "diagram", "id": "flow", "payload": {"ascii": "  READ FLOW\n  ─────────\n  [App] → [Cache]\n              │\n         HIT? ──YES──→ Return (fast, ~1ms)\n              │\n             NO (miss)\n              │\n              v\n          [Database]\n              │\n         fetch + write to cache (TTL=300s)\n              │\n              v\n          Return (slow, ~50ms)\n\n  WRITE FLOW\n  ──────────\n  [App] → [Database]  (update source of truth)\n              │\n         invalidate cache (DELETE key)\n              │\n              v\n  Next read: MISS → fetch from DB → repopulate cache", "caption": "Cache aside: first read misses and populates; subsequent reads hit. Writes invalidate.", "voice_alt_text": "Two diagrams. Read flow: the app checks the cache. If HIT, return in 1ms. If MISS, fetch from the database (50ms), write to cache with a 5-minute TTL, and return. Write flow: the app updates the database (source of truth), then invalidates the cache entry. The next read will miss and re-populate from the database."}},

        {"type": "callout", "id": "stale-warning", "payload": {"title": "Stale data risk", "body": "Cache aside trades freshness for speed. Between a write and the cache invalidation, reads can return stale data. TTLs cap the staleness window — a 300s TTL means data is at most 5 minutes stale. For strong freshness, invalidate synchronously on write, but accept that the invalidation can fail (cache can be down) — always set a TTL as a safety net.", "kind": "warning"}},

        {"type": "prose", "id": "stampede", "payload": {"text": "**Cache stampede (thundering herd):**\n\nA subtle failure mode: when a popular key expires, the next N requests all miss simultaneously, all fetch from the database, all write to the cache. The database takes N times the expected load for a brief window.\n\n**Example**: 10,000 requests/sec for a popular product page. The cache TTL expires. Within the next 100ms, 1,000 requests all see a miss. They all query the database. The database, which was handling 100 queries/sec (the 10% that were misses), now handles 1,000 queries in 100ms — 10x normal load. It may crash or become very slow.\n\n**Mitigations:**\n1. **Cache locking (request coalescing)**: only the first miss fetches from the DB; others wait for the first to complete and share the result.\n2. **Early refresh (refresh-ahead)**: refresh the cache before it expires, in the background.\n3. **Probabilistic early expiration**: add jitter to the TTL (e.g., TTL = 300s ± random(0-30s)) so keys don't all expire at the same instant."}},

        {"type": "prose", "id": "when-to-use", "payload": {"text": "**When to use cache aside:**\n- Read-heavy workloads (read:write ratio > 10:1).\n- Data that changes infrequently (product catalog, user profiles).\n- When you can tolerate brief staleness (social feeds, analytics).\n- When you want the simplest caching strategy.\n\n**When NOT to use cache aside:**\n- When staleness is unacceptable (bank balances, inventory counts). Use write-through instead.\n- When writes are very frequent and reads are rare. Cache aside adds invalidation overhead on every write for little benefit.\n- When you need the cache to be the source of truth for writes (write-behind)."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "Your cache aside system uses a 5-minute TTL on user profiles. A user updates their bio, the DB write succeeds, but the cache invalidation call fails (cache is briefly down). What happens?", "shape": "mcq", "options": ["The user sees their new bio immediately.", "The user may see stale bio for up to 5 minutes, then it self-corrects when the TTL expires.", "The database rolls back the write.", "The cache becomes permanently inconsistent."], "answer_index": 1, "rationale": "The write succeeded, but the cache still holds the old bio. Until the TTL expires (up to 5 minutes), reads return stale data. Once the TTL expires, the next read misses, fetches the updated bio from the DB, and the cache is correct again. This is why TTLs are a safety net — they cap the maximum staleness window even when invalidation fails. Without a TTL, a failed invalidation would mean stale data forever.", "difficulty": "solid"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "A popular product page's cache entry expires. Within the same second, 1000 users request the page. What happens without mitigation?", "shape": "mcq", "options": ["Nothing special — the cache refills normally.", "All 1000 requests miss simultaneously, hammering the database with 1000 concurrent queries.", "The cache automatically extends its TTL.", "The load balancer blocks the requests."], "answer_index": 1, "rationale": "This is a cache stampede (thundering herd). All 1000 requests see a miss at the same time, all fetch from the database, all write to the cache. The database briefly takes 1000x the expected load. The fix is cache locking (only one request fetches, others wait), early refresh (refresh before expiry), or probabilistic early expiration (jitter the TTL).", "difficulty": "hard"}}
    ],
    "trade_offs": {
        "pros": [
            "Lazy population — cache only holds data someone actually reads.",
            "Fault-tolerant — if cache dies, system keeps working (just slower).",
            "Simple to implement — GET, SET, DEL.",
            "Memory-efficient — no wasted entries."
        ],
        "cons": [
            "Stale data window up to TTL duration.",
            "Cache stampede on popular key expiry.",
            "Application code is aware of the cache (not transparent).",
            "First read after expiry is slow (cache miss)."
        ]
    },
    "failure_modes": [
        "Stale data — invalidation fails, TTL hasn't expired yet.",
        "Cache stampede — popular key expiry causes thundering herd.",
        "Cache thrashing — keys evicted before they're read again (cache too small).",
        "Inconsistent state — DB updated but cache invalidation failed."
    ],
    "common_mistakes": [
        "No TTL. Without a TTL, a cache invalidation failure means stale data forever.",
        "Updating cache before DB. If the cache write succeeds but the DB write fails, you are now inconsistent. Always write DB first, then invalidate cache.",
        "Forgetting cache stampede protection on hot keys.",
        "Caching everything. Caching rarely-read data wastes memory and adds invalidation complexity."
    ],
    "where_you_see_it": [
        "Netflix, web apps, APIs — everywhere reads outnumber writes.",
        "Redis, Memcached, Varnish, CDN edge caching.",
        "Browser cache, OS page cache — caching is everywhere, layered."
    ],
    "interview_prompts": [
        "Design a caching layer for a news feed that gets 10k reads/sec and 10 writes/sec.",
        "How do you handle cache stampedes? What are the trade-offs of each approach?",
        "Your cache and database diverged. How do you detect it, and how do you fix it?",
        "When would you NOT use cache aside? What are the alternatives?"
    ],
    "real_system_mappings": [
        {"system": "Netflix", "how": "Multi-tier caching: CDN edge → EVCache (origin cache, cache-aside) → database. 90%+ of reads served from cache. Cache-aside for content metadata."},
        {"system": "Redis", "how": "The most popular in-memory cache. Used in cache-aside mode by most applications: GET on read, SET on miss, DEL on write."}
    ],
    "status": "published",
})

# ═══════════════════════════════════════════════════════════════════
# CONSISTENT HASHING
# ═══════════════════════════════════════════════════════════════════
write_concept('consistent-hashing', {
    "slug": "consistent-hashing",
    "version": 3,
    "title": "Consistent Hashing",
    "phase": "scaling-performance",
    "area": "Scaling & Performance",
    "estimated_minutes": 14,
    "difficulty": "advanced",
    "summary": "Consistent hashing is a distributed hashing technique that minimizes data movement when nodes are added or removed. With naive modulo hashing (hash(key) % N), removing one node re-maps almost every key. With consistent hashing, only the keys on the removed node need to move. This is how Cassandra, DynamoDB, and Redis Cluster distribute data.",
    "why_it_matters": "If you hash keys directly across N servers and one server disappears, almost every key maps to a different server. That can invalidate almost the entire cache at once. Consistent hashing reduces the amount of data that must move when nodes join or leave — making it the backbone of every modern distributed database and cache.",
    "prerequisites": ["sharding"],
    "related": ["sharding", "replication"],
    "used_in": ["Cassandra, DynamoDB, Redis Cluster, Memcached, Discord (for voice channels)."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "**The problem:**\n\nSuppose you have 5 cache servers and distribute keys using `hash(key) % 5`. Server 0 gets keys where hash % 5 == 0, server 1 gets hash % 5 == 1, etc. This works fine.\n\nNow server 3 crashes. You now have 4 servers, so you re-hash with `hash(key) % 4`. **Almost every key now maps to a different server.** If you had 1M keys cached, ~750,000 of them just moved. Your cache is effectively invalidated.\n\nThis is the modulo hashing problem. It makes adding or removing nodes catastrophically expensive."}},

        {"type": "diagram", "id": "modulo-vs-consistent", "payload": {"ascii": "  MODULO HASHING: hash(key) % N\n  ────────────────────────────────\n  N=5:  key A → hash(A) % 5 = 2  → Server 2\n        key B → hash(B) % 5 = 4  → Server 4\n        key C → hash(C) % 5 = 0  → Server 0\n\n  Remove Server 3 (N=4):\n        key A → hash(A) % 4 = 0  → Server 0  (moved!)\n        key B → hash(B) % 4 = 0  → Server 0  (moved!)\n        key C → hash(C) % 4 = 2  → Server 2  (moved!)\n  → Almost every key re-maps. Cache effectively wiped.\n\n\n  CONSISTENT HASHING: hash(key) and hash(server) on a ring\n  ────────────────────────────────────────────────────────\n  Place servers on a ring: S0, S1, S2, S3, S4\n  Key goes to the NEXT server clockwise on the ring.\n\n       S0\n      /    \\\n    key A   key B\n     |       |\n    S4      S1\n      \\    /\n       S3--S2\n\n  Remove S3:\n  → Only keys that were on S3 move (to S4, the next clockwise).\n  → All other keys stay put. ~1/N keys move, not ~all.", "caption": "Modulo hashing re-maps almost everything. Consistent hashing moves only keys on the removed node.", "voice_alt_text": "Two diagrams. Modulo hashing: with 5 servers, hash(key) mod 5 assigns keys to servers. When server 3 is removed, hash(key) mod 4 assigns almost every key to a different server — the cache is effectively wiped. Consistent hashing: servers are placed on a ring. A key goes to the next server clockwise on the ring. When a server is removed, only the keys that were on that server move (to the next clockwise server). All other keys stay put — only 1/N keys move."}},

        {"type": "prose", "id": "how-it-works", "payload": {"text": "**How consistent hashing works:**\n\n1. **Ring**: Imagine a ring with positions 0 to 2^32 - 1 (the hash space).\n2. **Place servers**: hash each server's name/ID onto the ring. Server A goes to position hash('A'), server B to hash('B'), etc.\n3. **Place keys**: hash each key. The key goes to the **next server clockwise** from its position on the ring.\n4. **Remove a server**: only the keys between the removed server and the previous server move (they go to the next server clockwise). All other keys stay.\n5. **Add a server**: only the keys between the new server and the next server clockwise move. All other keys stay.\n\nThe key insight: adding or removing a node only affects the keys in that node's arc of the ring. With N nodes, approximately 1/N of the keys move — not all of them."}},

        {"type": "callout", "id": "virtual-nodes", "payload": {"title": "Virtual nodes (VNodes)", "body": "If you place each server once on the ring, the distribution can be uneven (server A might get 40% of keys, server B only 10%). The fix: place each server multiple times at random positions — 'virtual nodes'. With 150 VNodes per server, the distribution is nearly uniform. This is what Cassandra and DynamoDB do.", "kind": "note"}},

        {"type": "prose", "id": "real-world", "payload": {"text": "**Real-world usage:**\n\n- **Cassandra**: each node owns a range of the ring. Data is replicated to the next N-1 nodes clockwise. Adding a node only moves data in the new node's range.\n- **DynamoDB**: uses consistent hashing internally to distribute partition data across nodes.\n- **Redis Cluster**: 16384 hash slots (not a ring, but the same idea: adding/removing a node only moves its slots).\n- **Discord**: uses consistent hashing to route voice channels to servers. When a server is added or removed, only the channels on that server move.\n- **CDNs**: use consistent hashing to route requests to edge caches."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "You have 10 cache servers using hash(key) % 10 to distribute keys. You add an 11th server. How many keys need to move?", "shape": "mcq", "options": ["About 1/10 (10%) — only the keys on the new server.", "About 9/10 (90%) — almost every key re-maps because the modulo changed.", "None — the hash function adapts.", "All keys must move."], "answer_index": 1, "rationale": "With modulo hashing, changing N from 10 to 11 changes the modulo for almost every key. A key that was on server 2 (hash % 10 == 2) might now be on server 7 (hash % 11 == 7). On average, 10/11 of keys re-map — about 91%. This is why modulo hashing is catastrophic for scaling. Consistent hashing solves this: only the keys in the new server's arc of the ring move — about 1/11 (9%).", "difficulty": "interview"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "In consistent hashing, why do we use virtual nodes (VNodes)?", "shape": "mcq", "options": ["To increase the total number of servers.", "To ensure even distribution of keys across servers (without VNodes, one server might get 40% of keys).", "To improve read performance.", "To reduce memory usage."], "answer_index": 1, "rationale": "If you place each server once on the ring, the distribution is uneven — one server might get 40% of keys, another only 10%. Virtual nodes solve this: place each server at multiple random positions on the ring (e.g., 150 VNodes per server). The more VNodes, the more uniform the distribution. This is what Cassandra (default 256 VNodes) and DynamoDB do. The trade-off: more VNodes means more memory for the routing table, but the improved balance is worth it.", "difficulty": "advanced"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "In consistent hashing, when a server is removed, which keys need to move?", "shape": "mcq", "options": ["All keys.", "Only the keys that were assigned to the removed server (they go to the next server clockwise).", "No keys move.", "Half the keys move."], "answer_index": 1, "rationale": "In consistent hashing, each key is assigned to the next server clockwise on the ring. When a server is removed, only the keys that were assigned to that server need to move — they go to the next server clockwise (the one after the removed server). All other keys stay put. This is the key advantage of consistent hashing: adding or removing a node only affects approximately 1/N of the keys, not all of them.", "difficulty": "core"}}
    ],
    "trade_offs": {
        "pros": [
            "Minimal data movement on node add/remove (~1/N keys move, not ~all).",
            "Scales horizontally — add/remove nodes without cache wipe.",
            "Even distribution with virtual nodes.",
            "No central coordinator needed (each node can compute the ring)."
        ],
        "cons": [
            "More complex than modulo hashing.",
            "Ring maintenance — nodes need to know the ring topology.",
            "VNodes add memory overhead for routing tables.",
            "Doesn't handle hot keys (a popular key still goes to one server)."
        ]
    },
    "failure_modes": [
        "Hot keys — even with consistent hashing, a viral key overloads its assigned server. Mitigate with replication + client-side caching.",
        "Uneven distribution (without VNodes) — one server gets disproportionate load.",
        "Ring topology changes during network partitions — split-brain."
    ],
    "common_mistakes": [
        "Using modulo hashing for distributed caches. Use consistent hashing instead.",
        "Not using virtual nodes — distribution is uneven without them.",
        "Forgetting that consistent hashing doesn't solve hot keys — you still need replication."
    ],
    "where_you_see_it": [
        "Cassandra (256 VNodes per node by default).",
        "DynamoDB (internal partition distribution).",
        "Redis Cluster (16384 hash slots).",
        "Discord (voice channel routing).",
        "CDNs (edge cache routing)."
    ],
    "interview_prompts": [
        "What is consistent hashing? Why is it needed?",
        "How does consistent hashing differ from modulo hashing?",
        "What are virtual nodes, and why are they important?",
        "How does Cassandra use consistent hashing for data distribution?"
    ],
    "real_system_mappings": [
        {"system": "Cassandra", "how": "Each node owns VNodes on the ring. Data is replicated to the next N-1 nodes clockwise. Adding a node only moves data in the new node's VNode ranges. Default 256 VNodes per node."},
        {"system": "Discord", "how": "Uses consistent hashing to route voice channels to servers. When a server is added or removed, only the channels on that server move — not all channels."}
    ],
    "status": "published",
})

print("\n✅ Cache Aside + Consistent Hashing written")
