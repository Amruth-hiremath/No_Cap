#!/usr/bin/env python3
"""Deep content for: DNS, HTTP, Load Balancers, Caching Strategies, Cache Aside, Consistent Hashing."""
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
# DNS
# ═══════════════════════════════════════════════════════════════════
write_concept('dns', {
    "slug": "dns",
    "version": 3,
    "title": "DNS — Domain Name System",
    "phase": "architecture-infrastructure",
    "area": "Architecture & Infrastructure",
    "estimated_minutes": 15,
    "difficulty": "core",
    "summary": "DNS is the phonebook of the internet. Humans remember example.com; routers need 93.184.216.34. DNS bridges this gap with a hierarchical, distributed, eventually-consistent database. It is also one of the most common single points of failure in real outages — if your DNS is down, no one can find you.",
    "why_it_matters": "DNS is the first step in every web request. If DNS fails, nothing else matters — users can't reach your servers, your API can't call downstream services, your CDN can't route traffic. DNS outages have taken down GitHub, Slack, and even entire chunks of the internet (when Dyn was DDoSed in 2016). Understanding DNS is understanding the foundation of how the internet works.",
    "prerequisites": ["how-the-internet-works"],
    "related": ["cdn", "load-balancers"],
    "used_in": ["Every domain lookup on the planet.", "Cloudflare DNS, Route 53, BIND."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "DNS (Domain Name System) is a hierarchical, distributed database that translates human-readable domain names (example.com) into IP addresses (93.184.216.34). Without DNS, you'd have to memorize IP addresses for every website you visit.\n\nBut DNS is more than a lookup table. It's a **distributed system** with caching at every level, trade-offs in TTL (time to live), and a hierarchical structure that makes it both resilient and fragile at the same time. A DNS outage is one of the few things that can take your entire service offline instantly — no amount of server redundancy helps if users can't find your servers."}},

        {"type": "prose", "id": "the-problem", "payload": {"text": "**The problem DNS solves:**\n\nIn the early internet (1970s-1980s), there were only a few hundred computers. A single file called `HOSTS.TXT` was maintained by Stanford and distributed to every machine. If you wanted to add a new computer, you emailed the Stanford Network Information Center, they added your entry to the file, and every machine downloaded the updated file.\n\nThis worked for hundreds of computers. It broke at thousands. By the late 1980s:\n- The file was too large to distribute efficiently.\n- Naming collisions became inevitable (who gets 'mail'?).\n- Updates took days to propagate.\n- A single point of failure (Stanford) could take down the entire internet.\n\nPaul Mockapetris designed DNS in 1983 to solve this. The key insight: **distribute the naming database hierarchically**, with caching at every level."}},

        {"type": "diagram", "id": "dns-hierarchy", "payload": {"ascii": "  Browser\n      |  (asks for example.com)\n      v\n  Stub Resolver (in OS)\n      |\n      v\n  Recursive Resolver (1.1.1.1, 8.8.8.8, or ISP)\n      |\n      +---> Root Nameserver   (.)\n      |         |  \"try .com TLD\"\n      |         v\n      +---> TLD Nameserver    (.com)\n      |         |  \"try example.com's authoritative NS\"\n      |         v\n      +---> Authoritative NS   (example.com)\n                |\n                v\n            A record: 93.184.216.34\n                |\n                v\n      (cached at every layer by TTL)\n\n  Root servers: 13 logical, ~1500 physical instances (anycast)\n  TLD servers: managed by Verisign (.com), PIR (.org), etc.\n  Authoritative: managed by the domain owner (Route 53, Cloudflare)", "caption": "DNS resolution: hierarchical walk from root → TLD → authoritative, with caching at every layer.", "voice_alt_text": "A diagram of DNS resolution. The browser asks the OS stub resolver, which asks a recursive resolver like 1.1.1.1. The recursive resolver walks the hierarchy: first the root nameserver (which says 'try the .com TLD'), then the TLD nameserver (which says 'try example.com's authoritative server'), then the authoritative nameserver (which returns the A record: 93.184.216.34). The answer is cached at every layer based on TTL. There are 13 logical root servers replicated across 1500 physical instances using anycast."}},

        {"type": "prose", "id": "how-it-works", "payload": {"text": "**How DNS resolution works (step by step):**\n\n1. **Browser cache**: The browser checks its own DNS cache first. If you visited example.com recently, the IP is already cached. Cache hit → done in 0ms.\n\n2. **OS stub resolver**: If the browser cache misses, the OS resolver checks its cache, then queries the configured recursive resolver (usually your ISP's, or 8.8.8.8 / 1.1.1.1).\n\n3. **Recursive resolver**: This is the workhorse. It does the full hierarchical walk:\n   - **Root nameserver**: The recursive resolver asks the root, 'where is example.com?' The root says, 'I don't know, but the .com TLD nameserver does. Here's its IP.'\n   - **TLD nameserver**: The resolver asks the .com TLD, 'where is example.com?' The TLD says, 'I don't know, but example.com's authoritative nameserver does. Here's its IP.'\n   - **Authoritative nameserver**: The resolver asks example.com's authoritative NS, 'what is the IP for example.com?' The NS returns the A record: 93.184.216.34.\n\n4. **Caching**: The recursive resolver caches the answer (for the TTL duration). The OS caches it. The browser caches it. Next lookup → cache hit, no network traffic.\n\nThe entire walk happens in milliseconds because of caching. Without caching, every DNS query would take 100ms+ (multiple round trips to root, TLD, authoritative). With caching, 95%+ of queries are cache hits."}},

        {"type": "callout", "id": "ttl-tradeoff", "payload": {"title": "TTL is the critical trade-off", "body": "Every DNS record has a TTL (Time To Live) — how long resolvers should cache the answer. Short TTLs (60s) let you fail over quickly but increase DNS query load. Long TTLs (86400s = 24h) reduce load but mean a DNS change takes up to a day to propagate globally. Most production setups use 300-3600s as a compromise, then lower the TTL ahead of planned changes. If you're migrating your API to a new IP, lower the TTL to 60s a few days before, wait for the old TTL to expire everywhere, then make the switch.", "kind": "warning"}},

        {"type": "prose", "id": "record-types", "payload": {"text": "**Common DNS record types:**\n\n| Type | Purpose | Example |\n|------|---------|----------|\n| **A** | IPv4 address | example.com → 93.184.216.34 |\n| **AAAA** | IPv6 address | example.com → 2606:2800:220:1:248:1893:25c8:1946 |\n| **CNAME** | Alias to another domain | www.example.com → example.com |\n| **MX** | Mail server | example.com → mail.example.com (priority 10) |\n| **TXT** | Arbitrary text | SPF, DKIM, domain verification |\n| **NS** | Delegation | example.com → ns1.cloudflare.com |\n| **SOA** | Start of authority | Zone metadata (admin email, serial, refresh) |\n| **PTR** | Reverse lookup (IP → name) | 34.216.184.93.in-addr.arpa → example.com |\n\n**Important constraint**: CNAMEs cannot coexist with other record types on the same name. This is why root domains (example.com, without www) often use ALIAS or ANAME records instead — a non-standard extension that acts like a CNAME but allows coexistence with SOA/NS records."}},

        {"type": "prose", "id": "dns-based-lb", "payload": {"text": "**DNS-based load balancing:**\n\nDNS can do more than just translate names to IPs — it can distribute traffic:\n\n- **Round-robin**: Return multiple A records (e.g., 3 IPs). The resolver rotates the order. Simple, but doesn't account for server health or load.\n- **Weighted**: Return IPs with different probabilities. Useful for gradual deployments (5% traffic to new version, 95% to old).\n- **Geo**: Return different IPs based on the resolver's location. 'Users in Europe → EU servers; users in US → US servers.' This is how CDNs route traffic to the nearest edge.\n- **Latency-based**: Return the IP with the lowest latency to the resolver.\n- **Health-checked**: Monitor backend health and remove dead IPs from DNS responses. Route 53 and Cloudflare do this.\n\nDNS-based load balancing is coarse (changes take TTL time to propagate) but globally distributed and simple. It's often combined with L4/L7 load balancers for fine-grained control."}},

        {"type": "prose", "id": "failure-modes-detail", "payload": {"text": "**How DNS fails (and how to survive it):**\n\n1. **Authoritative NS outage**: If your authoritative nameserver is down, new DNS queries fail. Users who have the IP cached can still reach you; new users cannot. Mitigation: use 2+ DNS providers (e.g., Route 53 + Cloudflare) so if one fails, the other answers.\n\n2. **DNS cache poisoning**: An attacker injects a fake DNS response, redirecting users to a malicious IP. Mitigation: DNSSEC (cryptographic signing of DNS responses).\n\n3. **TTL too long**: You change your IP, but resolvers cache the old one for 24h. Users hit the old (now dead) server. Mitigation: lower TTL before planned changes.\n\n4. **DNS amplification attack**: An attacker sends small DNS queries with a spoofed source IP (yours). The DNS server sends large responses to you, overwhelming your network. Mitigation: rate limiting, DNS response rate limiting (RRL).\n\n5. **Recursive resolver outage**: If 8.8.8.8 or 1.1.1.1 goes down, millions of users can't resolve anything. The 2016 Dyn DDoS attack took down Twitter, Netflix, Reddit, and GitHub — not by attacking them directly, but by taking down their DNS provider."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "You are planning a migration to a new origin IP next week. What should you do to your DNS TTL today?", "shape": "mcq", "options": ["Leave it at 86400s (24h) to reduce resolver load during the migration.", "Lower it to 60s a few days before, so the migration propagates quickly.", "Set it to 0 so resolvers always re-query.", "DNS TTL has no effect on migrations."], "answer_index": 1, "rationale": "Lowering the TTL to 60s a few days before the migration ensures every recursive resolver has cached the short TTL by migration day. When you flip the A record, the new IP propagates within 60s globally. Leaving it at 24h means some users will hit the old IP for up to a day. Setting TTL to 0 is not honored by all resolvers and dramatically increases query load. The standard practice is: lower TTL → wait for old TTL to expire → make the change → raise TTL back after propagation.", "difficulty": "solid"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "Your DNS change has not propagated for some users 12 hours later. What could be wrong?", "shape": "mcq", "options": ["DNS propagation is always instant.", "The old TTL was long (e.g., 24h) and some resolvers still have the old record cached.", "The new IP is wrong.", "The recursive resolver is down."], "answer_index": 1, "rationale": "DNS propagation is governed by TTL. If the old record had a 24h TTL, resolvers that fetched it before your change will keep serving the old IP for up to 24 hours. They won't re-query until the TTL expires. This is why you should lower the TTL before making changes — so the old cached record expires quickly and resolvers fetch the new one. The new IP being wrong would cause a different symptom (users reach the wrong server, not the old one). A resolver outage would affect all users, not just some.", "difficulty": "core"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "Why can't you put a CNAME record at the root domain (example.com)?", "shape": "mcq", "options": ["CNAMEs are deprecated.", "Root domains must have SOA and NS records, and CNAME cannot coexist with other record types on the same name.", "Root domains don't support DNS.", "CNAMEs only work with IPv6."], "answer_index": 1, "rationale": "RFC 1033 specifies that a CNAME record cannot coexist with other record types on the same name. The root domain (example.com) must have SOA (start of authority) and NS (nameserver) records. If you put a CNAME there, it would conflict with these required records. This is why CDNs like Cloudflare use ALIAS or ANAME records (non-standard extensions) at the root, which act like CNAMEs but are resolved by the authoritative nameserver, not the resolver.", "difficulty": "advanced"}}
    ],
    "trade_offs": {
        "pros": [
            "Hierarchical and distributed — no single server holds the entire database.",
            "Aggressive caching keeps query latency low (usually <10ms after first lookup).",
            "TTL-based caching gives operators explicit control over propagation speed.",
            "Mature, battle-tested protocol (40+ years)."
        ],
        "cons": [
            "DNS is a single point of failure for your domain — if your authoritative NS is down, you are unreachable.",
            "Propagation is eventual, not instant. A misconfigured record can take hours to undo.",
            "Originally unencrypted — ISPs and middlemen can snoop and hijack. DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT) fix this but adoption is incomplete.",
            "DNS-based load balancing is coarse (TTL propagation delay) and can only do simple routing."
        ]
    },
    "failure_modes": [
        "Authoritative nameserver outage — your domain becomes unreachable globally. Mitigated by using 2+ DNS providers.",
        "DNS cache poisoning — users redirected to malicious IPs. Mitigated by DNSSEC.",
        "TTL too long — a misconfigured record takes hours to undo globally. Mitigated by lowering TTL before changes.",
        "DNS amplification DDoS — attacker uses DNS to amplify attack traffic. Mitigated by response rate limiting.",
        "Recursive resolver outage (e.g., Dyn 2016) — takes down services that don't control their own DNS."
    ],
    "common_mistakes": [
        "Treating DNS as 'always works'. DNS outages are real and take down even the biggest companies.",
        "Forgetting to lower TTL before a planned migration, then waiting hours for propagation.",
        "CNAME at the apex domain. This is invalid in RFC 1033 — use ALIAS/ANAME or a redirect.",
        "Using a single authoritative nameserver provider. Use two providers for redundancy.",
        "Not setting up DNSSEC, leaving users vulnerable to cache poisoning."
    ],
    "where_you_see_it": [
        "Every domain lookup on the planet.",
        "Cloudflare DNS (1.1.1.1), AWS Route 53, Google Cloud DNS, NS1.",
        "DNS-based load balancing (Route 53 weighted routing, geo DNS)."
    ],
    "interview_prompts": [
        "Explain what happens when you type example.com into your browser, focusing on DNS.",
        "How would you design DNS to survive a single nameserver failure?",
        "Your DNS change has not propagated for some users 12 hours later. What could be wrong?",
        "What is DNS-based load balancing? What are its limitations?",
        "How does TTL affect DNS failover?"
    ],
    "real_system_mappings": [
        {"system": "Cloudflare DNS", "how": "1.1.1.1 public resolver with sub-10ms global anycast. Also an authoritative DNS provider with 100% uptime SLA. Uses DNS-over-HTTPS by default."},
        {"system": "AWS Route 53", "how": "Managed DNS with weighted routing, health checks, failover policies, and geo DNS. Named after port 53, the standard DNS port."}
    ],
    "status": "published",
})

