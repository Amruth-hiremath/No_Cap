#!/usr/bin/env python3
"""
content-enrichment-batch2.py — Idempotent enrichment script.

For each of 11 priority concept JSON files in content/concepts/:
  - APPENDS new lesson blocks (prose, mermaid, callout, quiz, table, code)
    to the existing `blocks` array. Existing blocks are preserved verbatim.
  - MERGES a `sources` array at the top level (dedup by URL).

Idempotent: re-running skips blocks whose `id` already exists and skips
sources whose `url` already exists.
"""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CONCEPTS_DIR = REPO / "content" / "concepts"

# ──────────────────────────────────────────────────────────────────────────
# 1. what-is-system-design
# ──────────────────────────────────────────────────────────────────────────
WHAT_IS_SYSTEM_DESIGN = {
    "blocks": [
        {
            "type": "prose",
            "id": "netflix-evolution-b2",
            "payload": {
                "text": (
                    "**Real architectures evolve with scale — Netflix as a worked example.**\n\n"
                    "Netflix started in 1997 as a single monolithic application talking to a single "
                    "Oracle database — the kind of system one team could deploy on a Friday afternoon. "
                    "That worked while Netflix was a DVD-by-mail service shipping a few thousand discs a day. "
                    "Then they launched streaming in 2007, and the geometry of the problem changed overnight: "
                    "a DVD shipment is one event per user per week; a streaming session is hundreds of "
                    "requests per user per hour, from anywhere on earth, on any device, with sub-second "
                    "latency expectations.\n\n"
                    "The evolution (documented across a decade of Netflix engineering blog posts and postmortems):\n\n"
                    "- **2008–2010**: monolith → horizontally-scaled stateless web tier behind AWS Elastic "
                    "Load Balancer; Oracle replaced with sharded MySQL for the billing system that needed ACID; "
                    "Cassandra introduced for viewing-history (massive writes, eventual consistency tolerated).\n"
                    "- **2010–2013**: full migration to AWS — their own datacenters shut down. Per-service "
                    "microservices replaced the monolith. EVCache (a Memcached-derived distributed cache) "
                    "absorbs 90%+ of reads. Zuul (reverse proxy / API gateway) sits in front of all services. "
                    "Hystrix (circuit breaker) isolates per-service failures.\n"
                    "- **2013–2018**: global expansion drives multi-region active-active. Cassandra clusters "
                    "span AWS regions. Chaos Monkey randomly kills production instances to force engineers to "
                    "design for failure — the origin of the Simian Army chaos-engineering practice.\n"
                    "- **2018–present**: Spinnaker (continuous delivery) does thousands of deployments per day. "
                    "Each service owns its own data store; no shared database across services. Edge traffic "
                    "flows through Amazon's global CDN plus their own Open Connect appliances inside ISP facilities.\n\n"
                    "The Netflix story is not 'we used microservices and Kafka'. It is 'each step of growth "
                    "forced a specific architectural change, and each change was a trade-off.' Going from "
                    "monolith to microservices bought independent deploys and per-service scaling at the cost "
                    "of distributed-systems complexity, eventual consistency between services, and a much "
                    "harder debugging story. EVCache bought a 90% cache hit rate at the cost of an in-memory "
                    "store that, when it crashes, drops a multi-gigabyte-per-second read load straight onto "
                    "Cassandra. Every architecture decision at Netflix is a trade-off, and the trade-offs compound."
                )
            }
        },
        {
            "type": "mermaid",
            "id": "decision-areas-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    Req[Requirements<br/>scale, latency, consistency, cost, budget] --> Decide\n"
                    "    subgraph Decide[5 Decision Areas]\n"
                    "        direction TB\n"
                    "        Comp[1. Components<br/>services, queues, caches, stores]\n"
                    "        Comm[2. Communication<br/>sync RPC vs async queue vs stream]\n"
                    "        Data[3. Data<br/>SQL, KV, document, wide-column, object]\n"
                    "        Fail[4. Failure<br/>replicas, fallbacks, circuit breakers]\n"
                    "        Scal[5. Scale<br/>stateless nodes, shards, regions]\n"
                    "        Comp --> Comm --> Data --> Fail --> Scal\n"
                    "    end\n"
                    "    Decide --> ToF[Trade-offs<br/>explicit, defensible]\n"
                    "    ToF --> Arch[Concrete architecture]\n"
                    "    Arch -.feedback.-> Req\n"
                    "\n"
                    "    classDef area fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef io fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class Comp,Comm,Data,Fail,Scal area\n"
                    "    class Req,ToF,Arch io"
                ),
                "caption": "The five decision areas, fed by requirements, output as a concrete architecture with explicit trade-offs.",
                "alt_text": "A flowchart. Requirements (scale, latency, consistency, cost, budget) flow into a subgraph labelled '5 Decision Areas' containing five sequential nodes: 1. Components, 2. Communication, 3. Data, 4. Failure, 5. Scale. The subgraph outputs Trade-offs (explicit, defensible), which produces a Concrete architecture. A dotted feedback arrow returns from Architecture back to Requirements — signifying that design is iterative."
            }
        },
        {
            "type": "prose",
            "id": "scaling-orders-of-magnitude-b2",
            "payload": {
                "text": (
                    "**Scaling changes the system at every order of magnitude.**\n\n"
                    "A useful mental model: each 10x in load forces a different architectural decision. "
                    "Missing the transition kills companies.\n\n"
                    "- **100 → 1,000 users** (a single server works): you are programming, not designing. "
                    "Focus on correctness and ship.\n"
                    "- **1,000 → 10,000 users** (single server strains): introduce a load balancer + a "
                    "second app server, add a cache for hot reads, offload static assets to a CDN. The "
                    "database is still one box.\n"
                    "- **10,000 → 100,000 users** (database becomes the bottleneck): add read replicas, "
                    "move sessions to Redis, move file uploads to S3. App servers are now stateless.\n"
                    "- **100,000 → 1,000,000 users** (single-region ceiling): shard the database, add "
                    "message queues for async work, introduce a service mesh. Deploy across multiple AZs.\n"
                    "- **1,000,000 → 10,000,000 users** (one region is not enough): go multi-region. "
                    "Active-active with conflict resolution, geo-routed traffic, global CDN. Each region "
                    "now contains a full stack.\n"
                    "- **10,000,000+** (the global internet-scale tier): custom protocols (QUIC), "
                    "edge compute (Cloudflare Workers, Lambda@Edge), purpose-built databases (Spanner, "
                    "DynamoDB), chaos engineering as a routine practice.\n\n"
                    "The common failure mode is jumping two steps ahead — adopting Kafka and sharded "
                    "Cassandra at 5,000 users because 'we'll need it eventually'. You won't, or you will "
                    "need something different by the time you do. The second-most-common failure mode is "
                    "refusing to take the next step — running a single MySQL box at 500,000 users because "
                    "'it's simpler'. Both are expensive, in opposite directions."
                )
            }
        },
        {
            "type": "callout",
            "id": "tradeoff-matrix-b2",
            "payload": {
                "title": "Trade-off analysis: write down what you give up",
                "body": (
                    "Every senior design conversation ends with an explicit trade-off matrix. For each "
                    "option, name (a) what it gives you, (b) what it costs, and (c) under what condition "
                    "it breaks. Example: 'Redis cache gives sub-millisecond reads, costs in-memory RAM "
                    "($/GB) and risks data loss on crash, breaks when the working set exceeds RAM or "
                    "when invalidation falls behind writes.' If you can't fill in column (c), you don't "
                    "yet understand the choice. The most common design failure is not picking the wrong "
                    "technology — it's picking a technology without knowing when it will betray you."
                ),
                "kind": "note"
            }
        },
        {
            "type": "quiz",
            "id": "q-interview-b2",
            "payload": {
                "question": (
                    "In a system design interview, after you sketch a CDN → load balancer → stateless "
                    "app services → Cassandra diagram for 'Design Netflix', the interviewer asks: "
                    "'So you'd just use Cassandra everywhere?' What is the strongest response?"
                ),
                "shape": "mcq",
                "options": [
                    "Yes — Cassandra handles massive writes, so it's the right choice for all our data.",
                    "No — I'd use Cassandra for viewing history (high write volume, eventual consistency OK), PostgreSQL for billing (ACID required for payments), Redis for hot-content caches, and S3 for the actual video files. Each store is chosen for its access pattern.",
                    "It depends — I'd start with Cassandra everywhere and migrate later if needed.",
                    "Actually I'd use DynamoDB because it's managed by AWS."
                ],
                "answer_index": 1,
                "rationale": (
                    "Cassandra is excellent for time-series writes (viewing history) but the wrong choice "
                    "for billing data which requires ACID transactions, foreign-key constraints, and joins. "
                    "Polyglot persistence — using different databases for different access patterns — is "
                    "exactly how Netflix actually built it: Cassandra for viewing history, MySQL for "
                    "billing, EVCache/Redis for cache, S3 for media. Option 1 ('Cassandra everywhere') "
                    "signals cargo-culting a single technology without reasoning about workloads. "
                    "Option 3 ('start with Cassandra and migrate') is the worst kind of hedging — "
                    "database migration is one of the most expensive engineering projects in existence, "
                    "and 'we'll fix it later' usually means 'we'll fix it after an outage'. Option 4 "
                    "(DynamoDB) is a technology choice without reasoning — managed != better. The "
                    "interview-correct response names a specific workload, its requirements, and a "
                    "matching technology, with the trade-off made explicit. That is what system design "
                    "actually is."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "The Twelve-Factor App",
            "url": "https://12factor.net/",
            "publisher": "Heroku / Adam Wiggins",
            "type": "official-doc"
        },
        {
            "title": "AWS Well-Architected Framework",
            "url": "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
            "publisher": "Amazon Web Services",
            "type": "official-doc"
        },
        {
            "title": "Site Reliability Engineering (Google SRE Book)",
            "url": "https://sre.google/sre-book/table-of-contents/",
            "publisher": "Google",
            "type": "book"
        },
        {
            "title": "Netflix TechBlog — Architecture",
            "url": "https://netflixtechblog.com/",
            "publisher": "Netflix",
            "type": "blog"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 2. how-to-approach-system-design
# ──────────────────────────────────────────────────────────────────────────
HOW_TO_APPROACH = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "process-flowchart-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    Start([Interview starts]) --> S1\n"
                    "    S1[1. Clarify<br/>functional + non-functional] --> S2\n"
                    "    S2[2. Capacity<br/>QPS, storage, bandwidth] --> S3\n"
                    "    S3[3. APIs<br/>REST / RPC contract] --> S4\n"
                    "    S4[4. Data model<br/>entities + store choice] --> S5\n"
                    "    S5[5. High-level design<br/>boxes and arrows] --> S6\n"
                    "    S6[6. Deep dive<br/>1-2 hardest components] --> S7\n"
                    "    S7[7. Bottlenecks<br/>what breaks first?] --> S8\n"
                    "    S8[8. Trade-offs<br/>alternatives + what you give up] --> End([Done])\n"
                    "\n"
                    "    S1 -.interviewer may push back.-> S1\n"
                    "    S6 -.may revise S4.-> S4\n"
                    "    S7 -.may revise S5.-> S5\n"
                    "\n"
                    "    classDef step fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef io fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class S1,S2,S3,S4,S5,S6,S7,S8 step\n"
                    "    class Start,End io"
                ),
                "caption": "The 8-step system-design skeleton, with feedback loops where interviewers (or new constraints) may force a revision.",
                "alt_text": "A vertical flowchart of the 8-step approach: clarify requirements, capacity estimation, APIs, data model, high-level design, deep dive, bottlenecks, trade-offs. Dotted feedback arrows show that step 1 can loop on interviewer pushback, step 6 may force a revision of step 4 (data model), and step 7 may force a revision of step 5 (high-level design)."
            }
        },
        {
            "type": "prose",
            "id": "capacity-worked-example-b2",
            "payload": {
                "text": (
                    "**Capacity estimation, fully worked: 'Design a URL shortener'.**\n\n"
                    "Assume the requirement: 100M new URLs per month, with a 100:1 read:write ratio.\n\n"
                    "*Write QPS:*\n"
                    "- 100M URLs / 30 days ≈ 38 URLs/sec average write rate\n"
                    "- Peak = 5x average = ~190 URLs/sec. Trivial — any database can do this.\n\n"
                    "*Read QPS:*\n"
                    "- 100M writes × 100 reads/write = 10B reads/month\n"
                    "- 10B / 2.59M seconds ≈ 3,860 reads/sec average\n"
                    "- Peak = 3-5x = ~12,000-19,000 reads/sec. Now we need engineering.\n\n"
                    "*Storage:*\n"
                    "- Each URL record: ~200 bytes (short code, long URL, user_id, timestamps)\n"
                    "- 100M URLs × 200 bytes = 20 GB/month = 240 GB/year\n"
                    "- 5-year horizon: ~1.2 TB. Fits on one machine, but you don't want to.\n\n"
                    "*Bandwidth:*\n"
                    "- Average read: ~50 bytes response (the long URL or a 301)\n"
                    "- 3,860 reads/sec × 50 bytes = ~193 KB/sec = trivial\n"
                    "- BUT if we include analytics (referrer, geo, user-agent): ~500 bytes per click event\n"
                    "- 10B click events/month × 500 bytes = 5 TB/month of analytics. Object storage territory.\n\n"
                    "*Cache sizing (Pareto):*\n"
                    "- 80% of traffic hits 20% of URLs (the viral ones)\n"
                    "- Hot set in any given day: ~20% of recent URLs × 100M/year ÷ 365 days ≈ 55K URLs/day hot\n"
                    "- 55K × 200 bytes = ~11 MB — fits in any Redis instance\n"
                    "- Cache hit rate target: 95%. The cache absorbs ~95% of reads.\n\n"
                    "*Conclusion from these numbers:*\n"
                    "- 19K reads/sec at peak: 3-5 app servers behind a load balancer (each handles 5K reads/sec)\n"
                    "- Database: 1 primary + 2 read replicas (since 95% of reads hit cache, only 5% × 19K = ~950 reads/sec hit DB)\n"
                    "- Analytics: write to a Kafka queue → consumer → S3/Cassandra (no need to write synchronously)\n"
                    "- Storage: 240 GB/year fits on a single Postgres instance for years, but plan for sharding by year-3.\n\n"
                    "Notice how the numbers DRIVE the architecture. 19K reads/sec demands multiple app servers + cache. "
                    "5 TB/month of analytics demands async + object storage. 38 URLs/sec write rate is trivial — no need "
                    "for sharding, Kafka-for-writes, or exotic databases. The arithmetic pre-empts the technology choice."
                )
            }
        },
        {
            "type": "prose",
            "id": "scaling-implications-b2",
            "payload": {
                "text": (
                    "**Scaling a system design interview answer — depth beats breadth.**\n\n"
                    "The single biggest mistake mid-level engineers make in a design interview is "
                    "presenting a wide, shallow architecture: ten boxes, one paragraph each, no depth. "
                    "Senior interviewers redirect: 'Pick the hardest component and design it in detail.' "
                    "This is where you actually demonstrate system-design skill.\n\n"
                    "A useful rule: spend 30% of your time on the high-level diagram and 50% on one deep "
                    "dive. For 'Design Twitter', don't try to design the API, the user service, the "
                    "notification service, AND the timeline cache at depth — pick the timeline cache. "
                    "Discuss fan-out-on-write vs fan-out-on-read; explain the celebrity problem (a user "
                    "with 30M followers would amplify every tweet to 30M cache entries); propose the "
                    "hybrid (normal users fan-out on write, celebrities fan-out on read); show the "
                    "Redis sorted-set data structure and explain why it's O(log N) for insertion; "
                    "discuss cache invalidation when a tweet is deleted.\n\n"
                    "The reason depth matters: shallow designs are interchangeable — anyone can list 'CDN, "
                    "load balancer, app servers, database'. Depth reveals the trade-offs and the "
                    "understanding. An interviewer learns nothing from a wide diagram they couldn't have "
                    "drawn themselves. They learn whether you can reason about a specific hard problem "
                    "by watching you deep-dive it."
                )
            }
        },
        {
            "type": "callout",
            "id": "interview-mistakes-b2",
            "payload": {
                "title": "Top 5 interview-killer mistakes",
                "body": (
                    "(1) **Jumping to technology** — saying 'Kafka + Cassandra' before clarifying the read/write "
                    "ratio. (2) **Ignoring the interviewer's hints** — they say 'what about failures?' and you "
                    "keep drawing happy-path boxes. (3) **Deep-diving the easy part** — spending 10 minutes on "
                    "the load balancer when the hard part is the timeline cache. (4) **No trade-offs** — naming "
                    "technologies without saying what they cost. (5) **Silence** — designing in your head for 30 "
                    "seconds while the interviewer stares at a blank whiteboard. Talk out loud, even your dead-ends."
                ),
                "kind": "warning"
            }
        },
        {
            "type": "quiz",
            "id": "q-tradeoff-b2",
            "payload": {
                "question": (
                    "You're designing a notification system that must send 10,000 push notifications per "
                    "second at peak. The interviewer asks: 'Should we use Kafka or RabbitMQ?' What is "
                    "the strongest first response?"
                ),
                "shape": "mcq",
                "options": [
                    "Kafka — it's designed for high throughput, so it's the obvious choice.",
                    "RabbitMQ — it has lower latency and per-message routing, which is better for notifications.",
                    "Before choosing, I need to know: are notifications ordered per-user? Do we need exactly-once delivery? What's the consumer fan-out pattern — one consumer per device, or batched? What's the message size, and how long must we retain undelivered messages?",
                    "Either will work — let's pick Kafka since it's more popular."
                ],
                "answer_index": 2,
                "rationale": (
                    "Kafka and RabbitMQ are NOT interchangeable. Kafka is an append-only log optimized for "
                    "high-throughput, ordered, partitioned streams with consumer groups — it shines for "
                    "event pipelines and replay. RabbitMQ is a classic message broker with rich routing "
                    "(topic exchanges, fanout), per-message ACK, and lower per-message latency — it shines "
                    "for work-distribution and request-reply. The right answer depends on the workload's "
                    "shape: ordered per-user delivery favors Kafka (partition by user_id); rich routing "
                    "and per-message ACK favor RabbitMQ; both can hit 10K msgs/sec. Option 1 (Kafka) and "
                    "Option 2 (RabbitMQ) both commit to a technology before clarifying requirements — the "
                    "single most common interview failure. Option 4 ('either will work') signals you don't "
                    "know the difference. The correct response names the specific questions whose answers "
                    "would distinguish Kafka from RabbitMQ for this workload. That is the entire skill of "
                    "system design: knowing what to ask before deciding."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "AWS Well-Architected Framework",
            "url": "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
            "publisher": "Amazon Web Services",
            "type": "official-doc"
        },
        {
            "title": "Google — How to Write a Design Doc",
            "url": "https://www.industrialempathy.com/posts/design-docs-at-google/",
            "publisher": "Malte Ubl / Google",
            "type": "blog"
        },
        {
            "title": "System Design Interview (Alex Xu)",
            "url": "https://www.systeminterview.com/",
            "publisher": "Alex Xu",
            "type": "book"
        },
        {
            "title": "The System Design Primer",
            "url": "https://github.com/donnemartin/system-design-primer",
            "publisher": "Donne Martin (open source)",
            "type": "github"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 3. udp
# ──────────────────────────────────────────────────────────────────────────
UDP = {
    "blocks": [
        {
            "type": "table",
            "id": "tcp-udp-table-b2",
            "payload": {
                "headers": ["Property", "TCP", "UDP"],
                "rows": [
                    ["Header size", "20+ bytes (with options)", "8 bytes (fixed)"],
                    ["Connection model", "Connection-oriented (3-way handshake)", "Connectionless (fire-and-forget)"],
                    ["Setup latency", "1 RTT before first byte", "0 RTT (immediate)"],
                    ["Reliability", "Guaranteed delivery (ACKs + retransmission)", "Best-effort (may be lost, duplicated, reordered)"],
                    ["Ordering", "In-order delivery", "No ordering guarantee"],
                    ["Flow control", "Sliding window", "None"],
                    ["Congestion control", "Built-in (CUBIC, BBR)", "None — application must implement"],
                    ["Head-of-line blocking", "Yes — lost packet stalls all later packets", "No — each datagram independent"],
                    ["Stream multiplexing", "One stream per connection (HTTP/2 works around this)", "Each datagram independent (QUIC uses this for per-stream reliability)"],
                    ["Multicast / broadcast", "No (point-to-point only)", "Yes (one-to-many native)"],
                    ["Typical uses", "Web, email, file transfer, RPC", "DNS, voice/video, gaming, QUIC/HTTP/3"]
                ],
                "caption": "TCP vs UDP across the dimensions that actually affect design decisions."
            }
        },
        {
            "type": "mermaid",
            "id": "udp-use-cases-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    subgraph DNS[DNS Lookup]\n"
                    "        D1[Resolver] -->|1 datagram query| D2[Authoritative]\n"
                    "        D2 -->|1 datagram response| D1\n"
                    "    end\n"
                    "    subgraph VoIP[Voice / Video Call]\n"
                    "        V1[Sender] -->|60 fps frame<br/>20ms audio chunks| V2[Receiver]\n"
                    "        V2 -.interpolates from<br/>whatever arrives.-> V1\n"
                    "    end\n"
                    "    subgraph Game[Online Game]\n"
                    "        G1[Client] -->|position update 60 Hz| G2[Server]\n"
                    "        G2 -->|world state 20 Hz| G1\n"
                    "        G1 -.stale updates silently dropped.-> G1\n"
                    "    end\n"
                    "    subgraph QUIC[HTTP/3 over QUIC]\n"
                    "        Q1[Browser] -->|per-stream reliable frames| Q2[Server]\n"
                    "        Q2 -->|0-RTT resume<br/>connection migration| Q1\n"
                    "    end\n"
                    "\n"
                    "    classDef app fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    class D1,D2,V1,V2,G1,G2,Q1,Q2 app"
                ),
                "caption": "Four canonical UDP workloads — each chooses UDP because late data is worse than missing data.",
                "alt_text": "Four sub-diagrams of UDP use cases. DNS: resolver sends one datagram query, authoritative server sends one datagram response — no handshake. Voice/video: sender sends 60 fps video frames and 20ms audio chunks; receiver interpolates from whatever arrives. Online game: client sends position updates at 60 Hz, server sends world state at 20 Hz, stale updates are silently dropped. HTTP/3 over QUIC: browser sends per-stream reliable frames; server resumes with 0-RTT and supports connection migration across networks."
            }
        },
        {
            "type": "callout",
            "id": "quic-youtube-b2",
            "payload": {
                "title": "Real example: Google QUIC on YouTube",
                "body": (
                    "Google began deploying QUIC (a UDP-based transport that rebuilds TCP+TLS semantics "
                    "with per-stream reliability and 0-RTT setup) on youtube.com in 2013. They reported "
                    "(IETF 97, 2016) that QUIC reduced video rebuffering by 30% on YouTube and cut "
                    "search latency by 8% on mobile — specifically because per-stream reliability "
                    "eliminated the head-of-line blocking where one lost packet stalled every multiplexed "
                    "HTTP/2 stream. By 2023, ~25% of all internet traffic runs over QUIC. The lesson: "
                    "UDP is not 'faster than TCP' — it's a substrate on which an application can build "
                    "exactly the reliability it needs. QUIC is essentially the size of TCP+TLS combined; "
                    "the win is that the application, not the kernel, controls the trade-offs."
                ),
                "kind": "note"
            }
        },
        {
            "type": "prose",
            "id": "failure-scenarios-b2",
            "payload": {
                "text": (
                    "**UDP failure scenarios — what breaks in production.**\n\n"
                    "(1) **Amplification attack.** DNS over UDP is the textbook example: a 60-byte spoofed "
                    "query triggers a 4000-byte DNSSEC response, ~70x amplification. The attacker forges "
                    "the source IP to be the victim's; DNS resolvers worldwide pummel the victim. Mitigation: "
                    "DNS Cookies (RFC 7873), rate-limiting per source IP, and response-size limits.\n\n"
                    "(2) **NAT timeout mid-call.** Home NAT boxes expire UDP mappings after 30 seconds of "
                    "inactivity. A video call that pauses audio for 60 seconds (mute, hold) loses its NAT "
                    "mapping — audio never returns even when unmuted. This is why every WebRTC client sends "
                    "STUN keepalives every 20 seconds, and why your video call occasionally needs to be "
                    "re-initiated.\n\n"
                    "(3) **Path MTU surprises.** A 1473-byte UDP datagram fragments at the IP layer into two "
                    "fragments. If either fragment is lost, the entire datagram is dropped — so a 0.5% per-"
                    "fragment loss rate becomes a ~1% datagram loss rate, doubling effective loss. Modern "
                    "QUIC implementations aggressively stay under 1200 bytes per packet to avoid fragmentation "
                    "across path-MTU-discovered paths.\n\n"
                    "(4) **No congestion control collapses the network.** A naive UDP video sender that does "
                    "not implement BBR or CUBIC will saturate the bottleneck link and starve TCP traffic "
                    "(which DOES back off). This is the 1986 internet congestion collapse pattern, repeated "
                    "in modern clothes — it's why every production UDP protocol (QUIC, WebRTC, RTSP) ships "
                    "with its own congestion control.\n\n"
                    "(5) **Corporate firewall blocking.** Many enterprises allow TCP 443 by default but "
                    "block or rate-limit UDP. A QUIC deployment without TCP fallback will silently fail for "
                    "10-20% of corporate users. This is why browsers fall back to HTTP/2 over TCP when "
                    "QUIC fails — and why 'we run on UDP' is a deployment problem, not just a protocol choice."
                )
            }
        },
        {
            "type": "prose",
            "id": "scaling-implications-b2",
            "payload": {
                "text": (
                    "**UDP scaling implications.**\n\n"
                    "UDP scales to enormous aggregate throughput because the kernel keeps no per-connection "
                    "state. A single Linux box can service hundreds of thousands of concurrent DNS queries "
                    "per second because each query is one datagram in, one out, with no handshake, no "
                    "retransmission buffer, no congestion window. Compare to TCP: each connection requires "
                    "kernel memory for send/receive buffers, congestion state, and timers — typically "
                    "10-50 KB per connection, which caps a single machine at ~100K-1M concurrent connections "
                    "(the well-known C10K problem, extended to C1M).\n\n"
                    "This is exactly why DNS resolvers, NTP servers, and QUIC terminators can handle millions "
                    "of concurrent clients on modest hardware. It's also why Redis (single-threaded, "
                    "in-memory, custom protocol) used to support UDP for sub-millisecond lookups before "
                    "deprecating it for security reasons.\n\n"
                    "But the scaling advantage disappears the moment you implement reliability on top. A "
                    "QUIC terminator that tracks per-stream ACK state and retransmission buffers uses "
                    "kernel-or-userspace memory similar to a TCP terminator. The 'UDP is more scalable' "
                    "truth only holds for fire-and-forget workloads: DNS, syslog, SNMP traps, VoIP keepalives. "
                    "For everything else, UDP is a substrate that lets the application choose its scaling "
                    "trade-offs — but the application then has to actually make those choices."
                )
            }
        },
        {
            "type": "quiz",
            "id": "q-quic-youtube-b2",
            "payload": {
                "question": (
                    "A product team is choosing between HTTP/2 (over TCP) and HTTP/3 (over QUIC, which "
                    "runs over UDP) for a media-heavy web app with significant mobile users on flaky "
                    "cellular networks. Which benefit most directly justifies choosing HTTP/3?"
                ),
                "shape": "mcq",
                "options": [
                    "HTTP/3 is faster because UDP has a smaller header than TCP.",
                    "HTTP/3 eliminates head-of-line blocking between multiplexed streams — a lost packet on one stream no longer stalls the others — which is critical when many media assets load in parallel over a lossy cellular link.",
                    "HTTP/3 supports TLS natively whereas HTTP/2 does not.",
                    "HTTP/3 uses less bandwidth because UDP datagrams are smaller than TCP segments."
                ],
                "answer_index": 1,
                "rationale": (
                    "The decisive HTTP/3 win is per-stream reliability. HTTP/2 multiplexes many streams "
                    "over a single TCP connection; if any TCP packet is lost, TCP blocks ALL streams until "
                    "the lost packet is retransmitted — this is head-of-line blocking at the transport layer. "
                    "On a lossy cellular link with parallel media downloads, this can stall the entire page. "
                    "QUIC rebuilds reliability per-stream, so a loss on stream A (say, a tracking pixel) "
                    "doesn't delay stream B (say, the hero video). Google's reported 30% reduction in "
                    "YouTube video rebuffering after QUIC deployment is attributable mostly to this. "
                    "Option 1 (UDP header is smaller) is true but minor (12 bytes saved per packet — "
                    "negligible vs the head-of-line fix). Option 3 is wrong: HTTP/2 uses TLS too. "
                    "Option 4 is wrong: HTTP/3 actually has slightly more per-packet overhead than "
                    "HTTP/2 because QUIC frames carry their own stream and offset metadata."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "RFC 768 — User Datagram Protocol",
            "url": "https://datatracker.ietf.org/doc/html/rfc768",
            "publisher": "IETF / J. Postel",
            "type": "rfc"
        },
        {
            "title": "RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport",
            "url": "https://datatracker.ietf.org/doc/html/rfc9000",
            "publisher": "IETF / IETF QUIC WG",
            "type": "rfc"
        },
        {
            "title": "The QUIC Transport Protocol — IETF 97 presentation (Google)",
            "url": "https://www.ietf.org/proceedings/97/slides/slides-97-quic-the-quic-transport-protocol-00.pdf",
            "publisher": "Google / IETF",
            "type": "presentation"
        },
        {
            "title": "Chromium — QUIC documentation",
            "url": "https://www.chromium.org/quic/",
            "publisher": "The Chromium Projects",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 4. load-balancers
# ──────────────────────────────────────────────────────────────────────────
LOAD_BALANCERS = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "l4-l7-comparison-b2",
            "payload": {
                "code": (
                    "flowchart TB\n"
                    "    Client[Client HTTPS request] --> LB\n"
                    "\n"
                    "    subgraph L4[L4 — Transport Layer]\n"
                    "        LB4[L4 LB<br/>sees TCP bytes only] --> B1[Backend 1]\n"
                    "        LB4 --> B2[Backend 2]\n"
                    "        Note4[Routes by 4-tuple<br/>src IP+port, dst IP+port<br/>No TLS termination<br/>~millions of conn/sec]\n"
                    "    end\n"
                    "\n"
                    "    subgraph L7[L7 — Application Layer]\n"
                    "        LB7[L7 LB<br/>parses HTTP, terminates TLS] --> Path1{/api/* → API servers}\n"
                    "        LB7 --> Path2{/static/* → CDN/object store}\n"
                    "        LB7 --> Path3{/admin/* → admin pool<br/>IP-allowlist}\n"
                    "        Note7[Routes by URL, headers, cookies<br/>TLS termination here<br/>~100K req/sec per node]\n"
                    "    end\n"
                    "\n"
                    "    Client -.or.-> LB7\n"
                    "\n"
                    "    classDef l4 fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef l7 fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef note fill:#2d1e3a,stroke:#a855f7,color:#f3e8ff\n"
                    "    class LB4,B1,B2 l4\n"
                    "    class LB7,Path1,Path2,Path3 l7\n"
                    "    class Note4,Note7 note"
                ),
                "caption": "L4 LBs forward TCP bytes by 4-tuple (fast, opaque). L7 LBs parse HTTP and route by path/headers (slower, flexible).",
                "alt_text": "Two load balancer types compared. L4: the load balancer sees TCP packets only and forwards bytes to Backend 1 or Backend 2, routing by source/destination IP+port — no TLS termination, millions of connections per second. L7: the load balancer parses HTTP and terminates TLS, then routes by URL path: /api goes to API servers, /static to CDN, /admin to admin pool with IP allowlist — slower but flexible."
            }
        },
        {
            "type": "mermaid",
            "id": "health-check-flow-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    LB[Load Balancer] -->|every 5s: GET /health| B1[Backend 1]\n"
                    "    LB -->|every 5s: GET /health| B2[Backend 2]\n"
                    "    LB -->|every 5s: GET /health| B3[Backend 3]\n"
                    "\n"
                    "    B1 -->|200 OK| LB\n"
                    "    B2 -->|200 OK| LB\n"
                    "    B3 -->|timeout / 5xx| LB\n"
                    "\n"
                    "    LB --> Count{Consecutive<br/>failures >= threshold?}\n"
                    "    Count -->|No| Healthy[Backend stays in rotation]\n"
                    "    Count -->|Yes<br/>e.g. 3 in a row| Unhealthy[Mark UNHEALTHY<br/>stop sending traffic]\n"
                    "    Unhealthy --> Recheck[Continue probing<br/>every 30s instead of 5s]\n"
                    "    Recheck --> Recover{Recovers?}\n"
                    "    Recover -->|2 successes in a row| Healthy\n"
                    "    Recover -->|Still failing| Recheck\n"
                    "\n"
                    "    classDef ok fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    classDef warn fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class B1,B2,Healthy,Recover ok\n"
                    "    class B3,Unhealthy bad\n"
                    "    class Count,Recheck warn"
                ),
                "caption": "Active health check flow with consecutive-failure threshold and recovery hysteresis.",
                "alt_text": "A load balancer polls each backend every 5 seconds with GET /health. Backends 1 and 2 return 200 OK. Backend 3 times out. The LB counts consecutive failures; if it crosses a threshold (e.g., 3 in a row), the backend is marked UNHEALTHY and removed from rotation. The LB continues probing every 30 seconds; recovery requires 2 consecutive successes before the backend rejoins the rotation."
            }
        },
        {
            "type": "table",
            "id": "rr-vs-lc-b2",
            "payload": {
                "headers": ["Dimension", "Round Robin", "Least Connections"],
                "rows": [
                    ["Decision basis", "Cyclic position in pool", "Current active connection count per backend"],
                    ["Best when", "All backends have equal capacity and similar request durations", "Request durations vary widely (some slow, some fast)"],
                    ["Failure mode", "Slow backend accumulates queued requests because RR keeps sending to it", "Avoids overloading slow backends; new requests go to the least-loaded"],
                    ["Cost per decision", "O(1) — increment a counter", "O(N) — must compare all backends (or maintain a heap)"],
                    ["State required", "Last index (1 integer)", "Per-backend connection count"],
                    ["Sticky behavior", "Deterministic given same client order", "Adapts to live load"],
                    ["Default in", "NGINX, AWS ALB, HAProxy", "Envoy, HAProxy (option), Linkerd"],
                    ["Example fail", "A 10s request hits backend A; RR sends 4 more to A in the meantime; A is overloaded while B sits idle.", "LC sees A has 5 active connections; sends the next request to B (0 active)."]
                ],
                "caption": "Round-robin vs least-connections across the dimensions that actually matter in production."
            }
        },
        {
            "type": "prose",
            "id": "aws-alb-nlb-b2",
            "payload": {
                "text": (
                    "**Real example: AWS ALB vs NLB — when to pick which.**\n\n"
                    "AWS offers two managed load balancers that look similar but solve very different problems.\n\n"
                    "**Application Load Balancer (ALB)** operates at L7. It terminates TLS, parses HTTP, and "
                    "routes by URL path, host header, or HTTP header. It supports weighted target groups "
                    "(canary deploys), WebSocket and HTTP/2 natively, and integrates with ECS/Kubernetes "
                    "via IP-target mode. ALB is the right choice for any HTTP-based API or web app — it "
                    "can route `/api/v1/*` to one service and `/api/v2/*` to another on the same listener. "
                    "It does NOT support non-HTTP protocols. Pricing is per-LCU (Load Balancer Capacity "
                    "Unit, a blend of new connections, active connections, bandwidth, and rule evaluations).\n\n"
                    "**Network Load Balancer (NLB)** operates at L4. It sees TCP/UDP packets, forwards them "
                    "to targets by 4-tuple, and terminates nothing (TLS passthrough is the default). NLB "
                    "is the right choice for: TCP-based protocols (database connections, SMTP, custom "
                    "binary protocols), UDP (DNS, gaming, QUIC), extreme throughput (millions of "
                    "connections/sec, zonal-static anycast IPs that survive AZ failures), and "
                    "ultra-low-latency requirements where every microsecond of L7 parsing matters. "
                    "Pricing is per NLB-hour + per-GB processed.\n\n"
                    "A common production pattern uses both: a single NLB at the edge terminates TLS for "
                    "the apex domain; ALBs behind it do path-based routing for each microservice. The NLB "
                    "gives you a static, anycast IP that doesn't change across AZ failures; the ALBs "
                    "give you per-service path routing and ECS integration. Costs are higher than a single "
                    "ALB, but you get both the L4 throughput ceiling and the L7 flexibility."
                )
            }
        },
        {
            "type": "prose",
            "id": "sticky-session-failure-b2",
            "payload": {
                "text": (
                    "**Real failure: the sticky-session trap that took down a major e-commerce site.**\n\n"
                    "A pattern seen repeatedly in incident postmortems: a team runs N app servers "
                    "behind a load balancer, holds user sessions in memory on each server, and uses "
                    "sticky sessions to route each user to the server holding their session.\n\n"
                    "What kills them: when one of the N servers dies (hardware, deploy, OOM), every "
                    "user whose session lived on that server is suddenly logged out and loses in-flight "
                    "cart contents. If 1 of 5 servers dies, 20% of users are simultaneously affected. "
                    "The support team gets a flood of complaints, the engineering team rolls back the "
                    "deploy, and the cause is misdiagnosed as 'the deploy' rather than the architecture.\n\n"
                    "The fix that prevents recurrence: externalize sessions to Redis. Now sessions "
                    "survive any single server death, the load balancer can use round-robin or "
                    "least-connections, deploys are zero-downtime, and the team can scale by adding "
                    "servers without worrying about session affinity.\n\n"
                    "The deeper lesson: sticky sessions are not a scaling strategy — they're an "
                    "admission that the architecture is not actually horizontally scaled. True "
                    "horizontal scaling requires statelessness, and statelessness requires externalized "
                    "state. Anything else is a single-point-of-failure dressed up as redundancy."
                )
            }
        },
        {
            "type": "callout",
            "id": "spof-b2",
            "payload": {
                "title": "Your load balancer is the single point of failure you forgot to design out",
                "body": (
                    "A single LB in front of 50 stateless app servers is just 1 server with 50 backends — "
                    "and that 1 server can die. AWS mitigates this with managed HA across AZs (ALB/NLB "
                    "automatically), but self-hosted NGINX/HAProxy does NOT — you must run an active-active "
                    "pair with VRRP/Keepalived or front them with an L4 anycast. The classic failure: a "
                    "team runs HAProxy in Docker on one EC2 instance 'just for now', it dies in a "
                    "maintenance event, the whole site is down even though every app server is healthy. "
                    "Design the LB's redundancy before you need it."
                ),
                "kind": "warning"
            }
        },
        {
            "type": "quiz",
            "id": "q-algorithm-b2",
            "payload": {
                "question": (
                    "Your image-processing API has 6 backend servers. Each request downloads an image, "
                    "generates 5 thumbnails, and uploads them to S3 — request durations range from 200ms "
                    "(small image) to 30 seconds (huge image). Users report intermittent timeouts. The "
                    "load balancer uses round-robin. What is the strongest fix?"
                ),
                "shape": "mcq",
                "options": [
                    "Add more backends — there's not enough capacity.",
                    "Switch the LB algorithm from round-robin to least-connections so that slow requests don't pile up on whichever backend happened to receive several in a row.",
                    "Increase the LB's health-check timeout.",
                    "Use sticky sessions so each user always hits the same backend."
                ],
                "answer_index": 1,
                "rationale": (
                    "This is the textbook case where round-robin fails. RR doesn't see how many active "
                    "connections each backend has — it just rotates. If backend 3 receives a 30-second "
                    "request, then another, then another (purely by cyclic chance), it queues up dozens "
                    "of slow jobs while backend 4 sits idle. Least-connections (LC) explicitly tracks "
                    "active connections per backend and routes new requests to the least-loaded. With "
                    "wildly varying request durations (200ms vs 30s — 150x spread), LC prevents the "
                    "pile-up that RR creates. Option 1 (more backends) might mask the symptom but "
                    "doesn't fix the routing pathology — the same RR pattern recurs at higher capacity. "
                    "Option 3 (longer health-check timeout) makes the LB slower to detect real failures. "
                    "Option 4 (sticky sessions) is actively harmful: it forces a user onto one backend "
                    "regardless of load, defeats failover, and makes the problem worse if their requests "
                    "are heavy. The deeper lesson: round-robin assumes roughly equal request durations. "
                    "When that assumption breaks (image processing, video transcoding, ML inference), "
                    "switch to least-connections or least-response-time."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "AWS — Elastic Load Balancing documentation (ALB vs NLB)",
            "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html",
            "publisher": "Amazon Web Services",
            "type": "official-doc"
        },
        {
            "title": "NGINX — HTTP Load Balancing",
            "url": "https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/",
            "publisher": "NGINX / F5",
            "type": "official-doc"
        },
        {
            "title": "HAProxy — Configuration manual",
            "url": "https://docs.haproxy.org/",
            "publisher": "HAProxy",
            "type": "official-doc"
        },
        {
            "title": "Envoy Proxy — Load balancing overview",
            "url": "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview",
            "publisher": "Envoy / CNCF",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 5. reverse-proxy
# ──────────────────────────────────────────────────────────────────────────
REVERSE_PROXY = {
    "blocks": [
        {
            "type": "table",
            "id": "forward-reverse-table-b2",
            "payload": {
                "headers": ["Dimension", "Forward Proxy", "Reverse Proxy"],
                "rows": [
                    ["Position in topology", "In front of clients (egress)", "In front of servers (ingress)"],
                    ["Represents", "The client to the server", "The server to the client"],
                    ["Server's view", 'Sees the proxy IP, not the client\'s', "Sees the proxy IP as the source"],
                    ["Client's view", "Knows it's using a proxy", "Doesn't know a proxy exists"],
                    ["Typical use", "Corporate egress filter, anonymizing (Tor), geo-bypass (VPN)", "TLS termination, load balancing, caching, WAF"],
                    ["Caching", "Caches responses for the client (saves bandwidth)", "Caches responses for many clients (saves backend load)"],
                    ["Auth", "Often authenticates users (corporate LDAP/SSO)", "Often terminates TLS, rate-limits, applies WAF"],
                    ["Examples", "Squid, Dante, corporate HTTPS proxy, Tor exit node", "NGINX, Envoy, HAProxy, Caddy, Cloudflare edge"],
                    ["Failure mode", "Client can't reach the internet if proxy is down", "Site is down for everyone if proxy is down"]
                ],
                "caption": "Forward proxy vs reverse proxy across the dimensions that distinguish them in practice."
            }
        },
        {
            "type": "code",
            "id": "nginx-config-b2",
            "payload": {
                "language": "nginx",
                "code": (
                    "# /etc/nginx/conf.d/api.example.com.conf\n"
                    "# Reverse proxy: terminates TLS, caches GETs, load-balances upstream.\n"
                    "\n"
                    "upstream api_backend {\n"
                    "    least_conn;                          # least-connections algorithm\n"
                    "    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;\n"
                    "    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;\n"
                    "    server 10.0.1.12:8080 max_fails=3 fail_timeout=30s;\n"
                    "    keepalive 32;                         # pool of keepalive conns to upstream\n"
                    "}\n"
                    "\n"
                    "proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m\n"
                    "                 max_size=1g inactive=10m use_temp_path=off;\n"
                    "\n"
                    "server {\n"
                    "    listen 443 ssl http2;\n"
                    "    server_name api.example.com;\n"
                    "\n"
                    "    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;\n"
                    "    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;\n"
                    "    ssl_protocols       TLSv1.2 TLSv1.3;\n"
                    "\n"
                    "    # /api/public/* — cache aggressively\n"
                    "    location /api/public/ {\n"
                    "        proxy_cache api_cache;\n"
                    "        proxy_cache_valid 200 10m;\n"
                    "        proxy_cache_key $scheme$host$request_uri;\n"
                    "        add_header X-Cache-Status $upstream_cache_status;   # HIT / MISS / BYPASS\n"
                    "        proxy_pass http://api_backend;\n"
                    "    }\n"
                    "\n"
                    "    # /api/auth/* — never cache, always forward\n"
                    "    location /api/auth/ {\n"
                    "        proxy_cache off;\n"
                    "        proxy_set_header Authorization $http_authorization;   # pass through\n"
                    "        proxy_pass http://api_backend;\n"
                    "    }\n"
                    "\n"
                    "    # Common headers sent to upstream\n"
                    "    proxy_set_header Host              $host;\n"
                    "    proxy_set_header X-Real-IP         $remote_addr;\n"
                    "    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;\n"
                    "    proxy_set_header X-Forwarded-Proto $scheme;\n"
                    "\n"
                    "    # Health endpoint — used by external LB health-check\n"
                    "    location = /health { return 200 'ok'; add_header Content-Type text/plain; }\n"
                    "}\n"
                    "\n"
                    "# Validation: nginx -t        (validate config without applying)\n"
                    "# Reload:      nginx -s reload (zero-downtime config swap)"
                ),
                "caption": "A realistic NGINX reverse-proxy config: TLS termination, path-based routing, conditional caching, and health endpoint."
            }
        },
        {
            "type": "mermaid",
            "id": "caching-diagram-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    Client -->|HTTPS| RP[Reverse Proxy<br/>NGINX / Envoy]\n"
                    "    RP --> Cache{Cache<br/>lookup}\n"
                    "    Cache -->|HIT<br/>fresh| Client2[Return cached response<br/>~1ms]\n"
                    "    Cache -->|MISS| Upstream[Backend server]\n"
                    "    Upstream --> DB[(Database)]\n"
                    "    DB --> Upstream\n"
                    "    Upstream --> RP2[Set cache<br/>key+TTL]\n"
                    "    RP2 --> Client3[Return fresh response<br/>~50ms]\n"
                    "\n"
                    "    Cache -.stale TTL<br/>expired.-> Revalidate[Conditional GET<br/>If-None-Match / ETag]\n"
                    "    Revalidate -->|304 Not Modified| Cache\n"
                    "    Revalidate -->|200 new body| Upstream\n"
                    "\n"
                    "    classDef hit fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef miss fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef data fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    class Client2 hit\n"
                    "    class Client3,Upstream,RP2 miss\n"
                    "    class DB data"
                ),
                "caption": "Reverse-proxy cache: HIT returns in ~1ms, MISS fetches from backend and populates cache, stale entries are revalidated with conditional GETs.",
                "alt_text": "Client makes HTTPS request to the reverse proxy. The proxy looks up its cache. On HIT, returns cached response in ~1ms. On MISS, forwards to backend server, which queries the database, returns the response, and the proxy stores it in cache with a key and TTL. Stale cache entries (TTL expired) trigger a conditional GET with If-None-Match; the backend either returns 304 Not Modified (use cached body) or a fresh 200 response."
            }
        },
        {
            "type": "prose",
            "id": "cloudflare-example-b2",
            "payload": {
                "text": (
                    "**Real example: Cloudflare as a global reverse proxy.**\n\n"
                    "When you point your domain at Cloudflare, you don't change your origin server — "
                    "you change the DNS so that your domain resolves to Cloudflare's anycast IP "
                    "ranges. Every HTTP request to your domain terminates at a Cloudflare POP (point "
                    "of presence) in 300+ cities worldwide. The POP is the reverse proxy.\n\n"
                    "What the POP does on each request:\n"
                    "1. **DNS + anycast routing** — the user's nearest POP answers in 1 RTT.\n"
                    "2. **TLS termination** — Cloudflare holds your cert (or its own universal cert for SSL-for-free).\n"
                    "3. **WAF + DDoS rules** — every request passes through rule engines that block SQLi, "
                    "XSS, known-bad IPs, and volumetric attacks.\n"
                    "4. **Rate limiting** — per-IP and per-path limits applied at the edge.\n"
                    "5. **Cache lookup** — static assets served from POP RAM/disk; the origin never sees them.\n"
                    "6. **Image resizing / Workers** — request can be transformed by edge compute (resize image, "
                    "A/B test, rewrite URL) without touching origin.\n"
                    "7. **Origin forward** — on MISS or non-cacheable, the POP opens a connection to your origin "
                    "(possibly via Cloudflare's Argo smart routing for latency optimization).\n"
                    "8. **Response caching** — the POP caches the response for the next user.\n\n"
                    "From the origin's perspective, every incoming request appears to come from a Cloudflare "
                    "IP range. Cloudflare injects `CF-Connecting-IP` and `X-Forwarded-For` headers so the "
                    "origin can identify the real client. This is exactly the reverse-proxy pattern — the "
                    "client thinks it's talking to your server, your server thinks it's talking to Cloudflare, "
                    "and Cloudflare does TLS, caching, security, and edge compute in between. The same "
                    "pattern applies to Fastly, AWS CloudFront, and Akamai."
                )
            }
        },
        {
            "type": "prose",
            "id": "tls-defense-in-depth-b2",
            "payload": {
                "text": (
                    "**When NOT to terminate TLS at the proxy — defense in depth.**\n\n"
                    "The default pattern (terminate TLS at the reverse proxy, speak plain HTTP to "
                    "backends on a private network) is right for ~95% of services. But for the "
                    "remaining 5% — healthcare (HIPAA), payments (PCI-DSS), government, defense — "
                    "plain HTTP on the private network is unacceptable. The standard is **TLS "
                    "everywhere**: terminate TLS at the proxy AND re-encrypt from proxy to backend.\n\n"
                    "Why? Defense in depth. The 'private network' between proxy and backend is not "
                    "as private as you think: it shares physical infrastructure with other tenants "
                    "in the cloud, it's accessible to anyone with a compromised admin account, and "
                    "it's traversed by debug packet captures during incidents. If the proxy-to-backend "
                    "traffic is plain HTTP, anyone with that access can read PII, card numbers, or "
                    "credentials.\n\n"
                    "The cost of TLS-everywhere: more CPU on the proxy (it terminates AND re-encrypts), "
                    "certificate management on backends (or mTLS with a CA), and operational complexity "
                    "(cert rotation). For most teams this cost is not justified; for regulated "
                    "industries it's required. Modern service meshes (Istio, Linkerd) make this "
                    "transparent: mTLS between every service is automatic, with certs rotated by the "
                    "control plane.\n\n"
                    "The pattern matters because it's the textbook example of a security vs complexity "
                    "trade-off that depends on context. The same architecture choice (terminate at "
                    "proxy) is correct for a blog and wrong for a banking API. System design is full "
                    "of these context-dependent choices; the skill is recognizing which context you're in."
                )
            }
        },
        {
            "type": "callout",
            "id": "vary-header-b2",
            "payload": {
                "title": "Caching personalized responses — the Vary header trap",
                "body": (
                    "If your response depends on a header (e.g., `Accept-Language: fr` returns French, "
                    "en returns English), the cache key MUST include that header. The HTTP mechanism is "
                    "the `Vary` response header: `Vary: Accept-Language, Accept-Encoding`. Without it, "
                    "the proxy caches the French response for the German user — a real bug seen on countless "
                    "sites. Worse: caching an authenticated `/me` response and serving it to a different "
                    "user is a security incident. Rule: any response that varies by request header must "
                    "declare it via Vary; any response that varies by auth must NOT be cached (or must be "
                    "keyed by user id). Test this with two different users — if they ever see each other's "
                    "data, you have a cache-key bug."
                ),
                "kind": "danger"
            }
        },
        {
            "type": "quiz",
            "id": "q-cache-leak-b2",
            "payload": {
                "question": (
                    "Users of your SaaS app report seeing other users' account data intermittently — "
                    "user A logs in, sometimes sees user B's dashboard. Your architecture is: NGINX "
                    "(reverse proxy with caching) → stateless Node.js app → PostgreSQL. Sessions are "
                    "stored in cookies. What is the most likely root cause?"
                ),
                "shape": "mcq",
                "options": [
                    "PostgreSQL is returning the wrong data due to a query bug.",
                    "NGINX is caching the authenticated /dashboard response without a Vary header keyed on the session cookie — so user B's request hits the cache entry that user A's response populated.",
                    "The Node.js app has a race condition in its session lookup.",
                    "Cookies are leaking between browsers."
                ],
                "answer_index": 1,
                "rationale": (
                    "The pattern — intermittent, cross-user data exposure — is the signature of a "
                    "cache-key bug at the proxy layer. The /dashboard response is user-specific "
                    "(depends on the session cookie), but if NGINX caches it with a key based only "
                    "on URL (the default), user A's response gets cached and served to user B. "
                    "The fix is one of: (a) set `Vary: Cookie` so the cache key includes the cookie; "
                    "(b) add `Cache-Control: private, no-cache` to authenticated responses — this tells "
                    "shared caches (NGINX, CDN) not to cache them at all, while still allowing the "
                    "browser to cache for the user; (c) explicitly include the session id in the cache "
                    "key (`proxy_cache_key $scheme$host$request_uri$cookie_session`). Option (a) alone is "
                    "risky because session cookies rotate. Option (b) is the safe default for any "
                    "authenticated response. Option (c) is the most precise but most fragile. Options 1, "
                    "3, 4 are possible but the intermittent cross-user pattern is overwhelmingly a cache "
                    "bug. The broader lesson: any cache shared across users must be very explicit about "
                    "what makes responses differ — and the safest default for authenticated content is "
                    "'don't cache'."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "NGINX — Reverse Proxy and HTTP Caching",
            "url": "https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/",
            "publisher": "NGINX / F5",
            "type": "official-doc"
        },
        {
            "title": "Cloudflare — What is a reverse proxy?",
            "url": "https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/",
            "publisher": "Cloudflare",
            "type": "official-doc"
        },
        {
            "title": "RFC 7234 — HTTP Caching",
            "url": "https://datatracker.ietf.org/doc/html/rfc7234",
            "publisher": "IETF / R. Fielding",
            "type": "rfc"
        },
        {
            "title": "MDN — Vary header",
            "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary",
            "publisher": "Mozilla / MDN",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 6. horizontal-scaling
# ──────────────────────────────────────────────────────────────────────────
HORIZONTAL_SCALING = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "vertical-horizontal-comparison-b2",
            "payload": {
                "code": (
                    "flowchart TB\n"
                    "    subgraph V[Vertical Scaling — scale up]\n"
                    "        V1[4 CPU / 16 GB<br/>$200/mo] --> V2[32 CPU / 128 GB<br/>$2k/mo]\n"
                    "        V2 --> V3[128 CPU / 2 TB<br/>$20k/mo<br/>u-6tb1.metal ceiling]\n"
                    "        VNote[Simple, no code changes.<br/>Hard ceiling, downtime to upgrade,<br/>single point of failure.]\n"
                    "    end\n"
                    "\n"
                    "    subgraph H[Horizontal Scaling — scale out]\n"
                    "        H1[1 node<br/>4 CPU] --> H2[3 nodes<br/>12 CPU total]\n"
                    "        H2 --> H3[10 nodes<br/>40 CPU total]\n"
                    "        H3 --> H4[100 nodes<br/>400 CPU total]\n"
                    "        H3 --> H5[1000 nodes<br/>4,000 CPU total]\n"
                    "        HNote[No ceiling, no downtime,<br/>fault-tolerant.<br/>Requires statelessness,<br/>distributed data, LB, monitoring.]\n"
                    "    end\n"
                    "\n"
                    "    classDef v fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef h fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef note fill:#2d1e3a,stroke:#a855f7,color:#f3e8ff\n"
                    "    class V1,V2,V3 v\n"
                    "    class H1,H2,H3,H4,H5 h\n"
                    "    class VNote,HNote note"
                ),
                "caption": "Vertical scaling has a hard ceiling and upgrade downtime. Horizontal scaling has no theoretical ceiling but introduces distributed-systems complexity.",
                "alt_text": "Two scaling strategies compared. Vertical scaling: a single server is upgraded from 4 CPU/16 GB to 32 CPU/128 GB to 128 CPU/2 TB — at which point you hit the u-6tb1.metal ceiling. Simple, no code changes, but hard ceiling, downtime to upgrade, single point of failure. Horizontal scaling: 1 node becomes 3, then 10, then 100, then 1000 — no theoretical ceiling. Requires statelessness, distributed data, load balancers, and monitoring."
            }
        },
        {
            "type": "mermaid",
            "id": "statelessness-flow-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    Req[Incoming request] --> LB[Load balancer]\n"
                    "    LB --> Pick{Pick any backend}\n"
                    "    Pick --> A[App server A]\n"
                    "    Pick --> B[App server B]\n"
                    "    Pick --> C[App server C]\n"
                    "\n"
                    "    A --> LocalState{Has local state?<br/>session, cache, file, lock}\n"
                    "    LocalState -->|Yes| StickyNeeded[Need sticky sessions<br/>DEFEATS failover + scaling]\n"
                    "    LocalState -->|No| Stateless[Stateless<br/>any backend serves any request]\n"
                    "\n"
                    "    Stateless --> ExternalState[Move state to shared stores]\n"
                    "    ExternalState --> Sess[Session → Redis]\n"
                    "    ExternalState --> Files[File uploads → S3 / R2]\n"
                    "    ExternalState --> Cache[Cache → distributed cache<br/>Redis / Memcached]\n"
                    "    ExternalState --> Locks[Distributed locks → etcd / Redis Redlock]\n"
                    "    ExternalState --> Db[Database → shared / replicated / sharded]\n"
                    "\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    classDef ok fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef store fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    class StickyNeeded bad\n"
                    "    class Stateless,A,B,C,Pick,LB ok\n"
                    "    class Sess,Files,Cache,Locks,Db,ExternalState store"
                ),
                "caption": "Statelessness requirement: every piece of per-request state must move off the app server to a shared store.",
                "alt_text": "An incoming request hits the load balancer, which picks any backend. If the backend has local state (session, cache, file, lock), sticky sessions are needed — which defeats failover and scaling. If the backend is stateless, any backend can serve any request. To be stateless, all state must move to shared stores: sessions to Redis, file uploads to S3, caches to distributed cache, locks to etcd or Redis Redlock, database to a shared/replicated/sharded store."
            }
        },
        {
            "type": "mermaid",
            "id": "db-scaling-path-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    L1[Single DB] -->|reads > 1 box can handle| L2\n"
                    "    L2[+ Read replicas<br/>reads scale, writes don't] -->|writes > 1 primary| L3\n"
                    "    L3[+ Sharding by key<br/>writes scale per shard] -->|queries span shards| L4\n"
                    "    L4[+ Federation / functional split<br/>users DB / orders DB / sessions DB] -->|still single-region| L5\n"
                    "    L5[+ Multi-region replication<br/>active-active or active-passive] --> Done[Truly global scale]\n"
                    "\n"
                    "    L2 -.cache hot reads.-> Cache[(Redis cache)]\n"
                    "    L3 -.route by shard key.-> Router[Shard router]\n"
                    "\n"
                    "    classDef stage fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef helper fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class L1,L2,L3,L4,L5,Done stage\n"
                    "    class Cache,Router helper"
                ),
                "caption": "The canonical database scaling path — each step is a separate architectural decision, taken only when the previous step hits its ceiling.",
                "alt_text": "A linear progression of database scaling steps: Single DB → read replicas (when reads exceed one box) → sharding by key (when writes exceed one primary) → federation / functional split (when queries span shards) → multi-region replication (when one region is not enough). Cache and shard router are helper components introduced along the way."
            }
        },
        {
            "type": "prose",
            "id": "netflix-autoscaling-b2",
            "payload": {
                "text": (
                    "**Real example: Netflix's auto-scaling on AWS.**\n\n"
                    "Netflix's stateless microservices run on AWS EC2 instances managed by auto-scaling "
                    "groups (ASGs). The pattern (documented in their tech blog):\n\n"
                    "- **Predictive scaling** for daily/weekly patterns — a service that peaks at "
                    "prime-time (8pm ET) is pre-scaled by 6pm based on past-week traffic curves, so the "
                    "instances are warm before load arrives. EC2's predictive scaling models the past "
                    "two weeks of CloudWatch metrics.\n"
                    "- **Target-tracking scaling** for live load — auto-scaling policy targets a metric "
                    "like 'CPU utilization at 60%' or 'queue depth at 1000 messages'. If CPU exceeds "
                    "60%, ASG adds instances; if it falls below, ASG removes them. Netflix customizes "
                    "this with per-service 'Scryer' predictive models that beat AWS's default.\n"
                    "- **Decoupled state** — every instance is stateless; sessions, caches, queues, "
                    "and databases live in dedicated stores (Redis EVCache, Cassandra, RabbitMQ). When "
                    "an ASG removes an instance, no user is affected — the load balancer stops sending "
                    "traffic, the instance drains (60s), then it's terminated.\n"
                    "- **Chaos engineering as the proof** — Chaos Monkey randomly kills production "
                    "instances during business hours. If any user-visible failure occurs, the "
                    "auto-scaling setup is by definition broken — fix it. This is the discipline that "
                    "makes auto-scaling actually safe: ruthless testing of the failure path.\n\n"
                    "The crucial lesson: auto-scaling is not magic. It works because (a) instances are "
                    "stateless so any instance can be killed at any time, (b) the load balancer "
                    "integrates with the ASG so dead instances are removed from rotation in seconds, "
                    "(c) capacity is monitored continuously and pre-provisioned for known patterns, and "
                    "(d) failure is tested in production. Skip any of those four, and auto-scaling "
                    "becomes auto-failure."
                )
            }
        },
        {
            "type": "prose",
            "id": "distributed-debugging-b2",
            "payload": {
                "text": (
                    "**Scaling horizontally also scales the debugging problem.**\n\n"
                    "A single-server system has one log file, one metric stream, one place to attach "
                    "a debugger. A horizontally-scaled fleet of 100 servers has 100 log files, 100 "
                    "metric streams, and you can't attach a debugger without affecting traffic. The "
                    "debugging surface area scales with the number of nodes, and the failure modes "
                    "multiply with the number of inter-node links.\n\n"
                    "What this means in practice:\n"
                    "- **Distributed tracing is non-optional.** OpenTelemetry, Jaeger, Zipkin — you "
                    "need a per-request trace ID that flows across services. Without it, a 503 from "
                    "service F that originated in service A is impossible to attribute.\n"
                    "- **Structured logging with shared correlation IDs.** Every log line must "
                    "include the request id, user id, and trace id so you can grep across 100 servers.\n"
                    "- **Centralized metrics with dimensional labels.** Prometheus or Datadog with "
                    "labels per service, per instance, per endpoint. 'Error rate spiking' must be "
                    "answerable as 'on service X, instance Y, endpoint Z, for tenant W'.\n"
                    "- **Reproductions are hard.** A bug that occurs only when the load balancer "
                    "happens to route request A to instance 7 and request B to instance 12 may not "
                    "reproduce locally. You need chaos testing, staging with prod-like traffic, and "
                    "the discipline to instrument before you need it.\n\n"
                    "A common postmortem pattern: 'we scaled to 50 servers and our p99 latency doubled, "
                    "we couldn't reproduce it locally, it turned out instance 17 had a noisy neighbor "
                    "on the underlying VM host'. This kind of issue is invisible without distributed "
                    "observability. Build the observability before you scale, not after — retrofitting "
                    "distributed tracing onto a system that's already broken is much harder than "
                    "building it from the start."
                )
            }
        },
        {
            "type": "callout",
            "id": "cascade-failure-b2",
            "payload": {
                "title": "Cascade failures — horizontal scaling's hidden pathology",
                "body": (
                    "When one node in a horizontally-scaled fleet slows down (GC pause, GC death spiral, "
                    "noisy neighbor), the load balancer may keep sending it traffic (round-robin doesn't "
                    "see latency) or — worse — retry on the slow node. The slow node gets slower, fails "
                    "health checks, gets removed, traffic shifts to the remaining N-1 nodes, which then "
                    "also slow down under higher load, also fail, and the whole fleet dies in a cascade. "
                    "Mitigations: least-connections (so slow nodes naturally shed load), circuit breakers "
                    "(stop retrying a failing downstream), bulkheads (isolate capacity per dependency), "
                    "and graceful degradation (return partial responses instead of failing). Without "
                    "these, 'just add more servers' turns into 'add more servers, watch them all die'."
                ),
                "kind": "warning"
            }
        },
        {
            "type": "quiz",
            "id": "q-state-b2",
            "payload": {
                "question": (
                    "You inherit a 3-year-old web app where every server stores user sessions in "
                    "/tmp/sessions/ as flat files. Traffic is growing 20% per month and you need to "
                    "scale horizontally. Your team proposes adding a load balancer with sticky sessions "
                    "(based on client IP hash). What is the strongest critique?"
                ),
                "shape": "mcq",
                "options": [
                    "Sticky sessions will work fine — they're a standard pattern.",
                    "Sticky sessions solve the symptom but defeat horizontal scaling's fault tolerance: if the server holding a user's session dies, the user is logged out and loses in-flight work. The real fix is to move sessions to Redis (or another shared store), making servers truly stateless — then any server can serve any user, and you can add/remove servers freely.",
                    "Replace the flat files with SQLite on each server.",
                    "Increase the LB's session TTL so users stay on the same server longer."
                ],
                "answer_index": 1,
                "rationale": (
                    "Sticky sessions are a common workaround but they are a band-aid, not a fix. The "
                    "fundamental requirement for horizontal scaling is statelessness: any backend "
                    "must be able to serve any request. With sticky sessions, you have N independent "
                    "single-points-of-failure dressed up as a 'scaled system' — server A dying logs "
                    "out every user whose session it holds. Worse, sticky sessions make deploys painful: "
                    "a rolling deploy that drains server A causes all its users to re-authenticate. "
                    "The right fix is to move sessions out of the app server entirely — Redis is the "
                    "standard choice (sub-millisecond reads, persistence optional, easy to scale "
                    "horizontally itself with Redis Cluster). Once sessions are externalized, the app "
                    "servers become truly stateless: any can serve any request, any can be killed at "
                    "any time, deploys are zero-downtime, and the load balancer can use round-robin or "
                    "least-connections instead of sticky IP hashing. Option 3 (SQLite per server) makes "
                    "the statefulness worse — now it's a structured database instead of a flat file, "
                    "still locked to one box. Option 4 (longer TTL) makes the staleness and the "
                    "session-loss-on-failure problems worse. The deeper lesson: statelessness is a "
                    "design choice, not a runtime configuration."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "AWS Auto Scaling — User Guide",
            "url": "https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html",
            "publisher": "Amazon Web Services",
            "type": "official-doc"
        },
        {
            "title": "Netflix TechBlog — Scryer: Predictive Auto Scaling",
            "url": "https://netflixtechblog.com/scryer-bring-predictive-autoscaling-to-the-cloud-bf35fc0c66d5",
            "publisher": "Netflix",
            "type": "blog"
        },
        {
            "title": "Google SRE Book — Cascading Failures",
            "url": "https://sre.google/sre-book/addressing-cascading-failures/",
            "publisher": "Google",
            "type": "book"
        },
        {
            "title": "Martin Fowler — Circuit Breaker",
            "url": "https://martinfowler.com/bliki/CircuitBreaker.html",
            "publisher": "Martin Fowler",
            "type": "blog"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 7. replication
# ──────────────────────────────────────────────────────────────────────────
REPLICATION = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "primary-replica-arch-b2",
            "payload": {
                "code": (
                    "flowchart TB\n"
                    "    W[Write request] --> Primary[(Primary DB<br/>accepts writes)]\n"
                    "    Primary -->|WAL stream<br/>async or sync| R1[(Replica 1<br/>reads only)]\n"
                    "    Primary -->|WAL stream| R2[(Replica 2<br/>reads only)]\n"
                    "    Primary -->|WAL stream| R3[(Replica 3<br/>cross-region DR)]\n"
                    "\n"
                    "    R1 --> Ro1[Read request 1]\n"
                    "    R2 --> Ro2[Read request 2]\n"
                    "    R3 -.standby, no traffic.-> DR[Disaster recovery]\n"
                    "\n"
                    "    Primary --> FailoverMonitor{Failover monitor<br/>etcd / Patroni / RDS HA}\n"
                    "    FailoverMonitor -.primary down detected.-> PromoteR1[Promote R1 to primary<br/>update DNS / connection pool]\n"
                    "\n"
                    "    classDef primary fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef replica fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef dr fill:#2d1e3a,stroke:#a855f7,color:#f3e8ff\n"
                    "    classDef monitor fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    class Primary primary\n"
                    "    class R1,R2,Ro1,Ro2 replica\n"
                    "    class R3,DR dr\n"
                    "    class FailoverMonitor,PromoteR1 monitor"
                ),
                "caption": "Primary-replica replication: writes to primary, reads from replicas, monitor promotes a replica on primary failure.",
                "alt_text": "A write request goes to the primary database. The primary streams its write-ahead log (WAL) to three replicas, asynchronously or synchronously. Read requests go to replica 1 or replica 2. Replica 3 sits in another region as disaster recovery standby. A failover monitor (etcd, Patroni, RDS HA) watches the primary; if it goes down, the monitor promotes replica 1 to be the new primary and updates DNS / connection pool routing."
            }
        },
        {
            "type": "table",
            "id": "sync-async-b2",
            "payload": {
                "headers": ["Dimension", "Synchronous", "Asynchronous", "Semi-synchronous"],
                "rows": [
                    ["When primary returns success", "After ALL replicas ACK the write", "Immediately, before any replica ACKs", "After AT LEAST ONE replica ACKs"],
                    ["Write latency", "Highest (waits for slowest replica)", "Lowest (no wait)", "Medium"],
                    ["Data loss on primary failure", "None — replicas have it all", "Yes — recent in-flight writes can be lost", "Reduced — at most the gap between primary and the ACKing replica"],
                    ["Availability impact", "If any replica is down, writes block", "Writes succeed even with replica failures", "Writes succeed if the ACKing replica is alive"],
                    ["Throughput", "Limited by slowest replica RTT", "Limited only by primary disk", "Limited by ACKing replica RTT"],
                    ["Replication lag", "Zero (by definition)", "Milliseconds to seconds", "Zero to one replica, lagging on others"],
                    ["Typical use", "Critical financial data, zero-loss requirements", "Most read-heavy apps, social feeds", "Production default for ACID systems"],
                    ["Real systems", "MySQL Fully Sync, Spanner", "PostgreSQL default, MySQL default, Cassandra", "PostgreSQL `synchronous_commit=remote_write`, MySQL semi-sync"]
                ],
                "caption": "Sync vs async vs semi-sync replication across the trade-off dimensions that decide which to use."
            }
        },
        {
            "type": "mermaid",
            "id": "failover-sequence-b2",
            "payload": {
                "code": (
                    "sequenceDiagram\n"
                    "    participant App as Application\n"
                    "    participant LB as Connection Pool / DNS\n"
                    "    participant Mon as Failover Monitor<br/>(Patroni / etcd / RDS HA)\n"
                    "    participant P as Primary (dies)\n"
                    "    participant R1 as Replica 1\n"
                    "    participant R2 as Replica 2\n"
                    "\n"
                    "    Note over P: t=0: Primary crash\n"
                    "    Mon->>P: Health check (no response)\n"
                    "    Mon->>P: Retry 1, 2, 3 (no response)\n"
                    "    Note over Mon: t=5s: Declared dead\n"
                    "    Mon->>R1: Promote to primary\n"
                    "    R1->>R1: End recovery mode,<br/>accept writes\n"
                    "    Mon->>LB: Update routing<br/>(DNS TTL / etcd key)\n"
                    "    LB->>App: New primary is R1\n"
                    "    App->>R1: Subsequent writes\n"
                    "    Note over R1,R2: R2 re-points replication<br/>from P (dead) to R1 (new primary)\n"
                    "    R2->>R1: Replication stream\n"
                    "    Note over App: Total recovery: 10-60s typical"
                ),
                "caption": "Failover sequence: monitor detects primary death, promotes a replica, updates routing. Total downtime 10-60s in practice.",
                "alt_text": "A sequence diagram. At t=0, the primary crashes. The failover monitor (Patroni, etcd, or AWS RDS HA) sends health checks to the primary, retries three times with no response, and at t=5s declares it dead. The monitor promotes Replica 1 to primary; Replica 1 ends its recovery mode and accepts writes. The monitor updates routing — DNS TTL or etcd key — and the connection pool / DNS layer routes the application's subsequent writes to the new primary. Replica 2 re-points its replication stream from the dead primary to the new primary (R1). Total recovery time: 10-60 seconds typical."
            }
        },
        {
            "type": "prose",
            "id": "postgres-streaming-b2",
            "payload": {
                "text": (
                    "**Real example: PostgreSQL streaming replication.**\n\n"
                    "PostgreSQL has shipped built-in streaming replication since 9.0 (2010). The mechanism "
                    "is elegant: the primary ships its write-ahead log (WAL) — a stream of every byte "
                    "modified — to replicas, which apply the WAL to their own data files in real time.\n\n"
                    "Configuration on the primary (`postgresql.conf`):\n"
                    "```\n"
                    "wal_level = replica\n"
                    "max_wal_senders = 10\n"
                    "synchronous_commit = remote_write   # semi-sync: wait for one replica ACK\n"
                    "synchronous_standby_names = 'ANY 1 (replica1, replica2)'\n"
                    "```\n\n"
                    "Configuration on a replica:\n"
                    "```\n"
                    "hot_standby = on                    # accepts read queries while replicating\n"
                    "primary_conninfo = 'host=primary.internal port=5432 user=replication'\n"
                    "```\n\n"
                    "What this buys you:\n"
                    "- **Read scaling**: route SELECT-heavy workload (analytics, dashboards) to replicas, "
                    "leaving the primary for writes.\n"
                    "- **HA via Patroni**: Patroni (a Python daemon) watches the primary, runs leader "
                    "election via etcd or Consul, and on failure promotes a replica. Combined with "
                    "pgBouncer (connection pooler) and HAProxy (LB), you get sub-minute automatic "
                    "failover with no client code change.\n"
                    "- **DR**: ship WAL to an S3 bucket via `pg_receivewal` or Barman; restore in "
                    "another region for disaster recovery. PITR (point-in-time recovery) lets you "
                    "replay WAL up to any chosen timestamp — useful for 'oops, I dropped that table "
                    "at 14:32' scenarios.\n"
                    "- **Zero-downtime upgrades**: detach a replica, upgrade it, swap it in as the new "
                    "primary, upgrade the others.\n\n"
                    "The trade-offs to watch:\n"
                    "- **Replication lag** — async replicas can be 100ms-10s behind. Read-your-writes "
                    "consistency requires routing the user's reads to the primary for a window after "
                    "their write.\n"
                    "- **Split-brain** — if the network partitions between primary and monitor, the "
                    "monitor may promote a replica while the old primary is still alive and accepting "
                    "writes. Mitigations: STONITH (shoot the other node in the head), fencing, or "
                    "quorum-based promotion (Patroni requires majority consensus).\n"
                    "- **Write amplification** — each write is applied N+1 times (primary + N "
                    "replicas). For write-heavy workloads, replication does NOT scale writes — that's "
                    "what sharding is for."
                )
            }
        },
        {
            "type": "prose",
            "id": "write-amplification-cost-b2",
            "payload": {
                "text": (
                    "**Replication write amplification — the hidden cost.**\n\n"
                    "Every write to the primary is replicated to N replicas. With N=3 replicas, "
                    "each write is applied 4 times total (primary + 3 replicas). This is write "
                    "amplification, and it has three costs you need to size for:\n\n"
                    "1. **Storage cost.** 4x the storage. With 1 TB of logical data and 3 replicas, "
                    "you need 4 TB of storage. With 5 replicas, 6 TB. Sounds obvious, but teams "
                    "consistently under-budget storage by ignoring replica count.\n"
                    "2. **Network cost.** Each write is sent over the network N times. For a high-"
                    "write workload (10K writes/sec), replication at 3x = 30K writes/sec of network "
                    "traffic — significant, especially cross-region.\n"
                    "3. **CPU and IOPS on replicas.** Replicas aren't free riders — they apply the "
                    "WAL to their own data files, which consumes CPU and disk IOPS. A replica "
                    "under heavy write load may have less capacity to serve reads than you expect.\n\n"
                    "Two practical implications:\n"
                    "- **Replication does NOT scale writes.** This is the most common misconception. "
                    "Adding replicas gives you more read capacity and high availability — it does "
                    "NOT give you more write capacity. The primary is still the write bottleneck. "
                    "To scale writes, you need sharding.\n"
                    "- **More replicas ≠ better.** A common mistake is to add many replicas for "
                    "'more availability'. But each replica adds storage, network, and operational "
                    "cost. The right number of replicas is determined by read QPS requirement + "
                    "failover needs + geographic distribution — typically 2-5. More than that is "
                    "wasted money.\n\n"
                    "The cost trade-off: each replica roughly doubles the storage cost (1 primary + "
                    "1 replica = 2x storage). At scale (multi-TB databases), this drives teams "
                    "toward columnar storage (e.g., ClickHouse) or object-storage-based replicas "
                    "(S3-backed read replicas in BigQuery) for read-heavy analytics workloads."
                )
            }
        },
        {
            "type": "callout",
            "id": "split-brain-b2",
            "payload": {
                "title": "Split-brain: replication's worst nightmare",
                "body": (
                    "If a network partition isolates the primary from the failover monitor AND a "
                    "replica is reachable from the monitor, the monitor may promote the replica — "
                    "while the original primary is still alive and accepting writes from clients it "
                    "can still reach. You now have two primaries diverging. When the partition heals, "
                    "you must reconcile divergent write histories — typically by discarding one side's "
                    "writes, which means data loss. Mitigations: (a) require quorum (majority of nodes) "
                    "before promoting, so two primaries can't exist simultaneously; (b) STONITH — the "
                    "monitor power-cycles the old primary before promoting the replica, guaranteeing "
                    "it can't accept writes; (c) use consensus-based replication like Spanner or etcd "
                    "which forbid split-brain by design. Without one of these, 'high availability' is "
                    "a polite fiction."
                ),
                "kind": "danger"
            }
        },
        {
            "type": "quiz",
            "id": "q-failover-b2",
            "payload": {
                "question": (
                    "You run PostgreSQL with async streaming replication: one primary + two replicas. "
                    "A user updates their profile (write goes to primary, succeeds), then immediately "
                    "loads their profile page (read goes to a replica). They see the OLD profile. "
                    "Two seconds later, refreshing shows the new profile. What is happening, and what "
                    "is the standard fix for read-your-writes consistency?"
                ),
                "shape": "mcq",
                "options": [
                    "The primary lost the write. Switch to synchronous replication.",
                    "Replication lag — the replica is behind the primary by ~1-2 seconds. The standard fix is to route a user's reads to the primary for a short window (e.g., 5 seconds) after their write, or use a session-level sticky-read token tied to the latest WAL LSN they wrote.",
                    "The replica is broken. Restart it.",
                    "Add a third replica — more replicas means less lag."
                ],
                "answer_index": 1,
                "rationale": (
                    "This is the textbook replication-lag / read-your-writes problem. The primary "
                    "successfully committed the write and returned 200 OK to the user. Async "
                    "replication then propagates the WAL to replicas in the background, taking "
                    "anywhere from a few milliseconds (LAN) to seconds (cross-region). If the "
                    "user's subsequent read is routed to a lagging replica, they see stale data — "
                    "even though the system is working as designed. Two seconds later, replication "
                    "catches up and the refresh shows the new data. Option 2 is wrong (primary lost "
                    "the write) because the user DOES eventually see the new profile, so the write "
                    "succeeded. Option 3 (replica broken) is wrong — a broken replica would not "
                    "self-heal in 2 seconds. Option 4 (more replicas = less lag) is wrong — each "
                    "replica lags independently; adding more replicas doesn't make any of them "
                    "faster. The standard fixes: (a) read-your-writes consistency — route the user's "
                    "reads to the primary for a short window (typically 5-30s) after their write, "
                    "so they always see their own writes immediately. Trade-off: primary absorbs "
                    "more reads. (b) Session-sticky reads — pin the user's session to a replica and "
                    "wait until that replica's LSN catches up to the LSN of their write before "
                    "serving. Trade-off: complexity, session state. (c) Causal consistency via "
                    "tokens (MongoDB, DynamoDB Streams) — the read carries a token proving which "
                    "version it's seen; the system blocks until replicas have caught up. The choice "
                    "depends on how strict the consistency requirement is vs the latency cost of "
                    "reading from primary."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "PostgreSQL — High Availability, Load Balancing, and Replication",
            "url": "https://www.postgresql.org/docs/current/high-availability.html",
            "publisher": "PostgreSQL Global Development Group",
            "type": "official-doc"
        },
        {
            "title": "Patroni — A Template for PostgreSQL High Availability",
            "url": "https://patroni.readthedocs.io/",
            "publisher": "Zalando / Patroni",
            "type": "official-doc"
        },
        {
            "title": "Google Spanner — Google's Globally-Distributed Database (OSDI 2012)",
            "url": "https://research.google/pubs/pub39966/",
            "publisher": "Google",
            "type": "paper"
        },
        {
            "title": "MySQL — Replication Documentation",
            "url": "https://dev.mysql.com/doc/refman/8.0/en/replication.html",
            "publisher": "Oracle / MySQL",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 8. sharding
# ──────────────────────────────────────────────────────────────────────────
SHARDING = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "shard-key-selection-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    Q[Common query patterns?] --> Q1{Per-user lookups?}\n"
                    "    Q1 -->|Yes| Q2{High write volume?}\n"
                    "    Q2 -->|Yes| HK[Hash user_id<br/>distributes writes evenly<br/>enables per-user queries]\n"
                    "    Q2 -->|No| RR[Range on user_id<br/>enables range scans<br/>risk: hot newest shard]\n"
                    "    Q1 -->|No| Q3{Time-series data?}\n"
                    "    Q3 -->|Yes| TT[Hash on composite key<br/>(tenant_id, timestamp)<br/>spreads writes by tenant]\n"
                    "    Q3 -->|No| Q4{Geo-distributed?}\n"
                    "    Q4 -->|Yes| Geo[Hash on tenant_id<br/>+ region pinning<br/>data residency compliance]\n"
                    "    Q4 -->|No| Bad[BAD shard keys:<br/>timestamp alone, country, last_name,<br/>auto-increment id, status field]\n"
                    "\n"
                    "    HK --> Valid[Good shard key<br/>even distribution + query locality]\n"
                    "    RR --> Warn[Caution<br/>range queries OK but writes hot on newest shard]\n"
                    "    TT --> Valid\n"
                    "    Geo --> Valid\n"
                    "\n"
                    "    classDef good fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef warn fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    class HK,TT,Geo,Valid good\n"
                    "    class RR,Warn warn\n"
                    "    class Bad bad"
                ),
                "caption": "Shard key selection flowchart — the right key depends on query patterns and write volume.",
                "alt_text": "A decision flowchart. Starting from common query patterns: if per-user lookups, check if write volume is high — if yes, hash on user_id (distributes writes evenly, enables per-user queries); if no, range on user_id (enables range scans but risks hot newest shard). If not per-user lookups, check if time-series data — if yes, hash on composite (tenant_id, timestamp) to spread writes by tenant. If not, check if geo-distributed — if yes, hash on tenant_id with region pinning for data residency. Bad shard keys to avoid: timestamp alone, country, last_name, auto-increment id, status field."
            }
        },
        {
            "type": "mermaid",
            "id": "consistent-hash-ring-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    subgraph Ring[Consistent Hash Ring]\n"
                    "        direction TB\n"
                    "        N0[Node A<br/>hash=0x10] --- N1[Node B<br/>hash=0x40]\n"
                    "        N1 --- N2[Node C<br/>hash=0x80]\n"
                    "        N2 --- N3[Node D<br/>hash=0xC0]\n"
                    "        N3 --- N0\n"
                    "        K1[Key X<br/>hash=0x25] -.owned by.-> N1\n"
                    "        K2[Key Y<br/>hash=0x95] -.owned by.-> N3\n"
                    "        K3[Key Z<br/>hash=0x60] -.owned by.-> N2\n"
                    "    end\n"
                    "\n"
                    "    Add[Add Node E<br/>hash=0x70] --> Ring\n"
                    "    Move[Only keys between 0x60 and 0x70<br/>move from C to E<br/>~12.5% of keys]\n"
                    "\n"
                    "    WithoutCH[Without consistent hashing:<br/>adding a node re-maps ~ALL keys<br/>massive data movement]\n"
                    "\n"
                    "    classDef node fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef key fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef io fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class N0,N1,N2,N3 node\n"
                    "    class K1,K2,K3 key\n"
                    "    class Add,Move,WithoutCH io"
                ),
                "caption": "Consistent hashing: adding a node only moves the keys in the new node's ring range — not all keys.",
                "alt_text": "A consistent hash ring with four nodes (A at hash 0x10, B at 0x40, C at 0x80, D at 0xC0). Three keys are shown: X at 0x25 owned by B, Y at 0x95 owned by D, Z at 0x60 owned by C. Adding Node E at hash 0x70 only requires moving keys between 0x60 and 0x70 from C to E — about 12.5% of keys. Without consistent hashing, adding a node would require re-mapping nearly all keys (massive data movement)."
            }
        },
        {
            "type": "mermaid",
            "id": "cross-shard-query-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    App[App server] -->|SELECT COUNT orders WHERE status='shipped'| Router[Shard router]\n"
                    "    Router --> F1[Shard 1<br/>count=4,221]\n"
                    "    Router --> F2[Shard 2<br/>count=3,892]\n"
                    "    Router --> F3[Shard 3<br/>count=5,108]\n"
                    "    Router --> F4[Shard 4<br/>count=4,567]\n"
                    "    Router --> F5[Shard 5<br/>count=3,944]\n"
                    "    F1 --> Agg[Aggregate<br/>sum=21,732]\n"
                    "    F2 --> Agg\n"
                    "    F3 --> Agg\n"
                    "    F4 --> Agg\n"
                    "    F5 --> Agg\n"
                    "    Agg --> App2[App receives total<br/>latency = slowest shard + agg]\n"
                    "\n"
                    "    Router -.if JOIN needed.-> DistTx[Distributed 2PC transaction<br/>SLOW: prepare + commit on every shard<br/>often blocks]\n"
                    "    Router -.if pagination.-> Paginate[OFFSET 1000 LIMIT 20<br/>across N shards =\n  fetch 1000+20 from each,\n  merge-sort, take 20<br/>O(N * offset) reads]\n"
                    "\n"
                    "    classDef slow fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    classDef normal fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    class DistTx,Paginate slow\n"
                    "    class Router,F1,F2,F3,F4,F5,Agg,App,App2 normal"
                ),
                "caption": "Cross-shard queries fan out to every shard and aggregate. JOINs require distributed 2PC; pagination becomes O(N * offset).",
                "alt_text": "An app server queries 'SELECT COUNT orders WHERE status=shipped' through the shard router. The router fans out to all 5 shards, each returns its local count. The router aggregates (sums) the counts and returns the total to the app. Latency equals the slowest shard plus aggregation. If a JOIN is needed across shards, it requires a distributed 2PC transaction (prepare + commit on every shard, often blocking, very slow). If pagination is needed (OFFSET 1000 LIMIT 20), the router must fetch 1000+20 rows from each shard, merge-sort them, and return 20 — O(N * offset) reads."
            }
        },
        {
            "type": "prose",
            "id": "uber-schemaless-b2",
            "payload": {
                "text": (
                    "**Real example: Uber's sharded Schemaless.**\n\n"
                    "By 2014, Uber had outgrown a single PostgreSQL database. Their trips table alone was "
                    "growing ~1M rows/minute at peak, and writes were the bottleneck (every ride "
                    "request, driver location update, fare calculation is a write). They built "
                    "**Schemaless**, a custom data store layered on top of MySQL, designed around three "
                    "principles (documented in their engineering blog):\n\n"
                    "- **Sharding by UUID**: each trip, user, and driver record is keyed by a 128-bit "
                    "UUID. The UUID is hashed to determine which shard holds it. Tens of thousands of "
                    "shards, each a MySQL primary + replicas.\n"
                    "- **Schema flexibility**: like a wide-column store, Schemaless stores rows as "
                    "versioned JSON-like blobs (no enforced schema), so they could evolve the data "
                    "model without painful migrations across thousands of shards.\n"
                    "- **Append-only writes**: each cell is a list of versions; updates create new "
                    "versions rather than overwriting. This makes conflict resolution tractable for "
                    "their multi-region deployment — last-write-wins by timestamp is acceptable for "
                    "most fields, and CRDTs (commutative data types) for counters.\n\n"
                    "The migration was incremental: Schemaless ran alongside the existing PostgreSQL "
                    "for months; new features wrote to Schemaless while old features still read from "
                    "PostgreSQL. Eventually PostgreSQL was retired. They later documented migrating "
                    "some Schemaless clusters from MySQL to RocksDB (MyRocks) for ~70% storage savings, "
                    "demonstrating that even the underlying store of a sharded system can be swapped "
                    "if the shard router interface is stable.\n\n"
                    "Key lessons from Uber's experience:\n"
                    "- **Sharding is a multi-year investment**, not a sprint. Plan for it or pay for "
                    "it later under duress.\n"
                    "- **The shard router is the contract** — as long as it routes correctly, the "
                    "underlying stores can evolve.\n"
                    "- **Pick a shard key that you'll never need to change** — re-sharding is the "
                    "most expensive operation in distributed databases.\n"
                    "- **Cross-shard queries are inevitable** — design your schema so they're rare "
                    "and read-only (no cross-shard transactions)."
                )
            }
        },
        {
            "type": "prose",
            "id": "cross-shard-transactions-b2",
            "payload": {
                "text": (
                    "**Cross-shard transactions — the thing you must never need.**\n\n"
                    "Sharding distributes data across multiple primaries. If a single business operation "
                    "must atomically update rows on two different shards (e.g., 'transfer money from "
                    "user A on shard 1 to user B on shard 3'), you need a distributed transaction.\n\n"
                    "The two main options:\n"
                    "1. **Two-phase commit (2PC)** — a coordinator asks all participating shards to "
                    "'prepare' (lock the rows, promise to commit). If all agree, the coordinator says "
                    "'commit' and they all commit. If any shard times out or disagrees, the coordinator "
                    "says 'abort'. The problem: the coordinator holds locks across all shards during "
                    "the protocol — often 100ms-1s of latency — which kills throughput. If the "
                    "coordinator itself dies, the system blocks indefinitely (the coordinator is a new "
                    "single point of failure).\n"
                    "2. **Saga pattern** — break the multi-shard transaction into a sequence of local "
                    "transactions, each with a compensating action. Transfer money from A: debit A's "
                    "shard, then credit B's shard; if the credit fails, run a compensating 'refund A' "
                    "action. This avoids distributed locking but gives up atomicity — the system is "
                    "eventually consistent across shards.\n\n"
                    "The standard advice: **design your shard key so that transactions are always "
                    "single-shard.** This is the single most important sharding principle. For an "
                    "e-commerce platform, shard orders by user_id so that 'create order + update "
                    "user's order count' happens on one shard. For a chat app, shard conversations by "
                    "conversation_id so all messages in a conversation live on one shard.\n\n"
                    "Real-world example: Instagram chose to shard by user_id (hashed) so all of a "
                    "user's media lives on one shard. This is why their architecture can do 'get user's "
                    "recent photos' as a single-shard query (fast) and avoids cross-shard transactions "
                    "for atomic user-level operations. The price they pay: cross-user queries (e.g., "
                    "'find users who liked photo X') must fan out across shards. They mitigate this "
                    "with a separate 'likes' service backed by Redis, not the main sharded store."
                )
            }
        },
        {
            "type": "callout",
            "id": "resharding-b2",
            "payload": {
                "title": "Resharding is the operation you do once and never want to repeat",
                "body": (
                    "When a shard grows too big or a shard key turns out wrong, resharding means moving "
                    "a large fraction of your data across machines — typically with dual-writes during "
                    "the migration (write to old AND new shard, read from old, verify, switch reads, "
                    "stop writes to old, delete old). Slack's 2017 reshard took 2 months of engineering "
                    "work. Instagram's 2014 move from a single PostgreSQL to 12 shards took 6 months. "
                    "Uber's Schemaless-to-RocksDB migration took years. The unambiguous lesson: get "
                    "your shard key right the first time. Pick something stable, high-cardinality, and "
                    "aligned with your dominant query pattern. If you can't, defer sharding as long as "
                    "possible — replication and caching are cheaper bandaids."
                ),
                "kind": "warning"
            }
        },
        {
            "type": "quiz",
            "id": "q-shard-key-b2",
            "payload": {
                "question": (
                    "You're sharding an orders table for an e-commerce platform. The dominant query "
                    "is 'show me this user's recent orders' (95% of traffic). The remaining 5% are "
                    "operational: 'count all shipped orders in the last 24 hours' and 'find the order "
                    "with this tracking_id'. Which shard key best balances these needs?"
                ),
                "shape": "mcq",
                "options": [
                    "Shard by order_id (hashed) — even distribution, easy to reason about.",
                    "Shard by user_id (hashed) — the dominant 95% query hits exactly one shard; the operational queries fan out to all shards (acceptable since they're 5% of traffic).",
                    "Shard by status — 'shipped' orders live on one shard, 'pending' on another.",
                    "Shard by created_at timestamp — newest orders on the latest shard, easy to time-slice."
                ],
                "answer_index": 1,
                "rationale": (
                    "The dominant query (per-user recent orders) must hit a single shard for "
                    "performance. user_id satisfies this: hash(user_id) routes to exactly one shard, "
                    "which holds all that user's orders. The 5% operational queries (count all "
                    "shipped, find by tracking_id) will fan out to all shards — but since they're 5% "
                    "of traffic, the cost is acceptable, and can be mitigated by maintaining a "
                    "secondary index (e.g., a tracking_id → order_id lookup in a separate, smaller, "
                    "non-sharded store or a search index). Option 1 (order_id) is the most common "
                    "naive choice — it distributes evenly but EVERY per-user query fans out to all "
                    "shards (since one user's orders are spread across all of them). This is "
                    "catastrophic for the dominant 95% workload. Option 3 (status) is even worse — "
                    "status changes over time, so an order would need to MOVE shards as it transitions "
                    "from pending → shipped → delivered. This is anti-shard-key design: never shard by "
                    "a mutable attribute. Option 4 (timestamp) creates a hot shard — all current "
                    "writes go to the newest shard, overwhelming it. (Twitter famously had this "
                    "problem in 2010 with their timeline cache; they mitigated with a hybrid "
                    "approach.) The principle: choose a shard key that (a) distributes evenly, "
                    "(b) keeps the dominant query on a single shard, and (c) is immutable. user_id "
                    "satisfies all three for an orders table."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "Uber Engineering — How We Built Schemaless",
            "url": "https://www.uber.com/blog/how-we-built-schemaless/",
            "publisher": "Uber Engineering",
            "type": "blog"
        },
        {
            "title": "Amazon Dynamo Paper (SOSP 2007)",
            "url": "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
            "publisher": "Amazon / DeCandia et al.",
            "type": "paper"
        },
        {
            "title": "Consistent Hashing and Random Trees (Karger et al.)",
            "url": "https://www.akamai.com/site/en/documents/research/consistent-hashing-and-random-trees-1997.pdf",
            "publisher": "MIT / Akamai",
            "type": "paper"
        },
        {
            "title": "Cassandra Architecture",
            "url": "https://cassandra.apache.org/doc/latest/architecture/",
            "publisher": "Apache Cassandra",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 9. sql-vs-nosql
# ──────────────────────────────────────────────────────────────────────────
SQL_VS_NOSQL = {
    "blocks": [
        {
            "type": "table",
            "id": "sql-nosql-table-b2",
            "payload": {
                "headers": ["Dimension", "SQL (PostgreSQL, MySQL)", "NoSQL (Cassandra, MongoDB, DynamoDB, Redis)"],
                "rows": [
                    ["Data model", "Tables, rows, columns, foreign keys", "Key-value, document, wide-column, graph — varies by type"],
                    ["Schema", "Strict, enforced by DB; migrations are expensive", "Flexible / schema-on-read; schema enforced by app"],
                    ["Joins", "Native, optimized, ACID across joined tables", "Limited or none; denormalize to avoid"],
                    ["Transactions", "ACID (atomic, consistent, isolated, durable)", "Often BASE (basically available, soft state, eventual consistency); some support per-partition ACID"],
                    ["Consistency", "Strong (linearizable) by default", "Tunable / eventual by default; some offer strong on single partition"],
                    ["Scaling model", "Vertical primary + read replicas; horizontal via sharding is hard", "Built for horizontal sharding; add nodes and rebalance"],
                    ["Query language", "SQL (declarative, standard)", "DB-specific (CQL, MongoDB Query Language, Redis commands)"],
                    ["Best at", "Complex queries, multi-row transactions, financial data, structured data", "Massive write throughput, flexible schema, single-key lookups, global distribution"],
                    ["Worst at", "Horizontal scaling beyond a few shards, schema churn, very high write QPS", "Multi-entity transactions, JOINs, ad-hoc analytics, referential integrity"],
                    ["Maturity", "40+ years, huge ecosystem, well-understood failure modes", "15-ish years, smaller ecosystems, more surprises at scale"],
                    ["Default choice", "PostgreSQL — until you outgrow it", "Only when SQL doesn't fit the access pattern"]
                ],
                "caption": "SQL vs NoSQL across the dimensions that actually drive the choice in production."
            }
        },
        {
            "type": "prose",
            "id": "postgres-jsonb-bridge-b2",
            "payload": {
                "text": (
                    "**PostgreSQL jsonb — the bridge that often eliminates the need for NoSQL.**\n\n"
                    "A common architectural mistake is choosing MongoDB for 'flexible schema' when "
                    "PostgreSQL has had jsonb (binary JSON) since 9.4 (2015). jsonb stores arbitrary "
                    "JSON in a binary format, supports indexing via GIN indexes, and lets you query "
                    "nested fields with SQL operators. The result: many workloads that 'need NoSQL' "
                    "actually just need flexible schema in a single table — and PostgreSQL can do that "
                    "without giving up ACID, JOINs, or transactions.\n\n"
                    "Example schema that bridges the gap:\n"
                    "```\n"
                    "CREATE TABLE events (\n"
                    "  id          BIGSERIAL PRIMARY KEY,\n"
                    "  user_id     BIGINT NOT NULL,\n"
                    "  event_type  TEXT   NOT NULL,\n"
                    "  payload     JSONB  NOT NULL,  -- flexible per-type schema\n"
                    "  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()\n"
                    ");\n"
                    "-- Index the JSON for fast lookups\n"
                    "CREATE INDEX idx_events_payload ON events USING GIN (payload jsonb_path_ops);\n"
                    "-- Index user_id + created_at for time-range queries\n"
                    "CREATE INDEX idx_events_user_time ON events (user_id, created_at DESC);\n"
                    "```\n\n"
                    "Now you can query with both structured (SQL) and document (JSON) operations:\n"
                    "```\n"
                    "-- Find login events for user 42 in the last hour with browser=Chrome\n"
                    "SELECT * FROM events\n"
                    "  WHERE user_id = 42\n"
                    "    AND event_type = 'login'\n"
                    "    AND created_at > NOW() - INTERVAL '1 hour'\n"
                    "    AND payload->>'browser' = 'Chrome';\n"
                    "```\n\n"
                    "When does this NOT suffice, and you really do need NoSQL?\n"
                    "- **Write throughput beyond ~50K writes/sec** on a single primary — Cassandra or "
                    "DynamoDB scale horizontally where PostgreSQL can't.\n"
                    "- **NoSQL-style horizontal sharding is core** — Cassandra, DynamoDB, and MongoDB "
                    "shard transparently; PostgreSQL sharding (Citus) is good but adds operational "
                    "complexity.\n"
                    "- **Schema is truly schemaless and evolves per record** — e.g., user-generated "
                    "forms. Document stores handle this natively; SQL requires the jsonb escape hatch.\n\n"
                    "The decision rule: reach for PostgreSQL + jsonb first. Switch to a document store "
                    "only when you've proven the jsonb path can't meet your write throughput or scaling "
                    "needs. The cost of being wrong in this direction is small (a migration); the cost "
                    "of starting with NoSQL and realizing you needed ACID is much larger."
                )
            }
        },
        {
            "type": "callout",
            "id": "acid-base-b2",
            "payload": {
                "title": "ACID vs BASE — the philosophical divide",
                "body": (
                    "**ACID** (SQL's promise): Atomic — all-or-nothing transactions. Consistent — DB "
                    "enforces invariants (foreign keys, constraints). Isolated — concurrent "
                    "transactions don't see each other's partial writes. Durable — committed writes "
                    "survive crashes. ACID trades latency and availability for correctness. Use when "
                    "a half-completed transaction is worse than a failed one (payments, bookings, "
                    "inventory).\n\n"
                    "**BASE** (NoSQL's promise): Basically Available — system remains responsive under "
                    "failure. Soft State — application reconciles state over time. Eventually "
                    "Consistent — replicas converge given enough time. BASE trades correctness for "
                    "availability and partition tolerance. Use when stale data is acceptable "
                    "(social feeds, dashboards, logs).\n\n"
                    "The two are not 'right vs wrong' — they're different points on the CAP "
                    "trade-off curve. Most real systems use both: SQL for transactional core "
                    "(payments, users, inventory) and NoSQL for the read-heavy / write-heavy "
                    "periphery (feeds, analytics, cache)."
                ),
                "kind": "note"
            }
        },
        {
            "type": "mermaid",
            "id": "decision-flowchart-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    Start[Need to store data] --> Q1{Need multi-row<br/>ACID transactions?}\n"
                    "    Q1 -->|Yes — payments, bookings, inventory| SQL[PostgreSQL<br/>ACID + JOINs + constraints]\n"
                    "    Q1 -->|No| Q2{Need massive write<br/>throughput or time-series?}\n"
                    "    Q2 -->|Yes — logs, events, metrics| WC[Cassandra / ScyllaDB<br/>wide-column, AP, tunable consistency]\n"
                    "    Q2 -->|No| Q3{Need sub-ms reads<br/>on simple keys?}\n"
                    "    Q3 -->|Yes — cache, counters, rate limits| KV[Redis / DynamoDB<br/>key-value, in-memory or single-digit ms]\n"
                    "    Q3 -->|No| Q4{Need flexible schema<br/>or nested documents?}\n"
                    "    Q4 -->|Yes — content, profiles, catalogs| DOC[MongoDB / Couchbase<br/>document store, JSON-native]\n"
                    "    Q4 -->|No| Q5{Need graph traversal<br/>or relationship queries?}\n"
                    "    Q5 -->|Yes — social, recommendations, fraud| GRAPH[Neo4j / Dgraph<br/>graph DB, edge-native]\n"
                    "    Q5 -->|No| DEFAULT[PostgreSQL<br/>with jsonb for flexibility<br/>start simple, migrate if needed]\n"
                    "\n"
                    "    classDef sql fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef nosql fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef default fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    class SQL,DEFAULT sql\n"
                    "    class WC,KV,DOC,GRAPH nosql"
                ),
                "caption": "When to use which database — a decision flowchart by workload characteristics.",
                "alt_text": "A decision flowchart. Start: need to store data. If multi-row ACID transactions needed (payments, bookings, inventory) → PostgreSQL. Otherwise, if massive write throughput or time-series needed (logs, events, metrics) → Cassandra/ScyllaDB wide-column. Otherwise, if sub-millisecond reads on simple keys needed (cache, counters, rate limits) → Redis/DynamoDB key-value. Otherwise, if flexible schema or nested documents needed (content, profiles, catalogs) → MongoDB/Couchbase document. Otherwise, if graph traversal needed (social, recommendations, fraud) → Neo4j/Dgraph graph. Otherwise, default → PostgreSQL with jsonb for flexibility (start simple, migrate if needed)."
            }
        },
        {
            "type": "prose",
            "id": "uber-polyglot-b2",
            "payload": {
                "text": (
                    "**Real example: Uber's polyglot persistence.**\n\n"
                    "Uber's stack uses different databases for different access patterns (documented "
                    "across years of engineering blog posts):\n\n"
                    "- **Schemaless on MySQL** for trips, users, drivers — sharded by UUID, "
                    "high-write-throughput, eventually consistent across regions. Custom store they "
                    "built because no off-the-shelf DB fit their write profile + global consistency needs.\n"
                    "- **PostgreSQL** for billing and financial data — ACID transactions, foreign keys, "
                    "auditable. Worth the cost of a stricter scaling story because the cost of a "
                    "double-charge or lost-charge is so high.\n"
                    "- **Cassandra** for location tracking (driver positions updated every few seconds "
                    "per driver; hundreds of thousands of writes/sec; reads are 'where are drivers "
                    "near this rider'). Massive write throughput, time-series friendly.\n"
                    "- **Redis** for caching (hot trip state, rate-limit counters, session data). Sub-"
                    "millisecond reads, in-memory, accepts data loss on crash for the cache use case.\n"
                    "- **Elasticsearch** for full-text search (rider destination autocomplete, driver "
                    "destination search). Inverted-index optimized for relevance-ranked text queries.\n"
                    "- **Kafka** for event streaming (every trip event flows through Kafka; downstream "
                    "consumers derive analytics, billing, fraud signals).\n\n"
                    "Why so many? Because each access pattern has a different optimal storage primitive. "
                    "Trying to do all of this in one database means either (a) the financial data loses "
                    "ACID guarantees (dangerous) or (b) the location tracking can't keep up with writes "
                    "(system failure). Polyglot persistence — using different databases for different "
                    "access patterns — is the standard pattern at scale. The cost: more infrastructure "
                    "to operate, more schemas to keep in sync, more failure modes to understand. The "
                    "rule of thumb: don't introduce a new database until the cost of operating it is "
                    "less than the cost of forcing your existing DB to do something it's bad at."
                )
            }
        },
        {
            "type": "quiz",
            "id": "q-polyglot-b2",
            "payload": {
                "question": (
                    "You're designing the data layer for a ride-sharing app. Which of these database "
                    "assignments is the strongest argument for polyglot persistence?"
                ),
                "shape": "mcq",
                "options": [
                    "Use PostgreSQL for everything — it has jsonb, geospatial extensions (PostGIS), and can scale with read replicas.",
                    "PostgreSQL for billing (ACID), Schemaless/MySQL for trips (sharded writes), Cassandra for driver location (massive write throughput), Redis for hot-cache, Elasticsearch for destination search.",
                    "Use MongoDB for everything — flexible schema handles any data shape.",
                    "Use DynamoDB for everything — managed by AWS, scales horizontally, no operational overhead."
                ],
                "answer_index": 1,
                "rationale": (
                    "Polyglot persistence means matching each access pattern to the database optimized "
                    "for it. A ride-sharing app has fundamentally different workloads: (a) billing "
                    "needs ACID transactions and referential integrity — PostgreSQL. (b) trips need "
                    "sharded high-write throughput with eventual consistency across regions — a "
                    "sharded store like Schemaless or Vitess on MySQL. (c) driver location updates "
                    "every few seconds per driver, hundreds of thousands of writes/sec — Cassandra. "
                    "(d) hot cache for in-progress trip lookups — Redis. (e) destination autocomplete "
                    "with fuzzy matching and relevance — Elasticsearch. Trying to force any single "
                    "database to do all five well is the most expensive mistake in the design — "
                    "PostgreSQL can't keep up with location writes; MongoDB lacks ACID for billing "
                    "(and its multi-document transaction story is weak); DynamoDB doesn't have full-"
                    "text search natively. Option 1 (PostgreSQL for everything) sounds clean but "
                    "ignores that PostgreSQL's single-primary write ceiling is ~tens of thousands "
                    "of writes/sec — orders of magnitude below Uber's location-write volume. Option "
                    "3 (MongoDB everywhere) makes the same mistake with a different database. Option "
                    "4 (DynamoDB everywhere) ignores that DynamoDB has no JOINs, no full-text search, "
                    "and is single-region by default (multi-region requires global tables with "
                    "last-write-wins conflict resolution — bad for billing). The lesson: every "
                    "database is a specialist. Build polyglot only when you can articulate, per "
                    "workload, why the existing DB can't do it well enough."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "Brewer's CAP Theorem (PODC 2000 keynote)",
            "url": "https://www.cs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf",
            "publisher": "Eric Brewer / UC Berkeley",
            "type": "paper"
        },
        {
            "title": "Amazon Dynamo Paper (SOSP 2007) — BASE & tunable consistency",
            "url": "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
            "publisher": "Amazon / DeCandia et al.",
            "type": "paper"
        },
        {
            "title": "BASE: An ACID Alternative (Pritchett, 2008)",
            "url": "https://queue.acm.org/detail.cfm?id=1394128",
            "publisher": "ACM Queue / Dan Pritchett",
            "type": "paper"
        },
        {
            "title": "PostgreSQL Documentation — jsonb and indexes",
            "url": "https://www.postgresql.org/docs/current/datatype-json.html",
            "publisher": "PostgreSQL Global Development Group",
            "type": "official-doc"
        },
        {
            "title": "Uber Engineering — Why We Switched from Postgres to MySQL",
            "url": "https://www.uber.com/blog/postgres-to-mysql-transition/",
            "publisher": "Uber Engineering",
            "type": "blog"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 10. message-queues
# ──────────────────────────────────────────────────────────────────────────
MESSAGE_QUEUES = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "producer-consumer-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    P1[Producer 1<br/>web front-end] --> Q\n"
                    "    P2[Producer 2<br/>mobile API] --> Q\n"
                    "    P3[Producer 3<br/>batch job] --> Q\n"
                    "\n"
                    "    Q[(Message Queue<br/>partitioned by key<br/>FIFO per partition)]\n"
                    "\n"
                    "    Q --> C1[Consumer 1<br/>group=orders]\n"
                    "    Q --> C2[Consumer 2<br/>group=orders]\n"
                    "    Q --> C3[Consumer 3<br/>group=orders]\n"
                    "\n"
                    "    Q --> S1[Subscriber A<br/>analytics pipeline]\n"
                    "    Q --> S2[Subscriber B<br/>notification service]\n"
                    "\n"
                    "    C1 --> H[(idempotency<br/>key store)]\n"
                    "    C2 --> H\n"
                    "    C3 --> H\n"
                    "    C1 --> DB1[(orders DB)]\n"
                    "    C2 --> DB1\n"
                    "    C3 --> DB1\n"
                    "\n"
                    "    S1 --> DW[(data warehouse)]\n"
                    "    S2 --> Push[Push notification service]\n"
                    "\n"
                    "    DLQ[(Dead-letter queue<br/>poison messages)] -.after N retries.-> Q\n"
                    "\n"
                    "    classDef prod fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef cons fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef store fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef warn fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    class P1,P2,P3 prod\n"
                    "    class C1,C2,C3,S1,S2 cons\n"
                    "    class Q,DB1,DW,Push,H store\n"
                    "    class DLQ warn"
                ),
                "caption": "Full producer-consumer topology: multiple producers, competing consumers in a group, pub/sub subscribers, idempotency store, dead-letter queue.",
                "alt_text": "Three producers (web front-end, mobile API, batch job) write to a partitioned message queue. Three consumers in the orders group compete for messages (each message goes to exactly one consumer in the group). Two subscribers (analytics pipeline and notification service) each get a copy of every message. Each consumer checks an idempotency key store before writing to the orders database, so duplicate deliveries don't cause double processing. A dead-letter queue receives messages that fail processing N times, isolating poison messages from the main queue."
            }
        },
        {
            "type": "table",
            "id": "delivery-semantics-b2",
            "payload": {
                "headers": ["Semantic", "At-most-once", "At-least-once", "Exactly-once (claimed)"],
                "rows": [
                    ["Message loss", "Possible — no retransmission", "Impossible — retransmit on no-ACK", "Impossible"],
                    ["Message duplication", "Impossible", "Possible — retransmission creates duplicates", "Impossible (in theory)"],
                    ["Cost", "Lowest — fire and forget", "Medium — track ACKs, retransmit on timeout", "Highest — distributed consensus + transactional dedup"],
                    ["Consumer requirement", "None", "Idempotent — handle duplicates safely", "None — broker dedupes"],
                    ["Real systems", "StatsD, fire-and-forget logging, UDP telemetry", "Kafka default, SQS standard, RabbitMQ default", "Kafka transactions (idempotent producer + transactional consumer), SQS FIFO with dedup ID (per-message exactly-once within 5-min window)"],
                    ["What 'exactly-once' really means", "—", "—", "At-least-once delivery + idempotent consumer + dedup by message id — the broker makes duplication impossible to OBSERVE, even though it can still happen internally"],
                    ["Use case", "Telemetry, metrics, sampling where loss is OK", "Most production workloads — payments, emails, jobs", "Stateful stream processing where duplicates would corrupt aggregates"]
                ],
                "caption": "Delivery semantics comparison. 'Exactly-once' is almost always at-least-once + idempotency + deduplication under the hood."
            }
        },
        {
            "type": "mermaid",
            "id": "dlq-flow-b2",
            "payload": {
                "code": (
                    "flowchart TD\n"
                    "    Q[Main queue] --> C[Consumer]\n"
                    "    C --> Proc{Process message}\n"
                    "    Proc -->|Success| Ack[ACK → remove from queue]\n"
                    "    Proc -->|Failure<br/>exception, timeout| Retry[Increment retry count]\n"
                    "    Retry --> Check{retry count<br/>>= max?}\n"
                    "    Check -->|No| Reprocess[Re-queue with backoff<br/>e.g., exp(2, n) seconds]\n"
                    "    Reprocess --> Q\n"
                    "    Check -->|Yes, e.g., 5 tries| DLQ[(Dead-letter queue)]\n"
                    "    DLQ --> Alert[PagerDuty alert<br/>ops investigates]\n"
                    "    DLQ --> Inspect[Replay tool<br/>inspect + reprocess]\n"
                    "    Inspect -->|fix + replay| Q\n"
                    "    Inspect -->|poison, discard| Archive[Archive to S3<br/>for audit]\n"
                    "\n"
                    "    classDef ok fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef warn fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    class Ack ok\n"
                    "    class Retry,Reprocess,Inspect warn\n"
                    "    class DLQ,Alert,Archive bad"
                ),
                "caption": "Dead-letter queue flow: failed messages retry with backoff, then move to DLQ for inspection. Ops can replay or archive.",
                "alt_text": "A consumer reads a message from the main queue. On success, it ACKs and the message is removed. On failure (exception, timeout), it increments a retry count. If retry count is below max, the message is re-queued with exponential backoff. If retry count reaches max (e.g., 5 tries), the message is moved to a dead-letter queue (DLQ). The DLQ triggers a PagerDuty alert for ops investigation. An inspect tool allows replay (after fixing the consumer bug) or archive to S3 (for poison messages that will never succeed)."
            }
        },
        {
            "type": "prose",
            "id": "kafka-linkedin-b2",
            "payload": {
                "text": (
                    "**Real example: Kafka at LinkedIn.**\n\n"
                    "Kafka was built at LinkedIn in 2010-2011 to solve a specific problem: their existing "
                    "messaging infrastructure (ActiveMQ) couldn't handle the throughput required to "
                    "stream every user-action event (page views, clicks, profile updates, job applications) "
                    "from the website to their Hadoop data warehouse for analytics. ActiveMQ was doing "
                    "~100K messages/sec cluster-wide; LinkedIn needed ~2M/sec and growing.\n\n"
                    "Kafka's design choices (documented in the original 2011 NetDB paper and LinkedIn's "
                    "engineering blog):\n\n"
                    "- **Append-only log partitioned by key** — each partition is an ordered, immutable "
                    "sequence of messages on disk. Writes are sequential (fast even on spinning disks), "
                    "and consumers read at their own pace by tracking an offset. This is fundamentally "
                    "different from traditional message queues (RabbitMQ, ActiveMQ) which delete messages "
                    "after ACK.\n"
                    "- **Consumer groups** — multiple consumers can read the same partition by splitting "
                    "the partitions among them (one partition per consumer in a group, max). Different "
                    "consumer groups read independently. This decouples producers from consumers: a "
                    "single Kafka topic can feed a real-time fraud-detection system, a batch analytics "
                    "pipeline, and a search indexer — all reading the same stream at their own pace.\n"
                    "- **Replication across brokers** — each partition has N replicas; one is leader, the "
                    "rest follow. If a broker dies, a replica takes over as leader. This is the durability "
                    "story that lets you run Kafka on commodity hardware.\n"
                    "- **Retention by time or size, not by ACK** — messages stay in Kafka for hours, days, "
                    "or weeks regardless of whether consumers have read them. This enables replay: a new "
                    "consumer can re-process the entire history of a topic. (Trade-off: storage cost.)\n\n"
                    "By 2014, LinkedIn was processing trillions of messages per day through Kafka across "
                    "thousands of topics. By 2024, Kafka is the standard for event streaming at almost "
                    "every large company — Uber, Netflix, Twitter, Airbnb, LinkedIn all run it. The "
                    "lesson: a single durable, replayable log is a more flexible primitive than a "
                    "delete-after-ACK queue. Most modern event-driven architectures are built on this "
                    "insight."
                )
            }
        },
        {
            "type": "prose",
            "id": "kafka-vs-rabbitmq-b2",
            "payload": {
                "text": (
                    "**Kafka vs RabbitMQ — the choice that defines your architecture.**\n\n"
                    "Both are 'message queues', but they have fundamentally different models and "
                    "trade-offs. Choosing wrong is expensive to undo.\n\n"
                    "**RabbitMQ** is a classic message broker. Messages live in queues; consumers "
                    "ACK each message; ACKed messages are deleted. Routing is rich (topic exchanges, "
                    "fanout, header-based) and per-message. Latency is low (sub-millisecond on LAN). "
                    "The model is **work distribution**: 'I have N tasks, distribute them across M "
                    "workers, each task done once.' Use RabbitMQ when you want a classic job queue "
                    "(send email, process upload, run background job) with rich routing.\n\n"
                    "**Kafka** is a distributed append-only log. Producers write to topic partitions; "
                    "consumers read at their own offset. Messages are NOT deleted on ACK — they're "
                    "retained by time or size (hours to weeks). Multiple consumer groups can read the "
                    "same message independently. The model is **event streaming**: 'I have a stream of "
                    "events; multiple downstream systems want to react to each event, and replay is "
                    "valuable.' Use Kafka when you want event-driven architecture (every user action "
                    "becomes an event), analytics pipelines (consume the same stream into a data "
                    "warehouse), or replay capability (re-process last week's events after fixing a bug).\n\n"
                    "The choice:\n"
                    "- **Job queue pattern** (send email, run cron task, process upload) → RabbitMQ. "
                    "Messages should be consumed once and deleted. Routing by message attribute matters.\n"
                    "- **Event streaming pattern** (user activity → analytics + notifications + search "
                    "index) → Kafka. Multiple consumers, each wants the full event history, replay "
                    "matters.\n"
                    "- **Mixed** → use both. Many real systems have RabbitMQ for job queues and Kafka "
                    "for event streaming.\n\n"
                    "A common mistake: choosing Kafka because 'it's more scalable' when the workload "
                    "is actually a job queue. Kafka CAN do job queues (consumer group with one partition "
                    "per consumer), but it's overkill — you'll pay the operational cost of running a "
                    "Kafka cluster (3+ brokers, ZooKeeper/KRaft, monitoring) for functionality "
                    "RabbitMQ gives you in one process. Conversely, using RabbitMQ for high-throughput "
                    "event streaming will hit the wall when you need multiple independent consumers or "
                    "replay — Kafka's log retention model is what makes those possible.\n\n"
                    "LinkedIn's choice of Kafka (and Uber's, Netflix's, Twitter's) wasn't because Kafka "
                    "is 'better' — it's because their workload was event streaming at scale, where the "
                    "append-only log with retention is the right primitive. A 100-message-per-second "
                    "job queue in a small startup should not run Kafka; it should run RabbitMQ or even "
                    "a database-backed queue."
                )
            }
        },
        {
            "type": "callout",
            "id": "poison-message-b2",
            "payload": {
                "title": "Poison messages — the silent queue killer",
                "body": (
                    "A poison message is one that always fails processing (malformed payload, missing "
                    "reference, division by zero). Without a max-retry limit and DLQ, the consumer "
                    "retries forever, the queue grows, every other message is blocked behind the "
                    "poison, and the entire pipeline stalls. Production rule: always set max retries "
                    "(typically 3-5) with exponential backoff, then route the message to a dead-letter "
                    "queue and alert on DLQ depth. The DLQ is your queue's immune system — it isolates "
                    "the broken message so the healthy ones can flow. Without it, one bad message can "
                    "take down the whole system."
                ),
                "kind": "warning"
            }
        },
        {
            "type": "quiz",
            "id": "q-dlq-b2",
            "payload": {
                "question": (
                    "Your email-sending consumer reads from an SQS queue. A message with malformed JSON "
                    "arrives, your parser throws, the message is retried 100 times over 4 hours, "
                    "blocking the queue for legitimate emails. Users complain emails are delayed by "
                    "hours. What is the correct production architecture to prevent this?"
                ),
                "shape": "mcq",
                "options": [
                    "Increase the visibility timeout so the consumer has more time to process.",
                    "Set max receive count (e.g., 5) and configure a dead-letter queue. After 5 failed deliveries, the message moves to the DLQ, the main queue flows normally, ops gets alerted to investigate the poison message.",
                    "Make the parser more lenient so it doesn't throw on bad JSON.",
                    "Switch from SQS to Kafka."
                ],
                "answer_index": 1,
                "rationale": (
                    "This is the textbook poison-message scenario, and the textbook fix is max-receive-"
                    "count + DLQ. SQS supports this natively via the queue's RedrivePolicy: after N "
                    "receive counts (without deletion), the message is automatically moved to a "
                    "configured DLQ. The main queue keeps flowing, legitimate emails go out, and ops "
                    "gets a DLQ-depth alert to investigate the poison message (which is now isolated "
                    "and inspectable). Option 1 (increase visibility timeout) makes the stall WORSE — "
                    "the consumer now waits even longer per retry before failing again. Option 3 "
                    "(lenient parser) is wrong — it would silently corrupt the email-sending system by "
                    "treating malformed JSON as if it were valid. Bad data should fail loudly, not "
                    "silently succeed. Option 4 (switch to Kafka) is cargo-culting — Kafka also "
                    "requires you to handle poison messages (typically by catching exceptions, "
                    "logging the offset, and seeking past the bad record); the architectural pattern "
                    "is the same regardless of broker. The deeper lesson: every consumer must "
                    "explicitly handle the failure path. Retries forever = queue stall = system down. "
                    "Bounded retries + DLQ + alerting is the standard pattern; treat it as a "
                    "non-optional part of any queue consumer."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "Apache Kafka — Documentation",
            "url": "https://kafka.apache.org/documentation/",
            "publisher": "Apache Software Foundation",
            "type": "official-doc"
        },
        {
            "title": "LinkedIn Engineering — Kafka: a Distributed Messaging System for Log Processing (NetDB 2011)",
            "url": "https://www.slideshare.net/slideshow/kafka-a-distributed-messaging-system-for-log-processing/15955235",
            "publisher": "LinkedIn Engineering",
            "type": "presentation"
        },
        {
            "title": "AWS SQS — Dead-Letter Queues",
            "url": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
            "publisher": "Amazon Web Services",
            "type": "official-doc"
        },
        {
            "title": "RabbitMQ — Reliability and Confirms",
            "url": "https://www.rabbitmq.com/reliability.html",
            "publisher": "RabbitMQ / Broadcom",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# 11. rate-limiting
# ──────────────────────────────────────────────────────────────────────────
RATE_LIMITING = {
    "blocks": [
        {
            "type": "mermaid",
            "id": "token-bucket-diagram-b2",
            "payload": {
                "code": (
                    "flowchart LR\n"
                    "    Refill[Refill process<br/>adds R tokens / sec<br/>up to capacity C] --> Bucket[(Token bucket<br/>capacity = C<br/>current = T)]\n"
                    "\n"
                    "    Req[Incoming request] --> Check{T >= 1?}\n"
                    "    Check -->|Yes| Consume[Decrement T<br/>process request<br/>return 200]\n"
                    "    Check -->|No| Reject[Return 429<br/>Retry-After: time-to-refill]\n"
                    "\n"
                    "    Bucket --> Check\n"
                    "\n"
                    "    subgraph Example[C=100, R=10/sec]\n"
                    "        E1[t=0: T=100<br/>burst of 100 reqs succeeds] --> E2[t=5s: T=50<br/>50 more succeed]\n"
                    "        E2 --> E3[t=10s: T=0<br/>next request: 429<br/>Retry-After: 0.1s]\n"
                    "        E3 --> E4[t=20s: T=100<br/>refilled while idle<br/>burst again possible]\n"
                    "    end\n"
                    "\n"
                    "    classDef store fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef ok fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    classDef ex fill:#3a2e1e,stroke:#f59e0b,color:#fef3c7\n"
                    "    class Bucket store\n"
                    "    class Consume ok\n"
                    "    class Reject bad\n"
                    "    class E1,E2,E3,E4 ex"
                ),
                "caption": "Token bucket algorithm: tokens refill continuously; requests consume one; empty bucket rejects with 429 + Retry-After.",
                "alt_text": "A refill process adds R tokens per second up to capacity C into a token bucket (capacity C, current T). Incoming requests check if T >= 1. If yes, decrement T and process the request (return 200). If no, return 429 with Retry-After set to the time until the next token refills. Example with C=100, R=10/sec: at t=0 T=100, a burst of 100 requests succeeds. At t=5s T=50, 50 more succeed. At t=10s T=0, the next request gets 429 with Retry-After: 0.1s. At t=20s T=100, the bucket has refilled while idle and another burst is possible."
            }
        },
        {
            "type": "table",
            "id": "sliding-fixed-b2",
            "payload": {
                "headers": ["Dimension", "Fixed Window", "Sliding Window (counter)", "Sliding Window (log)"],
                "rows": [
                    ["How it works", "Count requests in [t-60s, t]. Reset at minute boundary.", "Maintain a counter per minute; current rate = weighted sum of current + previous minute's counter", "Store timestamps of each request; count timestamps in [now-60s, now]"],
                    ["Burst at boundary", "Yes — 2x burst possible (100 at t=59s + 100 at t=61s = 200 in 2s)", "Reduced — weighted counter smooths boundary", "None — exact count in any 60s window"],
                    ["Memory per client", "1 integer (counter) + 1 timestamp", "2 integers (current + previous counter)", "O(N) — one timestamp per request in window"],
                    ["Accuracy", "Poor at boundaries", "Good (within ~10%)", "Exact"],
                    ["CPU cost", "O(1) per request", "O(1) per request", "O(N) per request (must scan or use sorted set)"],
                    ["Typical use", "Coarse API limits where burst at boundary is acceptable", "Most production API rate limiters (Cloudflare, Stripe, GitHub)", "Critical per-user limits where exactness matters (paid APIs)"],
                    ["Real systems", "Simple in-memory limits", "Redis + sliding-window counter (common)", "Redis sorted set (ZADD/ZREMRANGEBYSCORE)"]
                ],
                "caption": "Fixed window vs sliding window variants — accuracy and memory trade-offs."
            }
        },
        {
            "type": "mermaid",
            "id": "distributed-rl-b2",
            "payload": {
                "code": (
                    "flowchart TB\n"
                    "    Client[Client] --> LB[Load balancer]\n"
                    "    LB --> A[App server A]\n"
                    "    LB --> B[App server B]\n"
                    "    LB --> C[App server C]\n"
                    "\n"
                    "    A -->|1. INCR key:rl:{user_id}:min<br/>2. check vs limit| Redis[(Redis cluster<br/>shared rate-limit state)]\n"
                    "    B --> Redis\n"
                    "    C --> Redis\n"
                    "\n"
                    "    Redis -->|counter value| A\n"
                    "    Redis -->|counter value| B\n"
                    "    Redis -->|counter value| C\n"
                    "\n"
                    "    A --> Decision{counter <= limit?}\n"
                    "    B --> Decision2{counter <= limit?}\n"
                    "    C --> Decision3{counter <= limit?}\n"
                    "\n"
                    "    Decision -->|Yes| OK1[Process request, return 200]\n"
                    "    Decision -->|No| No1[Return 429 + Retry-After]\n"
                    "    Decision2 -->|Yes| OK2[Process]\n"
                    "    Decision2 -->|No| No2[429]\n"
                    "    Decision3 -->|Yes| OK3[Process]\n"
                    "    Decision3 -->|No| No3[429]\n"
                    "\n"
                    "    Note[Trade-off: +1ms Redis round-trip per request<br/>but accurate global rate limit across N servers<br/>Mitigation: token bucket local cache + periodic sync]\n"
                    "\n"
                    "    classDef server fill:#1e3a5f,stroke:#3b82f6,color:#e0e7ff\n"
                    "    classDef store fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef ok fill:#1e3a1e,stroke:#22c55e,color:#dcfce7\n"
                    "    classDef bad fill:#3a1e1e,stroke:#ef4444,color:#fee2e2\n"
                    "    classDef note fill:#2d1e3a,stroke:#a855f7,color:#f3e8ff\n"
                    "    class A,B,C server\n"
                    "    class Redis store\n"
                    "    class OK1,OK2,OK3 ok\n"
                    "    class No1,No2,No3 bad\n"
                    "    class Note note"
                ),
                "caption": "Distributed rate limiting: all app servers share rate-limit state in Redis. Adds ~1ms latency but enforces accurate global limits.",
                "alt_text": "A client request reaches a load balancer which routes to one of three app servers (A, B, or C). Each app server makes an INCR call to a shared Redis cluster, using a key like rl:user_id:min, and checks the counter against the limit. Redis returns the counter value. Each app server decides: if counter <= limit, process the request and return 200. If counter > limit, return 429 with Retry-After. The trade-off is +1ms Redis round-trip per request but accurate global rate limit enforcement across all servers. Mitigation for latency: token bucket local cache on each server with periodic sync to Redis."
            }
        },
        {
            "type": "prose",
            "id": "github-api-b2",
            "payload": {
                "text": (
                    "**Real example: GitHub API rate limits.**\n\n"
                    "GitHub's REST API (documented at docs.github.com/rest) uses a token-bucket rate "
                    "limiter per API key, with three tiers:\n\n"
                    "- **Unauthenticated requests**: 60 requests/hour per IP. Very low — GitHub "
                    "wants every script to authenticate so they can identify abusive clients.\n"
                    "- **Authenticated requests (basic / OAuth token)**: 5,000 requests/hour per "
                    "token. Standard for most integrations.\n"
                    "- **GitHub Apps (per-installation)**: 5,000 requests/hour per installation, "
                    "plus higher limits for specific high-volume endpoints (e.g., 12,500/hour for "
                    "listing commits).\n\n"
                    "Every API response includes three headers that tell the client the current state:\n"
                    "```\n"
                    "X-RateLimit-Limit: 5000\n"
                    "X-RateLimit-Remaining: 4993\n"
                    "X-RateLimit-Reset: 1700000000   # Unix timestamp when the window resets\n"
                    "X-RateLimit-Used: 7\n"
                    "X-RateLimit-Resource: core\n"
                    "```\n\n"
                    "When the client exceeds the limit, GitHub returns HTTP 429 with "
                    "`Retry-After: <seconds until reset>`. Good clients back off until the reset "
                    "time; bad clients retry immediately and get more 429s, wasting both their own "
                    "and GitHub's resources.\n\n"
                    "The headers are the key design lesson: rate limiting is a contract between "
                    "client and server. The server enforces limits; the client cooperates by "
                    "respecting `Retry-After`. Without the headers, clients can't cooperate — they "
                    "either retry blindly (causing more load) or give up (causing user-visible "
                    "failures). The `X-RateLimit-*` headers are now an industry-standard pattern, "
                    "adopted by Stripe, Twitter/X, AWS, and most modern APIs.\n\n"
                    "GitHub also implements **conditional requests** via `ETag` and `If-None-Match` "
                    "as a complement to rate limiting: if the resource hasn't changed since the "
                    "client's last fetch, GitHub returns `304 Not Modified` — and these conditional "
                    "requests don't count against the rate limit. This is a great pattern: rate "
                    "limiting caps abusive traffic; conditional requests make polite traffic cheaper."
                )
            }
        },
        {
            "type": "prose",
            "id": "per-ip-vs-per-user-b2",
            "payload": {
                "text": (
                    "**Rate-limit key choice — per-IP, per-user, per-API-key.**\n\n"
                    "The rate-limit key determines what 'one client' means, and getting it wrong breaks "
                    "either your service or your users. Three common choices:\n\n"
                    "**Per-IP.** The simplest. Works for anonymous traffic and DDoS protection. But two "
                    "critical failure modes:\n"
                    "1. **Carrier-grade NAT (CGNAT)** — most mobile users and many home users share a "
                    "single public IP with hundreds or thousands of other users. If you limit per-IP "
                    "to 100 req/min, you'll rate-limit legitimate users because they're sharing an IP "
                    "with a scraper. A single bad actor on a CGNAT IP can get everyone on that IP "
                    "rate-limited.\n"
                    "2. **IPv6 hoarding** — some scrapers have /64 IPv6 blocks (18 quintillion IPs). "
                    "Per-IP rate limiting is meaningless if the attacker has essentially unlimited IPs.\n\n"
                    "**Per-API-key.** The right choice for authenticated API traffic. Each registered "
                    "API key gets a bucket; abuse is attributable; the rate limit can vary by tier "
                    "(free vs paid). Failure modes: API keys leak (rotateable mitigation); a single "
                    "user creates many API keys to evade limits (mitigation: rate limit by account, not "
                    "just by key).\n\n"
                    "**Per-user (authenticated).** Strongest. Each logged-in user gets a bucket, "
                    "regardless of which API key or IP they use. The right choice for user-facing apps.\n\n"
                    "The production pattern: **layered limits.**\n"
                    "- Edge / IP-level (Cloudflare, AWS WAF): protects against DDoS, volumetric abuse. "
                    "High limit (e.g., 1000 req/min per IP).\n"
                    "- API-key level (API gateway): per-application limit (e.g., 100 req/min per key).\n"
                    "- User level (application): per-user limit (e.g., 30 req/min per logged-in user).\n"
                    "- Endpoint level (application): per-endpoint limit (e.g., 5 req/min for password "
                    "reset endpoint — protect against brute force).\n\n"
                    "GitHub's API uses per-API-key (per-token) rate limits, but applies stricter "
                    "per-endpoint limits for expensive operations (creating repos, listing commits). "
                    "Stripe uses per-API-key with separate limits for different resource types. The "
                    "principle: don't try to do all rate limiting at one layer — different attacks "
                    "need different defense points, and different endpoints have different cost profiles."
                )
            }
        },
        {
            "type": "callout",
            "id": "retry-after-b2",
            "payload": {
                "title": "The Retry-After header is not optional",
                "body": (
                    "When your service returns 429, it MUST include `Retry-After: <seconds>` (RFC 7231). "
                    "Without it, well-behaved clients don't know how long to wait — they either retry "
                    "immediately (compounding the load) or back off exponentially with random jitter "
                    "(often over-correcting). With it, the client knows exactly when to retry, and "
                    "load spikes dissipate quickly. Pair it with `X-RateLimit-Limit`, "
                    "`X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers (GitHub's pattern) so "
                    "clients can self-throttle proactively — never hitting the limit in the first place. "
                    "Skipping these headers turns rate limiting from a contract into a guessing game."
                ),
                "kind": "note"
            }
        },
        {
            "type": "quiz",
            "id": "q-token-bucket-b2",
            "payload": {
                "question": (
                    "Your API allows 100 requests per minute per API key, using a token bucket with "
                    "capacity C=100 and refill rate R=10/sec. A client uses all 100 tokens in the "
                    "first second, then immediately sends another request. What HTTP response should "
                    "the server return, and what should the Retry-After header be?"
                ),
                "shape": "mcq",
                "options": [
                    "200 OK — the client is within the per-minute limit.",
                    "429 Too Many Requests with Retry-After: 0.1 — the bucket is empty; the next token refills in 1/R = 0.1s, so the client can retry immediately after that.",
                    "429 with Retry-After: 60 — the client must wait for the next minute window.",
                    "429 with no Retry-After — let the client figure it out."
                ],
                "answer_index": 1,
                "rationale": (
                    "Token bucket's defining property: tokens refill continuously, not in window "
                    "boundaries. Capacity C=100 means the bucket can absorb a burst of 100 requests "
                    "instantaneously. Refill rate R=10/sec means 10 tokens reappear every second, "
                    "evenly distributed (so 1 token every 100ms). After the client burns all 100 in "
                    "second 0, the bucket is at 0. The next request must wait for the next token — "
                    "which arrives in 1/R = 0.1 seconds. So the correct response is 429 with "
                    "Retry-After: 0.1 (or 1, rounded up to whole seconds if your framework doesn't "
                    "support fractional). Option 1 (200 OK) is wrong because the bucket is empty — "
                    "the per-minute average rate would be 100/minute but token bucket enforces "
                    "instantaneous capacity, which the client has exhausted. Option 3 (Retry-After: "
                    "60) describes fixed-window semantics, not token bucket. Token bucket never "
                    "forces a full-minute wait — it only forces a wait until the next token. "
                    "Option 4 (no Retry-After) is a hostile API design — clients can't cooperate "
                    "without it. The deeper lesson: the algorithm choice (token bucket vs fixed "
                    "window vs sliding window) directly determines the user-visible behavior on "
                    "burst traffic. Token bucket allows bursts up to capacity and recovers "
                    "smoothly. Fixed window rejects bursts near boundaries and resets abruptly. "
                    "Choose the algorithm based on what burst behavior you want clients to "
                    "experience."
                ),
                "difficulty": "interview"
            }
        }
    ],
    "sources": [
        {
            "title": "GitHub REST API — Rate limits",
            "url": "https://docs.github.com/rest/overview/rate-limits-for-the-rest-api",
            "publisher": "GitHub",
            "type": "official-doc"
        },
        {
            "title": "Cloudflare — Rate limiting rules",
            "url": "https://developers.cloudflare.com/waf/rate-limiting-rules/",
            "publisher": "Cloudflare",
            "type": "official-doc"
        },
        {
            "title": "RFC 7231 — Retry-After header",
            "url": "https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3",
            "publisher": "IETF / R. Fielding",
            "type": "rfc"
        },
        {
            "title": "Redis — Pattern: Rate limiter",
            "url": "https://redis.io/docs/manual/patterns/distributed-locks/",
            "publisher": "Redis",
            "type": "official-doc"
        },
        {
            "title": "Stripe — Rate limits",
            "url": "https://docs.stripe.com/rate-limits",
            "publisher": "Stripe",
            "type": "official-doc"
        }
    ]
}

# ──────────────────────────────────────────────────────────────────────────
# Dispatch table
# ──────────────────────────────────────────────────────────────────────────
ENRICHMENTS = {
    "what-is-system-design": WHAT_IS_SYSTEM_DESIGN,
    "how-to-approach-system-design": HOW_TO_APPROACH,
    "udp": UDP,
    "load-balancers": LOAD_BALANCERS,
    "reverse-proxy": REVERSE_PROXY,
    "horizontal-scaling": HORIZONTAL_SCALING,
    "replication": REPLICATION,
    "sharding": SHARDING,
    "sql-vs-nosql": SQL_VS_NOSQL,
    "message-queues": MESSAGE_QUEUES,
    "rate-limiting": RATE_LIMITING,
}


def main():
    total_blocks_added = 0
    total_sources_added = 0
    for slug, enrich in ENRICHMENTS.items():
        path = CONCEPTS_DIR / f"{slug}.json"
        if not path.exists():
            print(f"  MISSING: {slug} — file not found at {path}")
            continue

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        existing_block_ids = {b["id"] for b in data.get("blocks", [])}
        blocks_added_here = 0
        for block in enrich["blocks"]:
            if block["id"] not in existing_block_ids:
                data["blocks"].append(block)
                existing_block_ids.add(block["id"])
                blocks_added_here += 1
                total_blocks_added += 1

        if "sources" not in data:
            data["sources"] = []
        existing_urls = {s.get("url") for s in data["sources"]}
        sources_added_here = 0
        for src in enrich.get("sources", []):
            if src["url"] not in existing_urls:
                data["sources"].append(src)
                existing_urls.add(src["url"])
                sources_added_here += 1
                total_sources_added += 1

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(
            f"  {slug:<35} +{blocks_added_here} blocks  +{sources_added_here} sources  "
            f"(blocks={len(data['blocks'])}, sources={len(data['sources'])})"
        )

    print(
        f"\n+{total_blocks_added} blocks, +{total_sources_added} sources added across "
        f"{len(ENRICHMENTS)} concepts."
    )


if __name__ == "__main__":
    main()
