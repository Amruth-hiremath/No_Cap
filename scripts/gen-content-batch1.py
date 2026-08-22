#!/usr/bin/env python3
"""
Generate deep, textbook-quality content for priority concepts.
Each concept gets: 1500-3000+ words of real teaching content,
multiple diagrams, 3-5 quiz questions, trade-offs, failure modes,
real-world mappings, interview questions, and key takeaways.
"""
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

# ═══════════════════════════════════════════════════════════════════════
# WHAT IS SYSTEM DESIGN
# ═══════════════════════════════════════════════════════════════════════
write_concept('what-is-system-design', {
    "slug": "what-is-system-design",
    "version": 3,
    "title": "What is System Design",
    "phase": "foundations",
    "area": "Foundations",
    "estimated_minutes": 12,
    "difficulty": "core",
    "summary": "System design is the process of defining the architecture, components, modules, interfaces, and data flows of a software system to meet specific requirements for scale, reliability, performance, and maintainability. It is the difference between code that works on your laptop and systems that survive production.",
    "why_it_matters": "Most code works in development. Most systems fail in production — under real load, with real failures, with real users doing unexpected things. System design is the discipline that prevents those failures. Every interview, every architecture review, every incident postmortem is fundamentally a system-design conversation. If you can't reason about trade-offs, bottlenecks, and failure modes, you can't build systems that scale.",
    "prerequisites": [],
    "related": ["how-to-approach-system-design", "performance-vs-scalability", "latency-vs-throughput"],
    "used_in": ["Every production software system ever built."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "System design answers a deceptively simple question: **how do you build software that works at scale, survives failures, and can be maintained over time?**\n\nThe question is simple because the goal is obvious. The answer is hard because 'scale', 'failure', and 'time' each pull in different directions.\n\nWhen you write a script that reads a file and prints the result, you are programming. When you ask 'what happens if 10,000 people run this script at the same time, on different machines, and one of the machines catches fire?' — you are doing system design."}},

        {"type": "callout", "id": "definition", "payload": {"title": "Working definition", "body": "System design is the process of choosing **what components** your system has, **how they communicate**, **where data lives**, and **what trade-offs you accept** — so the system meets its requirements for scale, reliability, latency, cost, and maintainability.", "kind": "note"}},

        {"type": "diagram", "id": "diagram-layers", "payload": {"ascii": "  ┌─────────────────────────────────────────┐\n  │            Users (clients)              │\n  └──────────────────┬────────────────────┘\n                     │\n  ┌──────────────────▼────────────────────┐\n  │      CDN  +  Load Balancer             │  ← traffic enters here\n  └──────────────────┬────────────────────┘\n                     │\n  ┌──────────────────▼────────────────────┐\n  │         Application Layer             │  ← stateless services\n  │     (service A, service B, ...)       │\n  └────┬──────────┬──────────┬──────────┘\n       │          │          │\n  ┌────▼───┐ ┌────▼───┐ ┌────▼────┐\n  │ Cache  │ │  DB    │ │ Queue   │  ← state lives here\n  └────────┘ └────────┘ └─────────┘", "caption": "A typical web system: clients → edge → app → stateful stores. Every box is a design decision.", "voice_alt_text": "A typical web system architecture diagram. Users connect through a CDN and load balancer to a layer of stateless application services. The services read from and write to a cache, a database, and a message queue. Every box represents a design decision with trade-offs."}},

        {"type": "prose", "id": "what-you-design", "payload": {"text": "When you design a system, you are making decisions in five areas:\n\n**1. Components** — what services, databases, caches, queues, and storage systems exist. A simple blog might have one web server and one database. A system like Netflix has hundreds of microservices, multiple database clusters, CDNs across the globe, and message queues connecting everything.\n\n**2. Communication** — how components talk to each other:\n- **Synchronous** (HTTP, gRPC): the caller waits for a response. Simple, but couples the caller's latency to the callee's.\n- **Asynchronous** (message queues, pub/sub): the caller sends and moves on. Decouples latency, but makes the system eventually consistent.\n- **Streaming** (WebSockets, SSE): persistent connection, server pushes data. Real-time, but resource-intensive.\n\n**3. Data** — where state lives and how it's stored:\n- **Relational** (PostgreSQL): structured, ACID, JOINs. Good for transactions.\n- **Key-value** (Redis): fast, simple. Good for caching.\n- **Document** (MongoDB): flexible schema. Good for content.\n- **Wide-column** (Cassandra): massive writes. Good for time-series.\n- **Object storage** (S3): files, images, videos. Cheap, durable.\n\n**4. Failure** — what happens when each component breaks:\n- If the primary database dies, can a replica take over?\n- If the cache cluster dies, does the system slow down or crash?\n- If a downstream service is slow, does your service hang or fail fast?\n- If an entire region goes offline, can you serve from another?\n\n**5. Scale** — how the system behaves at different loads:\n- 100 users: one server is fine.\n- 10,000 users: you need load balancing, caching, and probably read replicas.\n- 10,000,000 users: you need sharding, CDN, multi-region deployment, and careful capacity planning.\n\nEvery design decision is a trade-off. There are no free lunches."}},

        {"type": "callout", "id": "no-free-lunch", "payload": {"title": "The core truth", "body": "You cannot have maximum consistency, maximum availability, and maximum performance simultaneously. You cannot have a system that is infinitely scalable, perfectly reliable, and trivially simple. System design is the art of choosing **which trade-offs are acceptable for your specific problem**.", "kind": "note"}},

        {"type": "prose", "id": "the-problem-first-approach", "payload": {"text": "Good system design always starts with the problem, not the technology. Before choosing Kafka or Cassandra, before drawing boxes and arrows, you must answer:\n\n**What problem am I solving?**\n- 'Users need to share short messages with followers.' (Twitter)\n- 'Users need to watch videos on any device, anywhere.' (Netflix)\n- 'Drivers and riders need to match in real time.' (Uber)\n\n**What are the constraints?**\n- How many users? (10K vs 10M changes everything)\n- What latency is acceptable? (50ms vs 500ms vs 5s)\n- What availability is required? (99% vs 99.99%)\n- What's the budget? (startup vs enterprise)\n- What's the team size? (2 people vs 200)\n\n**What are the trade-offs?**\n- Strong consistency vs high availability?\n- Low latency vs low cost?\n- Simplicity vs flexibility?\n\nOnly after answering these questions do you start choosing technologies. The biggest mistake in system design is jumping to 'use Kafka and Cassandra' before understanding whether you even need them."}},

        {"type": "prose", "id": "interview-context", "payload": {"text": "In a system-design interview, the interviewer is not looking for a 'correct' answer — there usually isn't one. They are looking for:\n\n- **Clarification**: do you ask good questions before designing? ('What's the DAU? What's the read/write ratio? Do we need real-time?')\n- **Structure**: do you break the problem into requirements → capacity → API → data model → high-level design → deep dive → bottlenecks → trade-offs?\n- **Trade-off awareness**: do you name what you're giving up when you choose a technology? ('I chose Redis for caching — it gives me sub-millisecond reads, but it's in-memory so I risk data loss on crash.')\n- **Communication**: can you explain your reasoning out loud, draw diagrams, and adjust when the interviewer changes constraints?\n\nThis is why system design is a skill, not memorization. You practice it by designing systems, explaining your choices, and learning from real architectures."}},

        {"type": "prose", "id": "real-example", "payload": {"text": "Let's make this concrete. Suppose you're asked: **Design a URL shortener like bit.ly.**\n\n**Step 1 — Clarify:**\n- How many URLs per day? (100M/month → ~40 URLs/sec average, 400/sec peak)\n- Read/write ratio? (100:1 — shorteners are read-heavy)\n- Custom aliases? (Yes, but max 15 chars)\n- Analytics? (Yes — track clicks, referrer, geo)\n- Lifespan? (URLs never expire)\n\n**Step 2 — Capacity:**\n- 100M URLs/month × 100 bytes each = 10GB/month = 120GB/year of URL data\n- 100:1 read ratio → 10B reads/month → ~4,000 reads/sec average\n- Analytics: 10B click events/month → ~4,000 events/sec\n\n**Step 3 — API:**\n- `POST /shorten {url: '...', alias?: '...'}` → `{short: 'https://x.co/abc123'}`\n- `GET /{code}` → 301 redirect to long URL + record analytics\n\n**Step 4 — Data model:**\n- URLs table: `code` (PK), `long_url`, `created_at`, `user_id`\n- Clicks table: `code`, `timestamp`, `ip`, `referrer`, `geo`\n- Store: SQL for URLs (need uniqueness + transactions), analytics DB (Cassandra — high write throughput)\n\n**Step 5 — High-level design:**\n- Clients → CDN → Load Balancer → App servers → (Cache for hot URLs + DB for cold)\n- Analytics: App → Message Queue → Analytics consumer → Cassandra\n\n**Step 6 — Deep dive (the hard part):**\n- How to generate short codes? Hash + base62 encoding, or counter + encoding.\n- How to handle collisions? Check DB, retry with salt.\n- How to serve 4,000 reads/sec? Cache hot URLs in Redis (hit rate > 90%).\n- How to handle analytics without slowing redirects? Fire-and-forget to a queue.\n\nThis is system design: **structured thinking about trade-offs at scale.**"}},

        {"type": "quiz", "id": "q1", "payload": {"question": "Which statement best captures what system design is?", "shape": "mcq", "options": ["Choosing the right framework and programming language for your app.", "Defining components, communication, data, failure, and scale trade-offs for a software system.", "Writing code that passes all tests and has no bugs.", "Deploying code to cloud infrastructure like AWS or GCP."], "answer_index": 1, "rationale": "Frameworks, tests, and deployment are all implementation details. System design is the higher-level discipline of deciding what components exist, how they communicate, where data lives, how failures are handled, and how the system scales. It is about architecture and trade-offs, not specific tools. A system designer can work in any language and any cloud — the thinking is what matters.", "difficulty": "core"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "You're asked to 'Design Twitter.' What should you do FIRST?", "shape": "mcq", "options": ["Choose between PostgreSQL and Cassandra for the database.", "Draw the high-level architecture with load balancers and app servers.", "Clarify requirements: How many users? Real-time feed or eventual consistency? What's the read/write ratio?", "Estimate storage needed for 5 years of tweets."], "answer_index": 2, "rationale": "Always clarify requirements before estimating capacity or choosing technology. Without knowing the DAU (10K vs 300M), the read/write ratio (read-heavy vs write-heavy), and whether the feed needs to be real-time, you cannot choose the right database, caching strategy, or architecture. This is the #1 mistake in system design interviews: jumping to technology before understanding the problem.", "difficulty": "core"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "In a system design interview, what is the interviewer PRIMARILY evaluating?", "shape": "mcq", "options": ["Whether you can recite the CAP theorem from memory.", "Whether you have built the exact system before.", "Your ability to clarify requirements, structure the problem, and reason about trade-offs.", "How fast you can draw boxes on a whiteboard."], "answer_index": 2, "rationale": "Interviewers evaluate structured thinking and trade-off reasoning, not memorization. They want to see you clarify ambiguous requirements, break the problem into manageable pieces, and explain why you chose each technology and what you gave up. A candidate who designs a simple, well-reasoned system beats one who draws a complex diagram without explaining trade-offs.", "difficulty": "core"}}
    ],
    "trade_offs": {
        "pros": [
            "Forces explicit reasoning about scale, reliability, and cost before building.",
            "Catches problems before they become production incidents.",
            "Creates a shared language for engineering teams to discuss architecture.",
            "Enables teams to make informed decisions about technology choices."
        ],
        "cons": [
            "No single 'correct' answer — judgement-based and subjective.",
            "Time-consuming; easy to over-engineer or under-engineer.",
            "Requires broad knowledge of many technologies and patterns.",
            "Hard to practice without real production experience."
        ]
    },
    "failure_modes": [
        "Over-engineering: adding queues, caches, and microservices before the system needs them. Premature complexity is worse than simple code.",
        "Under-engineering: assuming a single server and single database will scale forever. They won't.",
        "Cargo-culting: copying a big-company architecture (e.g., Netflix) without understanding why they made those choices. Netflix has different constraints than you.",
        "Ignoring failure modes: designing only for the happy path. In production, the unhappy path is the normal path."
    ],
    "common_mistakes": [
        "Jumping into a solution before clarifying requirements and constraints.",
        "Memorizing architectures instead of understanding trade-offs. 'Use Kafka' is not a design — it's a technology choice that must be justified.",
        "Treating 'scalability' as a single axis — it has throughput, latency, and data-volume dimensions. A system can be high-throughput but high-latency.",
        "Forgetting that the simplest design that meets requirements is usually the best design. Complexity has a cost."
    ],
    "where_you_see_it": [
        "Every production software system ever built.",
        "Every system-design interview at every tech company.",
        "Every architecture review and incident postmortem."
    ],
    "interview_prompts": [
        "What is system design, and why does it matter?",
        "Walk me through how you would approach designing a system you've never seen before.",
        "What's the difference between system design and software architecture?",
        "Why do we study system design separately from programming?"
    ],
    "real_system_mappings": [
        {"system": "Netflix", "how": "Microservices architecture with hundreds of services, each designed for a specific scale and failure profile. They migrated from a monolith to microservices to enable independent scaling and deployment. Their architecture is documented openly in their tech blog."},
        {"system": "Uber", "how": "Domain-oriented microservices with explicit dispatch, geospatial, and pricing subsystems. Evolved from a monolith to a distributed system over years as they scaled from one city to hundreds. Their engineering blog details the evolution."}
    ],
    "status": "published",
})