# ═══════════════════════════════════════════════════════════════════
# LOAD BALANCERS
# ═══════════════════════════════════════════════════════════════════
write_concept('load-balancers', {
    "slug": "load-balancers",
    "version": 3,
    "title": "Load Balancers",
    "phase": "architecture-infrastructure",
    "area": "Architecture & Infrastructure",
    "estimated_minutes": 16,
    "difficulty": "core",
    "summary": "A load balancer distributes incoming traffic across multiple servers. It is the foundational scaling primitive: it enables horizontal scaling, fault tolerance, and rolling deploys. Without it, you have one server and a single point of failure.",
    "why_it_matters": "A single server cannot handle meaningful traffic, cannot survive hardware failure, and cannot scale beyond one machine's CPU and RAM. Load balancing solves all three. Every production web service with more than one server uses load balancers. It is the #1 most important infrastructure component in system design.",
    "prerequisites": ["how-the-internet-works"],
    "related": ["horizontal-scaling", "reverse-proxy", "cdn"],
    "used_in": ["Every production web service with more than one server."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "A load balancer sits in front of a pool of backend servers. Incoming requests arrive at the load balancer; it picks a backend and forwards the request; the backend responds; the load balancer relays the response to the client. To the client, the load balancer is the server. To the backend, the load balancer is the client.\n\nThe choice of which backend to pick is the **algorithm**. The choice of how to detect failures is the **health check**. These two decisions, plus whether to operate at L4 (transport) or L7 (application), define the load balancer."}},

        {"type": "prose", "id": "the-problem", "payload": {"text": "**The problem:**\n\nYou have one application server. At 100 requests/sec, it's fine — CPU at 30%, memory stable, 50ms latency. Life is good.\n\nThen traffic grows. At 1,000 requests/sec:\n- CPU hits 90%.\n- Memory pressure causes GC pauses.\n- Latency climbs to 200ms.\n- Users start seeing timeouts.\n\nAt 10,000 requests/sec, the server is dead. OOM crash, connection exhaustion, or the OS just stops responding.\n\n**The naive fix**: buy a bigger server. Double the CPU, double the RAM. But that only gets you 2x — you're still one machine, and now it's expensive. And it's still a single point of failure: if that one machine dies, your entire service is down.\n\n**The right fix**: add more servers and a load balancer to distribute traffic across them."}},

        {"type": "diagram", "id": "lb-architecture", "payload": {"ascii": "            [Clients]\n                |\n                v\n        +---------------+\n        |  Load Balancer |\n        +---------------+\n          /     |     \\\n         /      |      \\\n      [S1]    [S2]    [S3]\n        \\      |      /\n         v     v     v\n        +-----------+\n        |  Database  |  (shared — S1/S2/S3 are stateless)\n        +-----------+\n\n  The LB is the single entry point.\n  If S1 dies, the LB stops sending traffic to it.\n  To scale: add S4, S5, S6 — the LB distributes across all.\n  To deploy: drain S1 (stop new connections), update S1, re-add.", "caption": "A load balancer distributes traffic across a pool of stateless servers sharing one database.", "voice_alt_text": "A diagram of a load balancer in front of three stateless servers. Clients connect to the load balancer, which distributes requests across S1, S2, and S3. All three servers share a single database, so any server can handle any request. If S1 dies, the load balancer stops sending traffic to it. To scale, add more servers. To deploy, drain one server at a time."}},

        {"type": "prose", "id": "algorithms", "payload": {"text": "**Load balancing algorithms:**\n\n| Algorithm | How it works | Best for |\n|-----------|-------------|----------|\n| **Round Robin** | Cycle through backends in order. Simple, ignores load. | Even backend capacity, simple setups |\n| **Least Connections** | Pick the backend with fewest active requests. | Uneven request durations (some slow, some fast) |\n| **IP Hash** | Hash client IP → same client always goes to same backend. | Sticky sessions without cookies |\n| **Weighted** | Give stronger backends more traffic (weight). | Mixed-capacity backends (e.g., 4-core vs 8-core) |\n| **Random** | Pick a random backend. Cheap, surprisingly effective at scale. | Very large backend pools |\n| **Least Response Time** | Pick the backend with the fastest average response. | Latency-sensitive apps |\n\nProduction load balancers often combine: least-connections + health checks + slow-start for newly-added backends. NGINX and HAProxy default to round-robin; AWS ALB defaults to round-robin; Envoy defaults to least-connections."}},

        {"type": "callout", "id": "statelessness", "payload": {"title": "The statelessness rule", "body": "For horizontal scaling to work, backends must be **stateless** — no in-memory sessions, no local file uploads, no per-server caches. All shared state lives in the database, Redis, or object storage. If a backend holds session state, you need sticky sessions (IP hash), which defeats the LB's ability to fail over. Move sessions to Redis. Move file uploads to S3. Then any backend can serve any request.", "kind": "note"}},

        {"type": "prose", "id": "l4-vs-l7", "payload": {"text": "**L4 vs L7 load balancing:**\n\n**L4 (transport layer)**: The load balancer sees TCP/UDP packets. It forwards bytes without parsing HTTP. Fast, simple, opaque.\n- Examples: HAProxy (L4 mode), AWS NLB, iptables.\n- Pros: very fast, low overhead, protocol-agnostic (works for any TCP service).\n- Cons: can't route by URL/headers, can't modify requests, no TLS termination.\n- Use cases: database connection pooling, gRPC, raw TCP services.\n\n**L7 (application layer)**: The load balancer parses HTTP. It can route by URL path, headers, cookies. It can terminate TLS, modify requests, add headers.\n- Examples: NGINX, AWS ALB, Envoy, HAProxy (L7 mode).\n- Pros: smart routing (path-based, header-based), TLS termination, content-based decisions.\n- Cons: slower (must parse HTTP), more overhead, HTTP-only.\n- Use cases: web APIs, microservices, path-based routing.\n\nMost modern systems use both: an L4 LB at the edge for raw throughput, L7 LBs behind it for smart routing."}},

        {"type": "diagram", "id": "l4-l7", "payload": {"ascii": "  L4 LOAD BALANCING (transport layer)\n  ───────────────────────────────────\n  Client → [L4 LB] → [Server A]\n                   → [Server B]\n  The LB sees TCP packets. Forwards bytes.\n  Fast. Opaque. No HTTP parsing.\n  Examples: AWS NLB, HAProxy (L4 mode)\n\n  L7 LOAD BALANCING (application layer)\n  ───────────────────────────────────\n  Client → [L7 LB] → /api/*     → [API Server A]\n                   → /static/*  → [CDN / static servers]\n                   → /admin/*   → [Admin Server (IP-restricted)]\n  The LB parses HTTP. Routes by path, header, cookie.\n  Slower. Flexible. Can terminate TLS.\n  Examples: AWS ALB, NGINX, Envoy", "caption": "L4 load balancing forwards TCP bytes. L7 parses HTTP and routes by content.", "voice_alt_text": "Two diagrams. L4 load balancing: the LB sees TCP packets and forwards bytes to server A or B. It doesn't parse HTTP. Fast and opaque. Examples include AWS NLB and HAProxy. L7 load balancing: the LB parses HTTP and routes by path — /api goes to API servers, /static goes to CDN, /admin goes to admin servers. Slower but flexible, can terminate TLS. Examples include AWS ALB and NGINX."}},

        {"type": "prose", "id": "health-checks", "payload": {"text": "**Health checks:**\n\nA load balancer must know which backends are alive. It does this via **health checks** — periodic requests to each backend to verify it's responding.\n\n- **Active health check**: the LB sends a request (e.g., `GET /health` every 5 seconds). If the backend responds 200, it's healthy. If it responds 5xx or times out 3 times in a row, the LB marks it unhealthy and stops sending traffic.\n- **Passive health check**: the LB monitors real traffic. If a backend starts returning 5xx errors or timing out, the LB marks it unhealthy without sending a separate health check.\n\nWithout health checks, a dead backend keeps receiving traffic until the LB notices. With health checks, the LB detects failure in seconds and routes around it.\n\n**Health endpoint best practices:**\n- `GET /health` should return 200 with no side effects.\n- `GET /health/ready` should check dependencies (DB, cache) and return 503 if any are down.\n- Health checks should be cheap (no DB queries — just a 'I'm alive' signal).\n- Health checks should have a short timeout (1-2s)."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "Your web app stores user sessions in memory on each server. After adding a load balancer with round-robin, users complain they get logged out randomly. What is the root cause?", "shape": "mcq", "options": ["The load balancer is misconfigured.", "Sessions are stateful, so a user's request hits a different server than the one holding their session.", "Round-robin is too slow — switch to least-connections.", "The database is overloaded."], "answer_index": 1, "rationale": "In-memory sessions make servers stateful. Round-robin sends each request to a different server, so the user's session is on server A but their next request hits server B, which doesn't know them. The fix is either (a) move sessions to shared storage (Redis), making servers stateless, or (b) use sticky sessions (IP hash), which trades off failover for session continuity. Option (a) is strongly preferred — stateless servers are the foundation of horizontal scaling.", "difficulty": "solid"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "When would you choose L4 over L7 load balancing?", "shape": "mcq", "options": ["When you need to route by URL path.", "When you need maximum throughput and do not need HTTP-level routing.", "When you need to terminate TLS at the LB.", "L4 and L7 are interchangeable."], "answer_index": 1, "rationale": "L4 LBs operate on TCP/UDP bytes without parsing HTTP, so they are dramatically faster and cheaper per request. Use L4 for raw throughput (database connection pooling, gRPC, raw TCP services). Use L7 when you need HTTP-aware features: path-based routing, header manipulation, TLS termination, content-based routing.", "difficulty": "solid"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "Your load balancer has 3 backends. One backend starts returning 500 errors. What should happen?", "shape": "mcq", "options": ["The LB keeps sending traffic to it — it might recover.", "The LB's health check detects the errors, marks the backend unhealthy, and stops sending traffic to it. Traffic goes to the other 2.", "The LB crashes.", "The LB sends double traffic to the other 2 to compensate."], "answer_index": 1, "rationale": "Health checks detect failures automatically. If a backend starts returning 5xx errors (or timing out), the LB marks it unhealthy after a configurable threshold (e.g., 3 consecutive failures). New traffic goes to the healthy backends. The unhealthy backend is periodically re-checked; if it recovers, it's marked healthy and traffic resumes. This is called 'passive health checking' and is essential for fault tolerance.", "difficulty": "core"}}
    ],
    "trade_offs": {
        "pros": [
            "Horizontal scaling — add more servers to handle more traffic.",
            "Fault tolerance — lose a server, traffic shifts to the others.",
            "Rolling deploys — drain one server, update it, repeat. Zero downtime.",
            "Health checking — bad backends are removed automatically."
        ],
        "cons": [
            "The LB itself can be a single point of failure (mitigate with active-active pairs).",
            "Adds a network hop and a small amount of latency (~1ms).",
            "Requires stateless backends — moving session state to shared storage is real work.",
            "Cost: LB software/hardware, plus the compute to run it."
        ]
    },
    "failure_modes": [
        "The LB itself fails — single point of failure. Mitigated by active-active LB pairs (both receive traffic, either can handle it all).",
        "Sticky sessions as a default — they defeat failover and complicate scaling.",
        "Forgetting health checks — a dead backend keeps receiving traffic until the LB notices.",
        "Single LB without redundancy — the LB is now your SPOF.",
        "Mixed L4 and L7 without thinking — L7 in front of L4 in front of L7 is over-engineering."
    ],
    "common_mistakes": [
        "Sticky sessions as a default. They defeat failover and complicate scaling. Move sessions to Redis instead.",
        "Forgetting health checks. A dead backend will keep receiving traffic until the LB notices.",
        "Single LB without redundancy. The LB is now your SPOF.",
        "Mixing L4 and L7 without thinking. L7 in front of L4 in front of L7 is a common over-engineering smell."
    ],
    "where_you_see_it": [
        "Every production web service with more than one server.",
        "NGINX, HAProxy, AWS ALB/NLB, Cloudflare load balancing, Envoy.",
        "Service mesh sidecars (Istio, Linkerd) are LBs running next to your app."
    ],
    "interview_prompts": [
        "Design a load balancer for a globally-distributed API with 1M requests per second.",
        "How do you ensure your load balancer is not a single point of failure?",
        "When would you use sticky sessions, and what do they cost you?",
        "Explain the difference between L4 and L7 load balancing with examples.",
        "How do health checks work? What's the difference between active and passive?"
    ],
    "real_system_mappings": [
        {"system": "NGINX", "how": "The most popular open-source L7 LB. Used as a reverse proxy, load balancer, and static file server. Powers ~30% of the web."},
        {"system": "AWS ALB", "how": "Managed L7 load balancer with path-based routing, TLS termination, target group health checks, and integration with ECS/EKS. Pay per LCUs (load balancer capacity units)."}
    ],
    "status": "published",
})

print("\n✅ Networking content written")