# ═══════════════════════════════════════════════════════════════════════
# HOW TO APPROACH SYSTEM DESIGN
# ═══════════════════════════════════════════════════════════════════════
write_concept('how-to-approach-system-design', {
    "slug": "how-to-approach-system-design",
    "version": 3,
    "title": "How to Approach System Design",
    "phase": "foundations",
    "area": "Foundations",
    "estimated_minutes": 15,
    "difficulty": "core",
    "summary": "A structured approach to system design: clarify requirements → estimate capacity → define APIs → model data → design high-level architecture → deep-dive components → identify bottlenecks → discuss trade-offs. Following this skeleton prevents you from jumping straight into a solution and missing critical constraints.",
    "why_it_matters": "Most system design interview failures and most production incidents come from skipping requirements clarification. People jump into 'use Kafka and Cassandra' before they know the read/write ratio, the latency target, or the failure requirements. A structured approach prevents this — and gives you a repeatable framework you can use for any system.",
    "prerequisites": ["what-is-system-design"],
    "related": ["performance-vs-scalability", "latency-vs-throughput", "capacity-estimation"],
    "used_in": ["Every system-design interview.", "Every real architecture review."],
    "blocks": [
        {"type": "prose", "id": "intro", "payload": {"text": "System design problems are open-ended by design. 'Design Twitter' could mean anything — a toy project for 100 users or a global platform for 300 million. The first job is to **narrow the problem**. The second is to **structure your thinking** so you don't miss critical constraints.\n\nThe 8-step skeleton below works for interviews and real architecture reviews alike. Use it as a checklist, not a rigid script. Some steps will be quick (30 seconds); others will take 10 minutes. The order matters — each step constrains the next."}},

        {"type": "diagram", "id": "approach-flow", "payload": {"ascii": "  1. Clarify requirements\n      │  (functional + non-functional)\n      ▼\n  2. Capacity estimation\n      │  (QPS, storage, bandwidth)\n      ▼\n  3. APIs / interfaces\n      │  (what does the system DO?)\n      ▼\n  4. Data model\n      │  (what entities, what store?)\n      ▼\n  5. High-level design\n      │  (boxes and arrows)\n      ▼\n  6. Deep dive\n      │  (the hard components)\n      ▼\n  7. Bottlenecks & failures\n      │  (what breaks first?)\n      ▼\n  8. Trade-offs & alternatives", "caption": "The 8-step system design skeleton. Each step constrains the next.", "voice_alt_text": "A vertical flowchart showing the 8-step system design approach: clarify requirements, estimate capacity, define APIs, model data, high-level design, deep dive, bottlenecks and failures, and trade-offs. Each step flows into the next, and each constrains the decisions you make later."}},

        {"type": "prose", "id": "step1", "payload": {"text": "**Step 1: Clarify requirements.** Before designing anything, ask:\n\n**Functional requirements** (what does the system do?):\n- What are the core features? (e.g., 'users can post tweets, follow others, see a feed')\n- What are the non-goals? (e.g., 'no recommendation algorithm in v1')\n- Who are the users? (consumers, admins, API clients)\n\n**Non-functional requirements** (how well must it do it?):\n- **Scale**: How many users? How many requests per second?\n- **Latency**: What's the acceptable response time? (50ms? 500ms?)\n- **Availability**: What's the uptime target? (99%? 99.99%?)\n- **Consistency**: Strong or eventual? (Can the feed be 5 seconds stale?)\n- **Cost**: What's the budget? (startup vs enterprise)\n- **Security**: Any special requirements? (PII, PCI, HIPAA)\n\nThis step takes 2-3 minutes in an interview and prevents 30 minutes of wasted design work. Interviewers want to see you ask these questions — it signals seniority."}},

        {"type": "callout", "id": "clarify-example", "payload": {"title": "Example: 'Design Twitter'", "body": "Before drawing anything, ask: 'Do we need to support real-time feed updates, or is eventual consistency acceptable? What's the expected DAU — 100K or 300M? Is the feed personalized (algorithmic) or just chronological? Do we need search? What about media — images, video? What's the timeline — do tweets need to appear in feeds within 1 second of posting, or is 10 seconds OK?' The answers completely change the architecture.", "kind": "note"}},

        {"type": "prose", "id": "step2", "payload": {"text": "**Step 2: Capacity estimation.** Translate requirements into numbers. This is where you figure out if you need one server or a thousand.\n\n**Back-of-the-envelope math for 'Design Twitter' (300M DAU):**\n\n*QPS (queries per second):*\n- 300M DAU × ~20 requests/day = 6B requests/day\n- 6B / 86400 seconds ≈ 70,000 QPS average\n- Peak = 3-5x average ≈ 200,000-350,000 QPS peak\n\n*Write QPS:*\n- 300M users × 0.1 tweets/day average = 30M tweets/day\n- 30M / 86400 ≈ 350 tweets/sec average\n- Peak (events, viral content): 3,500/sec\n\n*Storage:*\n- 30M tweets/day × 200 bytes (text) = 6GB/day text\n- With media (10% have images, avg 500KB): 30M × 0.1 × 500KB = 1.5TB/day\n- Yearly: ~550TB/year (media dominates)\n\n*Bandwidth:*\n- 70,000 reads/sec × 50KB per response = 3.5 GB/s = ~28 Gbps\n- Peak: 100 Gbps (requires CDN)\n\n*Cache sizing:*\n- If 80% of traffic hits 20% of content (Pareto), cache the top 20% of active tweets\n- Active tweets (last 7 days): ~210M × 200 bytes = ~42GB\n- Cache 20% = ~8GB — easily fits in Redis\n\nThese numbers don't need to be exact — they need to be **order-of-magnitude correct** so you can choose the right technology. 300M DAU rules out a single PostgreSQL instance. 28 Gbps of egress means you need a CDN. 1.5TB/day of media means you need object storage (S3), not a database."}},

        {"type": "prose", "id": "step3-4", "payload": {"text": "**Step 3: APIs.** Define the contract — what the system does. This forces you to think about the user-facing behavior, not just the internal architecture.\n\nFor Twitter:\n```\nPOST /tweets          — create a tweet (auth required)\nGET  /feed             — get user's timeline (paginated)\nPOST /follow/:user     — follow a user\nDELETE /follow/:user   — unfollow\nGET  /tweets/:id       — get a single tweet\n```\n\nAPIs reveal design decisions: do you need pagination? What's the auth model? Is it REST or something else?\n\n**Step 4: Data model.** What entities exist? How are they stored?\n\n- **User**: id, username, email, bio, created_at. → SQL (need transactions for auth, unique constraints).\n- **Tweet**: id, user_id, text, media_urls, created_at. → Wide-column (Cassandra — massive writes, time-ordered).\n- **Follow**: follower_id, followee_id, created_at. → Graph or SQL with composite index.\n- **Media**: stored in S3, URL referenced in tweet.\n- **Timeline**: pre-computed per user, stored in Redis (sorted set by timestamp).\n\nThis is where you decide between SQL, NoSQL, and hybrid. The data model constrains the architecture."}},

        {"type": "prose", "id": "step5-6", "payload": {"text": "**Step 5: High-level design.** Draw the boxes. Keep it at the 30,000-foot view:\n```\nClient → CDN → Load Balancer → App Servers → (Cache + DB + Queue)\n```\nDon't go deep yet. This is the skeleton.\n\n**Step 6: Deep dive.** Pick the 1-2 hardest components and design them in detail. For Twitter, the hard parts are:\n\n**Feed generation** — how do you build a user's timeline when they follow 1,000 people?\n- **Fan-out on write** (push model): when a user tweets, push the tweet ID into every follower's timeline cache. Pro: reads are O(1). Con: write amplification — a user with 30M followers writes 30M cache entries per tweet.\n- **Fan-out on read** (pull model): when a user opens their feed, fetch tweets from all 1,000 people they follow, merge, sort. Pro: no write amplification. Con: reads are slow (1,000 queries).\n- **Hybrid**: fan-out on write for normal users; fan-out on read for celebrities (30M followers).\n\n**Timeline cache** — how do you store the feed in Redis? Sorted set by timestamp. Each user's feed is a sorted set of tweet IDs. Capped at the last 1,000 tweets.\n\nThis is where you show depth. Don't deep-dive every component — pick the ones that are genuinely hard."}},

        {"type": "prose", "id": "step7-8", "payload": {"text": "**Step 7: Bottlenecks and failures.** Walk through what breaks:\n\n- What if the primary database dies? → Promote a replica. How long does failover take? (30s-2min)\n- What if a cache cluster dies? → System falls back to the database. Will it survive? (Probably not — cache absorbs 90% of reads. Need to degrade gracefully: throttle reads, serve stale data).\n- What if traffic spikes 10x? → Auto-scale app servers. But database can't auto-scale. Need read replicas + connection pooling.\n- What if a single user goes viral? → Their tweets get fanned out to millions. Use the hybrid approach: celebrities use fan-out on read.\n- What if an entire region goes down? → Multi-region deployment. But cross-region replication has lag.\n\n**Step 8: Trade-offs and alternatives.** Explicitly name what you gave up:\n\n- 'I chose fan-out on write for low read latency, but it costs write amplification and makes deletion hard (must delete from every follower's cache).'\n- 'I chose Cassandra for tweets because it handles massive write throughput, but I gave up JOINs and strong consistency — if a tweet and its media are stored separately, they can be inconsistent during a partition.'\n- 'I chose Redis for timeline cache because it's fast, but it's in-memory — if Redis crashes, all timelines need to be rebuilt from the database.'\n\nThis step separates senior from junior — the ability to articulate trade-offs clearly."}},

        {"type": "callout", "id": "anti-pattern", "payload": {"title": "Anti-pattern: jumping to technology", "body": "The most common mistake is hearing 'design Twitter' and immediately saying 'use Kafka, Cassandra, and Redis'. Technology choices come AFTER you understand requirements, capacity, and data model. Naming technologies too early signals you're memorizing rather than reasoning. Start with 'I need a system that handles X writes/sec and Y reads/sec with Z latency' — then choose the technology that fits.", "kind": "warning"}},

        {"type": "prose", "id": "time-allocation", "payload": {"text": "In a 45-minute interview, allocate time roughly:\n- Requirements clarification: 3-5 min\n- Capacity estimation: 3-5 min\n- API + data model: 5-7 min\n- High-level design: 5-7 min\n- Deep dive: 10-15 min\n- Bottlenecks + trade-offs: 5-10 min\n- Q&A: remaining time\n\nDon't spend 20 minutes on capacity estimation. Don't skip requirements. The interviewer will redirect you if you're going too deep on the wrong thing — listen to their cues."}},

        {"type": "quiz", "id": "q1", "payload": {"question": "You're asked to 'Design a URL shortener like bit.ly.' What should you do FIRST?", "shape": "mcq", "options": ["Choose between PostgreSQL and Cassandra for the database.", "Draw the high-level architecture with a load balancer and app server.", "Clarify requirements: how many URLs per day? What's the read/write ratio? Custom aliases?", "Estimate the storage needed for 5 years of URLs."], "answer_index": 2, "rationale": "Always clarify requirements before estimating capacity or choosing technology. Without knowing the read/write ratio (shorteners are typically 100:1 read-heavy) and the scale (1M URLs/day vs 100M), you cannot choose the right database, cache strategy, or hashing approach. Capacity estimation (step 2) comes after clarification (step 1). Drawing the architecture (step 5) comes even later.", "difficulty": "core"}},

        {"type": "quiz", "id": "q2", "payload": {"question": "During a system design interview, you've drawn the high-level architecture. What should you do next?", "shape": "mcq", "options": ["Start over if the interviewer didn't seem impressed.", "Pick the 1-2 hardest components and deep-dive them, then identify bottlenecks and trade-offs.", "List every technology you'd use and why.", "Ask the interviewer if you're done."], "answer_index": 1, "rationale": "After high-level design (step 5), you should deep-dive the hardest components (step 6) — the ones where the design is non-obvious and where trade-offs matter most. Then identify bottlenecks and failures (step 7) and articulate trade-offs (step 8). This shows structured thinking and depth, not breadth. Don't list every technology — that's step 3-4, and you should have done it before drawing boxes.", "difficulty": "core"}},

        {"type": "quiz", "id": "q3", "payload": {"question": "Your system needs to serve 70,000 reads/sec for a Twitter-like feed. Which combination of technologies makes sense?", "shape": "mcq", "options": ["A single PostgreSQL instance with fast SSDs.", "Load balancer + multiple app servers + Redis cache (for hot feeds) + Cassandra (for tweets).", "A single Redis instance serving everything.", "Direct database access from clients, no caching."], "answer_index": 1, "rationale": "70,000 reads/sec is beyond what a single PostgreSQL or Redis instance can handle. The right architecture: load balancer distributes across multiple stateless app servers; Redis caches the top 20% of active feeds (Pareto distribution — 80% of traffic hits 20% of content); Cassandra stores the actual tweets (massive write throughput, time-ordered). The cache absorbs 90%+ of reads, and the database handles the rest. This is the standard pattern for read-heavy social systems.", "difficulty": "interview"}}
    ],
    "trade_offs": {
        "pros": [
            "Prevents premature commitment to a technology.",
            "Surfaces constraints before they become incidents.",
            "Creates a shared structure that teams and interviewers can follow.",
            "Makes trade-offs explicit, so decisions are defensible."
        ],
        "cons": [
            "Can feel rigid — real systems sometimes need creative leaps.",
            "Takes 30-45 minutes; not every problem deserves full treatment.",
            "Can produce over-engineered designs if you follow every step dogmatically."
        ]
    },
    "failure_modes": [
        "Skipping requirements clarification → designing the wrong system.",
        "Jumping to technology before understanding data and scale.",
        "Deep-diving every component instead of the 1-2 hard ones.",
        "Not articulating trade-offs — making the design feel arbitrary."
    ],
    "common_mistakes": [
        "Treating the 8 steps as a script instead of a checklist.",
        "Estimating capacity with made-up numbers instead of deriving them from requirements.",
        "Forgetting to discuss failure modes — interviewers always ask 'what breaks?'",
        "Choosing 'cool' technologies (Kafka, Cassandra) when simpler ones (PostgreSQL, Redis) would work."
    ],
    "where_you_see_it": [
        "Every system-design interview at every tech company.",
        "Every real architecture review.",
        "Every good engineering design document."
    ],
    "interview_prompts": [
        "Walk me through how you would approach designing a system you've never seen before.",
        "What questions do you ask before starting a system design?",
        "Why is capacity estimation important before choosing a database?",
        "How do you decide which components to deep-dive vs. which to leave at the high level?"
    ],
    "real_system_mappings": [
        {"system": "Google design docs", "how": "Google's engineering culture requires design docs that follow this structure: requirements, alternatives, proposed design, trade-offs. Documented in their engineering practices guide."},
        {"system": "AWS Well-Architected Framework", "how": "AWS follows the same skeleton: requirements, capacity, design, bottlenecks, trade-offs. Their 5 pillars (operational excellence, security, reliability, performance efficiency, cost optimization) map to the non-functional requirements you clarify in step 1."}
    ],
    "status": "published",
})

print("\n✅ Foundations content written")
