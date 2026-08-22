#!/usr/bin/env python3
"""
content-enrichment-batch1.py

Enrich 10 priority concept files with deeper educational content:
  - 2+ new prose blocks (examples, failure scenarios, scaling implications)
  - 1+ new Mermaid diagrams (hand-crafted, meaningful)
  - 1+ new callout block
  - 1+ new scenario-style quiz block with detailed rationale
  - 1 new scenario block (schema-compliant)
  - sources array at top level (>= 2 entries)

Existing content is preserved verbatim — new blocks are APPENDED to the
existing `blocks` array, and `sources` is added as a new top-level key.
"""

import json
from pathlib import Path

CONCEPTS_DIR = Path("/home/z/my-project/download/nocap-v0.1/content/concepts")


# ──────────────────────────────────────────────────────────────────────
# 1. how-the-internet-works
# ──────────────────────────────────────────────────────────────────────

HOW_INTERNET_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "packet-switching-deep",
        "payload": {
            "text": "**Packet switching in practice.** When you stream a 4K video from Netflix, the bits do not travel as one continuous stream over a dedicated wire. The video is broken into ~1,500-byte IP packets, and each packet independently finds its way from Netflix's CDN to your home router. Packet 47 might travel Seattle→Tokyo→Mumbai→your ISP→your home; packet 48 might travel Seattle→LA→Singapore→Mumbai→your ISP→your home. If a submarine cable is cut near Mumbai, only the packets already in flight along that path are affected — subsequent packets immediately take the alternate route.\n\nThis is what makes the internet resilient: there is no single wire that, if cut, breaks the whole thing. The cost of this resilience is **reordering** — packets can arrive out of order, duplicated, or dropped entirely. TCP (the layer above IP) reassembles them in order and retransmits the missing ones. The application never sees the chaos underneath."
        }
    },
    {
        "type": "mermaid",
        "id": "packet-switching-mesh",
        "payload": {
            "code": "flowchart LR\n    Src[Netflix CDN<br/>origin: Virginia]\n    Src --> R1[Edge router<br/>Seattle]\n    Src --> R2[Edge router<br/>LA]\n    R1 --> R3[Backbone<br/>Chicago]\n    R1 --> R4[Submarine cable<br/>Pacific-1]\n    R2 --> R4\n    R2 --> R5[Submarine cable<br/>Pacific-2]\n    R4 --> R6[Router<br/>Singapore]\n    R5 --> R7[Router<br/>Tokyo]\n    R7 --> R6\n    R6 --> R8[ISP Mumbai]\n    R3 --> R8\n    R8 --> Home[Home router<br/>+ TV]\n    R4 -. cable cut .-> X((X))\n    R4 -. traffic reroutes .-> R5\n    classDef cut fill:#fee,stroke:#c33,stroke-width:2px,color:#900\n    classDef endpoint fill:#e8f0fe,stroke:#1967d2,stroke-width:2px,color:#174ea6\n    class X cut\n    class Src,Home endpoint",
            "caption": "Packet switching: each IP packet independently routes from source to destination. If one path fails, traffic reroutes through another within seconds via BGP convergence.",
            "alt_text": "A mesh diagram showing the Netflix CDN origin in Virginia connecting to edge routers in Seattle and LA, which connect to backbone routers and trans-Pacific submarine cables. The cables converge on routers in Singapore and Tokyo, which deliver to the user's ISP in Mumbai. One submarine cable is marked as cut, and traffic reroutes through the alternate path."
        }
    },
    {
        "type": "prose",
        "id": "router-failure-bgp",
        "payload": {
            "text": "**What happens when a router fails?** Backbone routers run BGP (Border Gateway Protocol) — fundamentally a gossip protocol. Each router announces to its neighbors which IP prefixes it can reach, and how far away they are. When a link or router dies, the affected router withdraws its announcements and re-announces the prefixes through a different neighbor. Every other router on the internet eventually hears about the change and updates its forwarding table. This is **BGP convergence**.\n\nConvergence is slow — typically 30 seconds to several minutes. During that window, packets destined for the failed path are black-holed (silently dropped). This is why a single misconfigured router can take a major website off the air for thousands of users for several minutes, even though the website itself is perfectly healthy.\n\nThree production incidents illustrate this failure mode: the 2019 Cloudflare BGP leak that black-holed parts of the global routing table; the 2008 Pakistan Telecom incident where a bad BGP announcement hijacked YouTube globally for 2 hours; and the October 2021 Facebook BGP withdrawal that took Facebook, Instagram, and WhatsApp offline for 6 hours. In every case, the data plane (origin servers) was fine — the control plane (BGP) disagreed about where traffic should go."
        }
    },
    {
        "type": "mermaid",
        "id": "tcp-handshake-seq",
        "payload": {
            "code": "sequenceDiagram\n    participant C as Client (Browser)\n    participant S as Server (Origin)\n    Note over C,S: Round 1 - TCP three-way handshake (1 RTT)\n    C->>S: SYN, seq=x\n    S->>C: SYN+ACK, seq=y, ack=x+1\n    C->>S: ACK, ack=y+1\n    Note over C,S: Round 2 - TLS 1.3 handshake (1 RTT)\n    C->>S: ClientHello + key share\n    S->>C: ServerHello + cert + key share\n    C->>S: Finished (encrypted)\n    Note over C,S: Round 3 - HTTP request (1 RTT)\n    C->>S: GET /index.html HTTPS\n    S->>C: 200 OK + HTML body\n    Note right of S: Total: 3 RTT before first byte<br/>on a fresh HTTPS connection\n    Note over C,S: HTTP/3 + 0-RTT TLS collapses all three rounds into one.",
            "caption": "TCP three-way handshake + TLS handshake + HTTP request. A fresh HTTPS connection costs three round trips before the first byte.",
            "alt_text": "A sequence diagram between a client browser and an origin server. Round 1 is the TCP three-way handshake: SYN, SYN+ACK, ACK — one round trip. Round 2 is the TLS 1.3 handshake: ClientHello with key share, ServerHello with cert and key share, Finished — one round trip. Round 3 is the HTTP request itself: GET with response — one round trip. Total: three round trips before the first byte. HTTP/3 with 0-RTT TLS collapses this to one round trip."
        }
    },
    {
        "type": "callout",
        "id": "cloudflare-edge-real",
        "payload": {
            "title": "Real system: Cloudflare's edge network",
            "body": "Cloudflare operates PoPs in ~330 cities worldwide. When a user in Mumbai types example.com, their DNS often resolves to a Cloudflare anycast IP that routes to the nearest edge PoP — typically within 5-20ms of the user. Cloudflare terminates the TLS handshake at the edge, serves cached static assets directly, and only contacts the origin (often in Virginia or Frankfurt) for dynamic content. This collapses the long browser→ISP→BGP→origin chain into a short browser→edge→(sometimes origin) chain, cutting latency from ~300ms to ~30ms. The same architecture underpins Fastly, Akamai, and AWS CloudFront — the principle is identical: push content as close to the user as physically possible.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-bgp-convergence",
        "payload": {
            "question": "A core internet router in Chicago fails. Users in New York trying to reach a server in Dallas suddenly see their requests time out for ~90 seconds, then start working again. The server is healthy. What happened?",
            "shape": "mcq",
            "options": [
                "TCP slow start on new connections through the alternate path.",
                "BGP is withdrawing old routes and re-converging on a new path. During convergence, packets to the failed router are black-holed until routing tables update.",
                "DNS is failing because the Chicago router was also a DNS resolver.",
                "The server in Dallas is restarting after losing its connection."
            ],
            "answer_index": 1,
            "rationale": "BGP convergence is the answer. When a backbone router fails, neighboring routers withdraw the BGP announcements for routes through it and re-announce via alternate paths. Every router on the internet must hear about this change and update its forwarding table — this typically takes 30-90 seconds. During that window, packets still being sent toward the failed router are black-holed (silently dropped). The server in Dallas was healthy throughout; the problem was entirely in the routing control plane. TCP slow start explains why a fresh connection is slow at first, but not a 90-second outage. DNS runs on top of the same routing, but a router failure doesn't take DNS down specifically — and DNS failures usually manifest as resolution errors, not timeouts to an otherwise-reachable IP.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-cdn-decision",
        "payload": {
            "prompt": "You run a streaming service in the US with one origin in Virginia. A user in Mumbai reports that pages take 4 seconds to load and frequently stall. Your monitoring shows the Virginia servers respond in 80ms. What is the highest-leverage architectural change?",
            "context": "Round-trip time from Mumbai to Virginia is ~280ms. A single page load triggers ~15 sequential HTTPS requests (HTML, CSS, JS chunks, API calls). Without a CDN, every request pays the full RTT plus TCP + TLS handshake.",
            "options": [
                {
                    "id": "a",
                    "text": "Add more servers in Virginia behind a bigger load balancer.",
                    "outcome": "Doesn't help. The bottleneck is the speed of light between Mumbai and Virginia, not Virginia's capacity.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Put static assets behind a CDN with an edge PoP in Mumbai, and use HTTP/2 multiplexing for API calls.",
                    "outcome": "Correct — static assets served from a Mumbai edge in ~10ms instead of 280ms+. HTTP/2 collapses 15 sequential HTTPS handshakes into one TCP+TLS setup, paying the RTT tax once.",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "Increase the TCP window size on the Virginia servers.",
                    "outcome": "Marginal effect on throughput, no effect on the 280ms RTT that dominates page-load time.",
                    "correct": False
                },
                {
                    "id": "d",
                    "text": "Switch from HTTP/2 to HTTP/1.1 with more parallel connections.",
                    "outcome": "Makes it worse — more TCP+TLS handshakes, more slow start, more TIME_WAIT state on the server.",
                    "correct": False
                }
            ],
            "rationale": "Latency is dominated by the speed of light between Mumbai and Virginia (~280ms RTT) times the number of round trips. Two interventions crush that number: (1) a CDN edge PoP in Mumbai moves static assets within ~10ms of the user, eliminating the transcontinental RTT for the bulk of bytes; (2) HTTP/2 multiplexing replaces 15 sequential HTTPS handshakes (15 × ~840ms = ~12 seconds!) with a single TCP+TLS setup plus 15 multiplexed streams (~3 × 280ms = ~840ms). Together they cut page load from ~4 seconds to under 500ms. Adding servers in Virginia solves a capacity problem you don't have. Tuning TCP windows solves a throughput problem you don't have. The lesson: always diagnose whether the bottleneck is latency, throughput, or capacity before choosing a fix.",
            "difficulty": "interview"
        }
    }
]

HOW_INTERNET_SOURCES = [
    {"title": "RFC 791 — Internet Protocol", "url": "https://datatracker.ietf.org/doc/html/rfc791", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 793 — Transmission Control Protocol", "url": "https://datatracker.ietf.org/doc/html/rfc793", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 4271 — Border Gateway Protocol 4 (BGP-4)", "url": "https://datatracker.ietf.org/doc/html/rfc4271", "publisher": "IETF", "type": "official-doc"},
    {"title": "Understanding the Facebook Outage — Cloudflare Analysis", "url": "https://blog.cloudflare.com/october-2021-facebook-outage/", "publisher": "Cloudflare", "type": "blog"}
]


# ──────────────────────────────────────────────────────────────────────
# 2. dns
# ──────────────────────────────────────────────────────────────────────

DNS_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "recursive-resolution-deep",
        "payload": {
            "text": "**The full recursive walk, annotated.** When your browser asks for `www.example.com`, the actual sequence is richer than 'ask root, ask TLD, ask authoritative.' A real lookup typically takes only one network round trip thanks to aggressive caching at every layer — but on a cold cache it walks the entire hierarchy.\n\nThe first query goes to the configured recursive resolver (e.g., 1.1.1.1 or 8.8.8.8). The resolver is a server run by your ISP, Cloudflare, Google, or your enterprise. It then walks: root nameservers (13 logical names, hundreds of anycast instances globally) → TLD nameserver for `.com` (operated by Verisign) → authoritative nameserver for `example.com` (operated by whoever you delegated to — Cloudflare, Route 53, etc.). The authoritative server returns the A record, and the resolver caches it for the duration of the TTL.\n\nThe recursive resolver does the entire walk so your laptop doesn't have to. This is a key scaling decision: caching is pushed as close to the user as possible (browser cache, OS stub resolver cache, recursive resolver cache, authoritative nameserver cache), with each layer serving cached answers until TTL expires."
        }
    },
    {
        "type": "mermaid",
        "id": "recursive-resolution-seq",
        "payload": {
            "code": "sequenceDiagram\n    participant B as Browser\n    participant OS as OS Stub\n    participant R as Recursive Resolver\n    participant Root as Root NS\n    participant TLD as .com TLD NS\n    participant Auth as example.com Auth NS\n    B->>OS: getaddrinfo('www.example.com')\n    OS->>R: A? www.example.com (cached here?)\n    alt cache hit at R\n        R-->>OS: 93.184.216.34 (from cache)\n    else cache miss - cold walk\n        R->>Root: ? www.example.com\n        Root-->>R: refer to .com TLD\n        R->>TLD: ? www.example.com\n        TLD-->>R: refer to example.com auth\n        R->>Auth: ? www.example.com\n        Auth-->>R: A 93.184.216.34 (TTL=3600s)\n        R-->>OS: 93.184.216.34 (cached for TTL)\n    end\n    OS-->>B: 93.184.216.34",
            "caption": "Recursive DNS resolution with cache. On a cold cache the resolver walks root → TLD → authoritative. On a warm cache, every layer serves cached answers without network I/O.",
            "alt_text": "A sequence diagram of DNS resolution. The browser asks the OS stub resolver, which asks the recursive resolver. If the resolver has a cached answer, it returns immediately. Otherwise it walks: root nameserver (refer to .com TLD), TLD nameserver (refer to example.com authoritative), authoritative nameserver (returns A record with TTL). Each layer caches the answer for the TTL duration."
        }
    },
    {
        "type": "prose",
        "id": "ttl-tradeoff-comparison",
        "payload": {
            "text": "**TTL is a two-sided knob.** The TTL you set on a record is a contract with every recursive resolver on the planet: 'you may cache this answer for N seconds.' Lower is not always better, and higher is not always better — the right value depends on what you're optimizing for.\n\n| TTL | Failover speed | Query load on auth NS | Use case |\n|-----|----------------|------------------------|----------|\n| 60s | sub-minute | very high (millions/sec globally) | active failover, blue-green deploys |\n| 300s (5m) | 5 minutes | moderate | typical web app default |\n| 3600s (1h) | 1 hour | low | stable records (MX, TXT for SPF) |\n| 86400s (1d) | 1 day | minimal | apex A records that never change |\n\nA common production pattern: keep your default TTL at 300s, then proactively lower it to 60s **3× your current TTL before** any planned IP change. So if you're at 3600s today, drop to 600s a day before, then to 60s an hour before, then flip the record. This guarantees every resolver on the planet has the short TTL cached when you cut over."
        }
    },
    {
        "type": "callout",
        "id": "dyn-ddos-2016",
        "payload": {
            "title": "Real failure: Dyn DDoS, October 21 2016",
            "body": "A massive Mirai-botnet DDoS attack hit Dyn (a major DNS-as-a-service provider used by Twitter, Reddit, GitHub, Spotify, Netflix, and others). The attack flooded Dyn's authoritative nameservers with tens of millions of DNS queries per second from compromised IoT devices. Recursive resolvers couldn't reach Dyn, so they couldn't resolve domains like twitter.com — and the entire East Coast of the US effectively lost access to those services for several hours. The origin servers were healthy. The application servers were healthy. The CDN was healthy. Only DNS was down — and that was enough to take half the internet offline for users in the affected region. Lesson: DNS is a single point of failure for your domain. Use two DNS providers (e.g., Route 53 + Cloudflare) so an outage at one doesn't take you down.",
            "kind": "warning"
        }
    },
    {
        "type": "mermaid",
        "id": "dns-capacity-estimation",
        "payload": {
            "code": "flowchart TD\n    Q[Assume 1B users<br/>10 lookups/user/day] --> T[10B queries/day<br/>~115K QPS average]\n    T --> P[5x peak: ~580K QPS]\n    P --> A[Anycast spreads across<br/>~50 PoPs globally]\n    A --> PP[~12K QPS per PoP<br/>per nameserver]\n    PP --> S[A single modern NS<br/>handles ~100K+ QPS]\n    S --> R[Headroom: ~8x over peak<br/>per node]\n    R --> F[Failure tolerance:<br/>lose 1 of 4 nodes - still OK]\n    classDef calc fill:#e8f0fe,stroke:#1967d2,color:#174ea6\n    classDef result fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class Q,T,P,A,PP,S,calc\n    class R,F,result",
            "caption": "Back-of-envelope capacity estimation for a global authoritative DNS service at 1B-user scale. A single modern nameserver handles ~100K QPS; anycast + horizontal scaling gives enormous headroom.",
            "alt_text": "A flowchart showing capacity estimation. 1 billion users times 10 lookups per user per day equals 10 billion queries per day, about 115K QPS average. Peak is 5x, around 580K QPS. Anycast spreads this across 50 PoPs, so each PoP sees about 12K QPS per nameserver. A single modern nameserver handles 100K+ QPS. Headroom: 8x over peak per node. Failure tolerance: lose one of four nodes and still be OK."
        }
    },
    {
        "type": "quiz",
        "id": "q-dyn-failure",
        "payload": {
            "question": "On October 21, 2016, Twitter, Spotify, and GitHub were unreachable for several hours for many US users, even though their origin servers and CDNs were healthy. What was the failure mode?",
            "shape": "mcq",
            "options": [
                "A BGP route leak black-holed traffic to their origin IPs.",
                "Their shared DNS provider (Dyn) was hit by a Mirai-botnet DDoS, so recursive resolvers couldn't resolve twitter.com to an IP — the origin was fine, but users couldn't find it.",
                "TLS certificate misissuance caused browsers to refuse connections.",
                "Their load balancers ran out of ephemeral ports."
            ],
            "answer_index": 1,
            "rationale": "This was the Dyn DDoS. Dyn was the authoritative DNS provider for many major SaaS companies. When the Mirai botnet flooded Dyn's authoritative nameservers with tens of millions of queries per second, recursive resolvers couldn't reach Dyn to resolve twitter.com (and others). Without a resolved IP, browsers couldn't even open a connection — the failure happened before TCP/TLS/HTTP entered the picture. The origins were fine, the CDNs were fine, but DNS being down meant the domain didn't resolve to an IP. The mitigation pattern: use two DNS providers in an active-active or primary-secondary setup, so a DDoS against one doesn't take your domain offline. BGP route leaks (option A) are a routing-layer problem; certificate misissuance (option C) would cause TLS errors, not resolution failures; port exhaustion (option D) is a server-side issue and would not affect DNS resolution.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-dns-failover",
        "payload": {
            "prompt": "Your primary data center in us-east-1 goes down hard. You have a warm standby in eu-west-1. Your DNS A record points to 203.0.113.10 (us-east-1) with a 1-hour TTL. How do you fail over with minimal user-visible downtime?",
            "context": "You cannot change physics: recursive resolvers that have already cached 203.0.113.10 will keep serving it for up to TTL. The question is how to minimize the window.",
            "options": [
                {
                    "id": "a",
                    "text": "Immediately update the A record to the eu-west-1 IP. Users will switch within seconds.",
                    "outcome": "Wrong — the 1-hour TTL means resolvers that already cached the old IP will keep serving it for up to 60 minutes.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Use DNS health checks with a low TTL (60s) from day one, plus a weighted/failover routing policy. On failure, the auth NS automatically stops serving the us-east-1 IP.",
                    "outcome": "Correct — with 60s TTL, stale IPs are gone within ~60s of the failure being detected. The weighted routing policy makes the cutover automatic.",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "Send a push notification to all users' browsers to flush their DNS cache.",
                    "outcome": "Not possible — browsers and OS DNS caches are not remotely flushable. Also ignores the recursive resolver cache.",
                    "correct": False
                },
                {
                    "id": "d",
                    "text": "Keep serving the old IP and let the load balancer in us-east-1 proxy to eu-west-1.",
                    "outcome": "The entire us-east-1 data center is down — there's no load balancer to proxy through.",
                    "correct": False
                }
            ],
            "rationale": "DNS TTL is a contract, not a suggestion: every recursive resolver on the planet will serve the cached answer for up to TTL seconds, regardless of what you change at the authoritative NS. To fail over quickly, you must (1) keep the TTL low (60s) from the start so the maximum staleness window is bounded, (2) use a DNS provider that supports health-checked failover routing (Route 53, Cloudflare, NS1), so the auth NS automatically stops advertising the dead IP, and (3) optionally use a TTL of 60s on the apex but a longer TTL on stable subdomains. The 'just update the A record' approach (option A) only works if your TTL was already short — and even then, ~60s of degraded experience is the floor. The broader lesson: design for failover before you need it. By the time you're down, it's too late to lower the TTL.",
            "difficulty": "interview"
        }
    }
]

DNS_SOURCES = [
    {"title": "RFC 1034 — Domain Names: Concepts and Facilities", "url": "https://datatracker.ietf.org/doc/html/rfc1034", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 1035 — Domain Names: Implementation and Specification", "url": "https://datatracker.ietf.org/doc/html/rfc1035", "publisher": "IETF", "type": "official-doc"},
    {"title": "Dyn DDoS Attack Post-Mortem (October 21, 2016)", "url": "https://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/", "publisher": "Dyn (Oracle)", "type": "blog"},
    {"title": "AWS Route 53 Developer Guide — Routing Policies", "url": "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html", "publisher": "Amazon Web Services", "type": "official-doc"}
]


# ──────────────────────────────────────────────────────────────────────
# 3. http
# ──────────────────────────────────────────────────────────────────────

HTTP_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "versions-comparison-table",
        "payload": {
            "text": "**HTTP/1.1 vs HTTP/2 vs HTTP/3 — side by side.**\n\n| Property | HTTP/1.1 (1997) | HTTP/2 (2015) | HTTP/3 (2022) |\n|----------|------------------|---------------|---------------|\n| Transport | TCP | TCP | QUIC (UDP) |\n| Multiplexing | none (1 req per conn, or pipelining with HOL blocking) | yes — parallel streams over 1 TCP conn | yes — independent streams over QUIC |\n| Head-of-line blocking | HTTP-level (pipelining) + TCP-level | TCP-level only (one lost packet stalls all streams) | none — streams are independent |\n| Connection setup | TCP handshake (1 RTT) + TLS (1-2 RTT) = 2-3 RTT | same: TCP + TLS = 2-3 RTT | 1 RTT (or 0-RTT with resumed session) |\n| Header encoding | plain text, sent every request | HPACK compression | QPACK compression (HPACK-like, stream-aware) |\n| Server push | no | yes (deprecated in practice) | no |\n| Connection migration | no — new IP breaks the connection | no — same as HTTP/1.1 | yes — QUIC connection ID survives IP changes |\n| Deployment ubiquity | universal | ~98% of websites | ~30% and growing (Chrome, Cloudflare, Facebook) |\n\nThe semantics (methods, status codes, headers) are unchanged across all three versions — only the transport and framing change. This is by design: HTTP/3 is fully backward-compatible with HTTP/2 at the application layer."
        }
    },
    {
        "type": "mermaid",
        "id": "tls-handshake-seq",
        "payload": {
            "code": "sequenceDiagram\n    participant C as Client\n    participant S as Server\n    Note over C,S: TLS 1.3 (1-RTT handshake, used by HTTPS, HTTP/2, HTTP/3)\n    C->>S: ClientHello\n    Note right of C: + supported cipher list\n    Note right of C: + key_share (X25519 public key)\n    Note right of C: + supported signature algs\n    S->>C: ServerHello\n    Note left of S: + chosen cipher\n    Note left of S: + key_share (server X25519)\n    S->>C: EncryptedExtensions\n    S->>C: Certificate\n    S->>C: CertificateVerify (signs handshake)\n    S->>C: Finished (HMAC over transcript)\n    C->>S: Finished (HMAC over transcript)\n    Note over C,S: Both sides now share the same symmetric key\n    C->>S: Application data (encrypted with derived keys)\n    Note over C,S: 0-RTT mode: client includes app data with ClientHello using a saved session ticket from a prior connection.",
            "caption": "TLS 1.3 handshake — one round trip before the client can send encrypted application data. TLS 1.2 needs two round trips; TLS 1.3 with 0-RTT sends data on the first packet (using a resumed session).",
            "alt_text": "Sequence diagram of a TLS 1.3 handshake. The client sends ClientHello with key share, supported ciphers, and signature algorithms. The server responds with ServerHello containing the chosen cipher and server key share, then EncryptedExtensions, Certificate, CertificateVerify, and Finished. The client sends Finished. After this single round trip, both sides share a symmetric key and can exchange encrypted application data. In 0-RTT mode, the client can include application data with the ClientHello using a saved session ticket from a prior connection."
        }
    },
    {
        "type": "prose",
        "id": "idempotency-key-flow",
        "payload": {
            "text": "**Idempotency keys in practice.** Stripe popularized the pattern: every POST request includes an `Idempotency-Key` header (a client-generated UUID). The server treats any two requests with the same key as the same logical operation — the second one returns the cached result of the first instead of re-processing.\n\nThe flow is:\n1. Client generates a UUID for this logical operation (e.g., 'charge this user $50 for order 1234').\n2. Client sends `POST /v1/charges` with `Idempotency-Key: <uuid>`.\n3. Server checks the idempotency store (Redis, DynamoDB, or a DB table): is this key present?\n   - If yes → return the stored response.\n   - If no → process the request, store the response keyed by the UUID with a TTL (e.g., 24h), return the response.\n4. If the network fails before the client receives the response, the client retries with the **same** UUID. The server returns the stored response (or returns 'still processing' if the original is in flight).\n\nThis converts a non-idempotent POST into a safely-retryable operation. Without it, a network blip during a payment could double-charge the user, or worse, partially charge and partially refund — leaving the system in an ambiguous state that requires manual reconciliation.\n\nThe same pattern applies to webhook delivery, background job processing, and any 'do this exactly once' API. The catch: 'exactly once' is impossible in distributed systems; what you really get is 'at-least-once delivery with at-most-once side effect via deduplication.'"
        }
    },
    {
        "type": "mermaid",
        "id": "idempotency-flow",
        "payload": {
            "code": "flowchart TD\n    Start[Client: charge $50 for order #1234] --> GenKey[Generate UUID<br/>idempotency-key=abc-123]\n    GenKey --> Send[POST /v1/charges<br/>Idempotency-Key: abc-123<br/>amount=5000]\n    Send --> Check{Server:<br/>key abc-123<br/>in store?}\n    Check -->|No - first time| Process[Process charge<br/>store result under abc-123<br/>with 24h TTL]\n    Check -->|Yes - retry| Fetch[Fetch stored response<br/>for abc-123]\n    Process --> Return1[Return 200 + charge object]\n    Fetch --> Return2[Return same 200 + charge object]\n    Return1 --> Net1{Network OK?}\n    Return2 --> Done[Client sees same response as first time]\n    Net1 -->|Timeout - client retries| Send\n    Net1 -->|Success| Done[Success]\n    classDef retry fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef success fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class GenKey,Fetch,Return2 retry\n    class Done success",
            "caption": "Idempotency key flow: client-generated UUID lets the server deduplicate retries. The same logical operation produces the same response — even across network failures and retries.",
            "alt_text": "A flowchart showing idempotency key flow. The client generates a UUID for the logical operation, sends a POST with the Idempotency-Key header. The server checks if the key is in its store. If no (first time), it processes the request and stores the result. If yes (retry), it fetches the stored response. Either way, the client gets the same response. If the network times out, the client retries with the same UUID, and the server returns the stored result."
        }
    },
    {
        "type": "callout",
        "id": "stripe-real-example",
        "payload": {
            "title": "Real system: Stripe's idempotency keys",
            "body": "Stripe's API requires (and the SDK auto-generates) an Idempotency-Key header for every POST that has side effects (charges, refunds, transfers). The Stripe SDK stores the key locally and reuses it across retries with exponential backoff. This is what lets Stripe tell its customers 'retry safely on any network error' — they could not say that without server-side deduplication. The keys live in Stripe's idempotency store for 24 hours; longer-lived deduplication requires a customer-supplied key (e.g., order ID) instead. This is the gold standard for any payment, billing, or order API. If you build such an API without idempotency keys, your support team will eventually reconcile double-charges by hand.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-http3-quic",
        "payload": {
            "question": "You're loading a page with 20 sub-resources over HTTP/2. The connection is on a flaky mobile network with 2% packet loss. Why will switching to HTTP/3 (QUIC over UDP) meaningfully improve page load time, when HTTP/2 already multiplexes?",
            "shape": "mcq",
            "options": [
                "HTTP/3 has smaller headers than HTTP/2.",
                "HTTP/3 uses UDP, which is inherently faster than TCP.",
                "With HTTP/2, a single lost TCP packet stalls ALL 20 multiplexed streams until it's retransmitted (TCP head-of-line blocking). HTTP/3 runs each stream independently over QUIC, so a loss on stream 3 doesn't stall streams 1, 2, 4-20.",
                "HTTP/3 doesn't require TLS, so the handshake is faster."
            ],
            "answer_index": 2,
            "rationale": "HTTP/2 solved application-layer head-of-line blocking (HTTP/1.1 pipelining) but inherited transport-layer head-of-line blocking from TCP: TCP guarantees in-order byte delivery, so if segment N is lost, segments N+1, N+2, etc. sit in the kernel buffer until N is retransmitted — even if those bytes belong to different HTTP/2 streams that don't care about N. On a 2%-loss mobile link with 20 multiplexed streams, every loss stalls all 20 streams for one retransmission RTT (typically 100-300ms each). HTTP/3 fixes this by running each stream as an independent flow within QUIC, which is itself over UDP. A lost packet on stream 3 only delays stream 3 — streams 1, 2, 4-20 keep flowing. HTTP/3 does require TLS (built into QUIC by design), so option D is wrong. UDP is not 'inherently faster' — option B confuses the transport choice with performance. And while HTTP/3 does have slightly better header compression (QPACK), that's a minor factor compared to fixing TCP head-of-line blocking.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-retry-payment",
        "payload": {
            "prompt": "Your mobile app calls POST /v1/charges to charge a user $50. The network returns a 504 Gateway Timeout. The user has spotty reception and taps 'Retry' twice. Without idempotency keys, what happens, and how do you fix it?",
            "context": "The original request might have reached the server (and charged the user) just before the 504 — or it might never have reached the server. The client cannot tell. POST is not idempotent, so naive retries can multiply side effects.",
            "options": [
                {
                    "id": "a",
                    "text": "Nothing wrong — POST retries are always safe because the server deduplicates.",
                    "outcome": "Wrong. POST is not idempotent. Three retries could produce three $50 charges.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Convert POST to PUT with the charge ID in the URL. PUT is idempotent, so retries are safe.",
                    "outcome": "Partially right but impractical — you usually don't have a charge ID until after the charge is created.",
                    "correct": False
                },
                {
                    "id": "c",
                    "text": "Generate a client-side UUID, send it as Idempotency-Key header. Server stores the result keyed by UUID with a 24h TTL; retries with the same UUID return the stored response.",
                    "outcome": "Correct — exactly-once side effects via at-least-once delivery plus server-side deduplication.",
                    "correct": True
                },
                {
                    "id": "d",
                    "text": "Disable retries entirely on POST — make the user re-submit manually if they want to retry.",
                    "outcome": "Safe but terrible UX. Users will re-submit manually anyway, and you'll get the same double-charge problem.",
                    "correct": False
                }
            ],
            "rationale": "The fundamental issue: the client cannot distinguish 'request never reached the server' from 'request reached the server, processed, response was lost.' Retrying POST blindly produces N side effects for N retries. The Stripe-style fix: client generates a UUID per logical operation and sends it as Idempotency-Key. Server checks an idempotency store (Redis, DynamoDB) — if the key is there, return the cached response; if not, process and store. Now retries with the same UUID return the same response — exactly-once side effect from the user's perspective, even though the network delivers at-least-once. Converting to PUT (option B) only works when you have a stable client-known ID before the call, which is rare for 'create' operations. Disabling retries (option D) is 'safe' in the narrow sense but bad UX — users will hit refresh anyway, and you'll have the same problem.",
            "difficulty": "interview"
        }
    }
]

HTTP_SOURCES = [
    {"title": "RFC 9110 — HTTP Semantics", "url": "https://datatracker.ietf.org/doc/html/rfc9110", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 9113 — HTTP/2", "url": "https://datatracker.ietf.org/doc/html/rfc9113", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 9114 — HTTP/3", "url": "https://datatracker.ietf.org/doc/html/rfc9114", "publisher": "IETF", "type": "official-doc"},
    {"title": "Stripe API — Idempotent Requests", "url": "https://stripe.com/docs/api/idempotent_requests", "publisher": "Stripe", "type": "official-doc"}
]


# ──────────────────────────────────────────────────────────────────────
# 4. tcp
# ──────────────────────────────────────────────────────────────────────

TCP_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "handshake-deep",
        "payload": {
            "text": "**The three-way handshake, annotated.** Why does TCP need three packets, not two? The goal is for both sides to agree on initial sequence numbers (ISNs). Sequence numbers are not '1, 2, 3...' — they start at a random 32-bit value to prevent packet injection attacks (an attacker who can predict the ISN can forge packets that look like they belong to an existing connection).\n\nThe flow:\n1. **SYN** — Client picks a random ISN `x` and sends `SYN, seq=x`. This says 'I want to talk; my stream will start at byte x.'\n2. **SYN+ACK** — Server picks its own random ISN `y` and sends `SYN, seq=y, ack=x+1`. This says 'I want to talk too; my stream starts at byte y; I acknowledge your SYN by sending ack=x+1 (meaning I expect byte x+1 next, which proves I got your x).'\n3. **ACK** — Client sends `ACK, ack=y+1`, proving it received the server's SYN.\n\nAfter step 3, both sides know each other's ISNs and can begin exchanging data. The first byte of application data can be piggybacked on this ACK (TCP Fast Open), but most clients don't use it.\n\nThis is **1 RTT** — one round trip from SYN to data-flow. For HTTPS, add 1 RTT for TLS 1.3 (or 2 RTT for TLS 1.2). So a fresh HTTPS connection to a server 100ms away costs 200-300ms before the first byte of HTTP response. This is why connection reuse is so valuable: amortize the handshake across many requests."
        }
    },
    {
        "type": "mermaid",
        "id": "handshake-sequence",
        "payload": {
            "code": "sequenceDiagram\n    participant C as Client\n    participant S as Server\n    Note over C: pick ISN x (random)\n    C->>S: SYN, seq=x\n    Note right of S: pick ISN y (random)\n    S->>C: SYN+ACK, seq=y, ack=x+1\n    Note left of C: server's SYN seen\n    C->>S: ACK, ack=y+1\n    Note over C,S: 1 RTT elapsed - data can now flow\n    C->>S: GET /api/users (seq=x+1)\n    S->>C: 200 OK + body (seq=y+1)\n    Note over C,S: Teardown: 4-way FIN exchange\n    C->>S: FIN, seq=m\n    S->>C: ACK, ack=m+1\n    Note right of S: half-closed: server can still send\n    S->>C: FIN, seq=n\n    C->>S: ACK, ack=n+1\n    Note left of C: TIME_WAIT 2*MSL (~60-120s)\n    Note over C,S: TIME_WAIT catches stray FIN retransmissions<br/>so a delayed packet can't corrupt a future conn<br/>with the same 4-tuple",
            "caption": "TCP three-way handshake and four-way teardown. The handshake costs one RTT before data flows. TIME_WAIT on the closer side lasts 2×MSL (typically 60-120s) to absorb stray retransmissions.",
            "alt_text": "Sequence diagram of TCP handshake and teardown. The client picks a random ISN x and sends SYN. The server picks random ISN y and sends SYN+ACK with ack=x+1. The client sends ACK with ack=y+1. One RTT has elapsed and data can flow. After data exchange, teardown is a four-way FIN exchange: client sends FIN, server ACKs (now half-closed), server sends FIN, client ACKs. The client enters TIME_WAIT for 2xMSL (~60-120 seconds) to catch stray retransmissions so they can't corrupt a future connection with the same 4-tuple."
        }
    },
    {
        "type": "prose",
        "id": "flow-vs-congestion-comparison",
        "payload": {
            "text": "**Flow control vs congestion control — same shape, different problems.** Both use a 'window' (a cap on in-flight bytes), but they protect different things and respond to different signals.\n\n| Aspect | Flow control | Congestion control |\n|--------|--------------|--------------------|\n| Protects | The receiver (don't overflow its buffer) | The network (don't collapse it) |\n| Signal | Receiver advertises `rwnd` in every ACK | Inferred from loss (3 dup-ACKs or RTO timeout) |\n| Window name | Receive window (rwnd) | Congestion window (cwnd) |\n| Effective window | `min(rwnd, cwnd)` | `min(rwnd, cwnd)` |\n| Algorithm | Sliding window, fixed cap per ACK | Slow start → congestion avoidance → fast retransmit → multiplicative decrease |\n| Tunable by app? | No — kernel-managed | No — kernel-managed (BBR/CUBIC selectable) |\n\nThe sender's actual send window is `min(rwnd, cwnd)` — the lesser of what the receiver can absorb and what the network can carry. If the receiver is slow (small rwnd), flow control binds. If the network is lossy (small cwnd), congestion control binds. They're independent mechanisms that compose.\n\nThe practical implication for system design: if a TCP connection feels slow to ramp up, it's almost always congestion control (slow start). If it stalls mid-stream, it's almost always flow control (the receiver app isn't reading fast enough). Diagnose accordingly."
        }
    },
    {
        "type": "mermaid",
        "id": "head-of-line-blocking",
        "payload": {
            "code": "flowchart TD\n    subgraph HTTP2[TCP connection carrying HTTP/2 streams]\n        direction LR\n        S1[Stream 1: GET /api/users]\n        S2[Stream 2: GET /api/orders]\n        S3[Stream 3: GET /api/products]\n        S4[Stream 4: GET /api/reviews]\n        S5[Stream 5: GET /api/cart]\n    end\n    Loss[TCP segment for<br/>stream 3 lost in network]\n    Loss --> S3\n    Buf1[Streams 4,5 data<br/>arrived at receiver<br/>BUT blocked in kernel buffer]\n    Buf2[Stream 1,2 data<br/>also blocked if they<br/>arrive after the loss]\n    S3 --> Buf1\n    S4 -.->|data arrived but stuck| Buf1\n    S5 -.->|data arrived but stuck| Buf1\n    S3 -.->|waiting for retransmit| Buf2\n    Retx[Retransmission<br/>1 RTT later]\n    Retx --> Drain[All streams unblock at once]\n    Buf1 --> Drain\n    Buf2 --> Drain\n    classDef lost fill:#fee,stroke:#c33,color:#900\n    classDef stuck fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef ok fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class Loss lost\n    class Buf1,Buf2 stuck\n    class Drain ok",
            "caption": "TCP head-of-line blocking on an HTTP/2 connection. A single lost segment for stream 3 stalls all multiplexed streams — even streams whose data already arrived — until stream 3's segment is retransmitted.",
            "alt_text": "A flowchart showing TCP head-of-line blocking on an HTTP/2 connection. Five streams are multiplexed over one TCP connection. A segment belonging to stream 3 is lost in the network. Data from streams 4 and 5 arrives at the receiver but is stuck in the kernel buffer waiting for stream 3's retransmission. After one retransmission RTT, all streams unblock at once. This is the failure mode that motivated HTTP/3's move to QUIC over UDP, where streams are independent."
        }
    },
    {
        "type": "callout",
        "id": "http3-quic-real-example",
        "payload": {
            "title": "Real system: how HTTP/3 solves TCP's limitations",
            "body": "HTTP/3 runs over QUIC, which is itself over UDP. QUIC reimplements TCP's reliability (sequence numbers, ACKs, retransmission, congestion control) in user-space — but with three key differences TCP cannot match: (1) **Independent streams** — a loss on stream 3 doesn't block streams 1, 2, 4-20. (2) **0-RTT connection setup** — resumed connections send HTTP data in the very first packet by combining the TLS handshake with the QUIC handshake. (3) **Connection migration** — a QUIC connection is identified by a connection ID, not a 4-tuple, so when your phone switches from Wi-Fi to cellular (IP changes), the connection survives — no re-handshake. Google measured a 3% improvement in YouTube watch time after deploying QUIC. Cloudflare serves ~50% of its traffic over HTTP/3 today. The cost: QUIC is implemented in user-space, so it consumes more CPU than kernel TCP — but the latency wins are worth it for most workloads.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-tcp-vs-quic",
        "payload": {
            "question": "Your mobile app keeps a long-lived HTTPS connection to your backend. Users complain that when they switch from Wi-Fi to cellular mid-session, the app freezes for 5+ seconds before recovering. What's happening, and what fixes it?",
            "shape": "mcq",
            "options": [
                "TCP slow start restarts because the connection's RTT estimate is stale.",
                "TCP connections are identified by the 4-tuple (src IP, src port, dst IP, dst port). When Wi-Fi → cellular changes the source IP, the kernel sees a 'different' connection and tears down the old one — the app must reconnect and pay the TCP+TLS handshake again. QUIC's connection ID survives IP changes.",
                "TLS certificate pinning rejects the new IP.",
                "The cellular carrier rate-limits new connections."
            ],
            "answer_index": 1,
            "rationale": "TCP identifies a connection by its 4-tuple (source IP, source port, destination IP, destination port). When your phone switches from Wi-Fi to cellular, the source IP changes — so the existing TCP connection is now invalid from the kernel's perspective. The app's socket either times out or gets a RST, and the app must establish a new TCP connection (1 RTT) + new TLS handshake (1 RTT for TLS 1.3) before it can send another request. On a 100ms cellular RTT, that's ~200-300ms minimum — but the app often doesn't detect the failure for several seconds (waiting for TCP retransmission timeouts), which is where the 5-second freeze comes from. QUIC fixes this by identifying connections with a random connection ID instead of the 4-tuple. When the phone switches networks, QUIC packets with the same connection ID are recognized as belonging to the same logical connection — no re-handshake, no app freeze. This is one of the three big wins QUIC has over TCP (along with no head-of-line blocking and 0-RTT setup).",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-connection-pool",
        "payload": {
            "prompt": "Your Postgres-backed API opens a new database connection per request to keep the code simple. At 100 RPS this works fine. At 1,000 RPS, latency jumps from 20ms to 400ms and Postgres starts refusing connections. Diagnose the root cause and pick the fix.",
            "context": "Each new TCP connection to Postgres pays: TCP handshake (1 RTT), TLS handshake if used (1-2 RTT), Postgres startup message + auth (1 RTT), and TCP slow start on the first query (several RTTs to ramp up cwnd). On a 1ms-RTT LAN this is invisible. On a 5ms-RTT link, each new connection is ~30ms of setup before any data flows.",
            "options": [
                {
                    "id": "a",
                    "text": "Add more Postgres instances behind PgBouncer.",
                    "outcome": "Helps with throughput but doesn't fix the per-connection handshake tax. You're paying 30ms setup on every request, regardless of how many Postgres backends you have.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Use a connection pool (PgBouncer in transaction-pooling mode, or a client-side pool like HikariCP). Reuse connections across requests.",
                    "outcome": "Correct — pays the TCP + TLS + Postgres startup cost once per connection, not once per request. 100 connections handling 1,000 RPS = 10 req/s/conn, well within TCP's keep-alive envelope.",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "Switch from Postgres to a NoSQL database that doesn't have this problem.",
                    "outcome": "Wrong diagnosis — every database with a TCP connection has this problem. Connection setup cost is a transport-layer issue, not a database issue.",
                    "correct": False
                },
                {
                    "id": "d",
                    "text": "Increase Postgres's max_connections to 10,000.",
                    "outcome": "Postgres forks a process per connection — 10,000 processes will exhaust kernel memory and tank performance. You've masked the symptom and made the underlying problem worse.",
                    "correct": False
                }
            ],
            "rationale": "Every new TCP connection pays: 3-way handshake (1 RTT), optional TLS handshake (1-2 RTT), Postgres startup + auth (1 RTT), and slow start on the first query (multiple RTTs to ramp cwnd). At 100 RPS, you're opening ~100 connections/sec — your server can absorb that. At 1,000 RPS, you're opening ~1,000 connections/sec, each holding kernel state and Postgres process state for a fraction of a second. Postgres forks a backend process per connection, so 1,000 RPS × 30ms setup = ~30 active backends minimum, but with TIME_WAIT (60-120s after close) you're piling up tens of thousands of closing sockets. The fix is a connection pool: pay the setup cost once per connection, then reuse across requests. PgBouncer (server-side pool) multiplexes many app connections onto a few Postgres backends. Client-side pools (HikariCP, SQLAlchemy pool) keep connections warm in the app process. Either way, 100 long-lived connections can handle 1,000+ RPS at sub-10ms latency. The deeper lesson: TCP is not free. Connection setup is expensive enough that it dominates performance for short-lived connections — always pool.",
            "difficulty": "interview"
        }
    }
]

TCP_SOURCES = [
    {"title": "RFC 793 — Transmission Control Protocol", "url": "https://datatracker.ietf.org/doc/html/rfc793", "publisher": "IETF", "type": "official-doc"},
    {"title": "RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport", "url": "https://datatracker.ietf.org/doc/html/rfc9000", "publisher": "IETF", "type": "official-doc"},
    {"title": "Van Jacobson — Congestion Avoidance and Control (1988)", "url": "https://ee.lbl.gov/papers/congavoid.pdf", "publisher": "LBL", "type": "paper"},
    {"title": "Google BBR Congestion Control", "url": "https://research.google/pubs/pub45646/", "publisher": "Google Research", "type": "paper"}
]


# ──────────────────────────────────────────────────────────────────────
# 5. latency-vs-throughput
# ──────────────────────────────────────────────────────────────────────

LAT_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "littles-law-deep",
        "payload": {
            "text": "**Little's Law, derived.** In 1961, John Little proved (and later published in 1961, formally in 2011) that for any stable queueing system: `L = λ × W` — the average number of items in the system (L) equals the arrival rate (λ) times the average time an item spends in the system (W). Rearranged for our purposes: **`throughput = concurrency / latency`**.\n\nThis is profound because it holds for *any* stable system — no assumptions about distribution, queue discipline, or service time. It connects three observable quantities you can always measure.\n\nConcrete example: your API server handles 100 concurrent requests (concurrency=100), each taking 50ms (latency=0.05s). Throughput = 100 / 0.05 = **2,000 RPS**. If you want 10,000 RPS, you have three dials:\n- **Reduce latency** to 10ms → 100 / 0.01 = 10,000 RPS.\n- **Increase concurrency** to 500 → 500 / 0.05 = 10,000 RPS.\n- **Both** → 250 / 0.025 = 10,000 RPS.\n\nThe hard part: which dial is movable? Reducing latency often means finding the actual bottleneck (CPU? DB? lock contention?). Increasing concurrency often means adding servers (more $), increasing thread pool size (more memory), or going async (more code complexity). Little's Law tells you the equation; the system design tells you which variables you can actually move."
        }
    },
    {
        "type": "mermaid",
        "id": "littles-law-diagram",
        "payload": {
            "code": "flowchart LR\n    subgraph Inputs\n        L[Concurrency L<br/>in-flight requests]\n        W[Latency W<br/>seconds per request]\n    end\n    subgraph Output\n        T[Throughput<br/>L / W = req/s]\n    end\n    L --> T\n    W --> T\n    T --> Insight1[10 concurrent, 50ms = 200 RPS]\n    T --> Insight2[100 concurrent, 50ms = 2,000 RPS]\n    T --> Insight3[100 concurrent, 5ms = 20,000 RPS]\n    classDef input fill:#e8f0fe,stroke:#1967d2,color:#174ea6\n    classDef output fill:#fef7e0,stroke:#f9ab00,color:#b06000\n    classDef insight fill:#f3e8fd,stroke:#9334c6,color:#681da8\n    class L,W input\n    class T output\n    class Insight1,Insight2,Insight3 insight",
            "caption": "Little's Law: throughput = concurrency / latency. Three numerical examples show how each variable moves the result.",
            "alt_text": "A diagram of Little's Law. Two inputs (concurrency L and latency W) produce throughput (L / W). Three examples: 10 concurrent at 50ms gives 200 RPS; 100 concurrent at 50ms gives 2000 RPS; 100 concurrent at 5ms gives 20000 RPS."
        }
    },
    {
        "type": "prose",
        "id": "percentile-distribution-deep",
        "payload": {
            "text": "**Why p99 — not average — is the SLO.** Production latencies are never normally distributed. They have a long right tail: most requests finish fast (cache hits, simple queries), but a small fraction hit cold caches, GC pauses, lock contention, or disk seeks — and these outliers take 10x-100x the median.\n\nIf 99% of your requests take 10ms and 1% take 1000ms:\n- **Average**: ~20ms (looks great in dashboards).\n- **Median (p50)**: 10ms (also looks great).\n- **p95**: 10ms (still looks great).\n- **p99**: 1000ms — and this is what users complain about.\n\nThe average hides the tail because 1% of a billion requests is 10 million requests per billion — a *lot* of users. A user who hits your API 20 times in a session has a ~18% chance of seeing at least one p99 latency. So even if your p99 is rare, users experience it regularly.\n\nGood SLOs are written against multiple percentiles: 'p50 < 50ms, p95 < 100ms, p99 < 500ms.' This captures both the typical experience (p50) and the worst-case most users see (p99). p99.9 (one in a thousand) is useful for backend monitoring but rarely belongs in a user-facing SLO — only one in a thousand users sees it, and chasing p99.9 often means optimizing for noise.\n\nThe deeper insight: p99 is also a leading indicator. When p99 starts creeping up before p50 does, it usually means a bottleneck is forming (queue depth growing, cache hit rate dropping, GC pause increasing). Catching p99 drift early lets you act before users notice."
        }
    },
    {
        "type": "mermaid",
        "id": "percentile-distribution",
        "payload": {
            "code": "flowchart LR\n    subgraph Distribution[Latency distribution - long right tail]\n        direction TB\n        P50[p50 median: 10ms<br/>50% of requests]\n        P90[p90: 12ms<br/>40% of requests]\n        P95[p95: 15ms<br/>5% of requests]\n        P99[p99: 1000ms<br/>1% of requests - tail]\n        P999[p99.9: 5000ms<br/>0.1% - backend noise]\n    end\n    subgraph UserImpact[User impact per session - 20 requests]\n        U1[Sees p50: 100% of users]\n        U2[Sees p95: 64% of users]\n        U3[Sees p99: 18% of users]\n        U4[Sees p99.9: 2% of users]\n    end\n    P50 --> U1\n    P95 --> U2\n    P99 --> U3\n    P999 --> U4\n    classDef typical fill:#e6f4ea,stroke:#188038,color:#0d652d\n    classDef tail fill:#fee,stroke:#c33,color:#900\n    class P50,P90,P95 typical\n    class P99,P999 tail\n    class U3,U4 tail",
            "caption": "Latency distributions have a long right tail. Average (20ms) and p50 (10ms) hide it. A user making 20 requests/session has an 18% chance of seeing the p99 latency — so the tail matters even when it's rare.",
            "alt_text": "A diagram of a latency distribution with a long right tail. P50 is 10ms (50% of requests), p90 is 12ms (40%), p95 is 15ms (5%), p99 is 1000ms (1% — the tail), p99.9 is 5000ms (0.1% — backend noise). The user impact per 20-request session: 100% see p50, 64% see p95, 18% see p99, 2% see p99.9. The tail is rare per-request but experienced regularly per-session."
        }
    },
    {
        "type": "callout",
        "id": "batch-vs-realtime",
        "payload": {
            "title": "Batch vs real-time — opposite optimization targets",
            "body": "Batch processing optimizes for throughput at the cost of latency: collect 10,000 records, sort them, write to a columnar store, run analytics. Each record's 'latency' is hours, but throughput is enormous (Spark can process TB/hr). Real-time systems optimize for latency at the cost of throughput: each request is served from cache in <10ms, but the system can't match batch throughput because per-request overhead dominates. The architectural choice between batch and streaming is fundamentally a choice of which metric you're willing to sacrifice. Most mature systems do both: a real-time path for user-facing reads, a batch path for analytics. Lambda and Kappa architectures formalize this dual-path approach. Don't try to make one system do both — you'll get mediocre at each.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-cdn-edge-latency",
        "payload": {
            "question": "Why does serving an image from a CDN edge PoP typically give 5-10ms latency, while serving the same image from the origin gives 80-300ms latency — even when the origin has plenty of bandwidth and CPU?",
            "shape": "mcq",
            "options": [
                "The CDN compresses the image better than the origin can.",
                "Latency is dominated by the speed of light through fiber. The CDN edge is physically close to the user (5-50 miles), while the origin may be across a continent or ocean (thousands of miles). No amount of bandwidth or CPU fixes the speed of light.",
                "The origin server is slower because it has to fetch from a database.",
                "CDN edge servers use faster SSDs than origin servers."
            ],
            "answer_index": 1,
            "rationale": "Latency is bounded below by physics: light in fiber travels ~200km/ms (about 2/3 the speed of light in vacuum, due to fiber's refractive index). A user 5 miles from a CDN edge sees ~0.05ms one-way travel time — negligible. A user 2,500 miles from the origin sees ~25ms one-way, ~50ms round trip — and that's the absolute floor, before any router queueing, TCP handshake, TLS handshake, or server processing. Adding more bandwidth doesn't help (bandwidth is bytes/sec, not ms). Adding more CPU doesn't help (CPU is microseconds, not the milliseconds spent in transit). The only fix is moving the content closer to the user — which is exactly what a CDN does. This is why CDNs exist: they're not a bandwidth optimization, they're a speed-of-light optimization. Image compression (A), database fetches (C), and SSDs (D) are all microsecond-to-millisecond effects dwarfed by the speed of light over long distances.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-queue-buildup",
        "payload": {
            "prompt": "Your API has p50 latency of 20ms, p99 latency of 100ms, and handles 500 RPS. Traffic doubles to 1000 RPS. p50 stays at 20ms but p99 jumps to 2000ms. Users start timing out. Diagnose using Little's Law.",
            "context": "Your server has a fixed concurrency cap of 100 (thread pool). At 500 RPS × 0.02s avg latency, you have 10 in-flight requests — well under the cap. At 1000 RPS × 0.02s = 20 in-flight, still under the cap. But p99 of 2000ms means 1% of requests take 2s, holding a thread for that whole time.",
            "options": [
                {
                    "id": "a",
                    "text": "Latency isn't actually growing — the dashboard is wrong because averages are misleading.",
                    "outcome": "Wrong diagnosis. p99 jumping from 100ms to 2000ms is real, even if p50 stayed flat.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Throughput doubled, so per-Little's Law, concurrency doubled too. The 1% slow requests (now 10/s instead of 5/s) eat threads for 2s each, so 20 threads are stuck on slow requests. Fast requests queue behind them, raising p99 further.",
                    "outcome": "Correct — this is a queueing cascade. The slow tail dominates thread pool usage, even though most requests are still fast.",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "You need to add more CPU because the server is overloaded.",
                    "outcome": "Adding CPU doesn't help if the slowness is I/O or lock contention, not CPU. Diagnose first.",
                    "correct": False
                },
                {
                    "id": "d",
                    "text": "Increase the thread pool size — that will absorb the load.",
                    "outcome": "Might help marginally, but if the slow requests are I/O-bound (DB), more threads just means more concurrent DB load and likely DB saturation. Root cause is the slow tail, not thread count.",
                    "correct": False
                }
            ],
            "rationale": "Little's Law says concurrency = throughput × latency. At 500 RPS with avg latency 0.02s, concurrency = 10. At 1000 RPS, concurrency = 20. But the AVERAGE hides the tail: 1% of requests take 2s. At 1000 RPS, that's 10 slow requests per second, each holding a thread for 2s — so 20 threads are permanently stuck on slow requests. Your 100-thread pool now has 80 threads for fast requests and 20 stuck on slow ones. As load grows, eventually all 100 threads are stuck on slow requests, fast requests queue, p99 explodes, and you have a cascading failure. The fix is not more threads (option D) — it's to find and fix the slow tail. Common causes: a slow DB query without an index, a synchronous call to a slow downstream service, a lock with high contention, or GC pauses. Profile the p99 requests specifically — not the average. Once the tail is fixed, throughput usually scales automatically. The deeper lesson: Little's Law applies to the *average*, but production systems fail at the *tail*. Always design for the tail.",
            "difficulty": "interview"
        }
    }
]

LAT_SOURCES = [
    {"title": "Little, John D. C. — A Proof for the Queuing Formula L = λW (Operations Research, 1961)", "url": "https://pubsonline.informs.org/doi/10.1287/opre.9.3.383", "publisher": "INFORMS", "type": "paper"},
    {"title": "The Tail at Scale — Jeffrey Dean & Luiz Barroso (CACM 2013)", "url": "https://research.google/pubs/the-tail-at-scale/", "publisher": "Google Research / CACM", "type": "paper"},
    {"title": "SRE Book — Service Level Objectives", "url": "https://sre.google/sre-book/service-level-objectives/", "publisher": "Google SRE", "type": "book"},
    {"title": "Cloudflare — How Latency Works on the Internet", "url": "https://blog.cloudflare.com/how-latency-works-on-the-internet/", "publisher": "Cloudflare", "type": "blog"}
]


# ──────────────────────────────────────────────────────────────────────
# 6. performance-vs-scalability
# ──────────────────────────────────────────────────────────────────────

PVS_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "scaling-failure-mode-deep",
        "payload": {
            "text": "**How systems fail to scale.** A system that doesn't scale doesn't usually fail loudly — it degrades gracefully at first, then catastrophically. The classic progression:\n\n1. **Low load (10 RPS)**: everything is fast. CPU 5%, latency 20ms. Looks great.\n2. **Medium load (500 RPS)**: latency creeps to 50ms. CPU 40%. Database starts showing some lock contention. Cache hit rate still 95%.\n3. **High load (2000 RPS)**: latency jumps to 500ms. Why? Connection pool exhausted — requests queue waiting for a free DB connection. Cache hit rate drops to 85% because evictions are thrashing. CPU is now 80% but the bottleneck is I/O wait, not CPU.\n4. **Critical load (5000 RPS)**: latency hits 10s. The DB connection pool is fully exhausted, requests time out at the app layer, clients retry, retry traffic doubles the load, more requests queue, the system cascades to failure.\n\nThe diagnosis at each stage is different. Stage 2 needs optimization (indexes, query tuning). Stage 3 needs scaling (read replicas, bigger cache). Stage 4 needs circuit breaking and load shedding — you're already over capacity, and adding more load makes it worse, not better. The mistake teams make is jumping to 'scale out' at stage 4 when they should have been shedding load and diagnosing the real bottleneck at stage 2."
        }
    },
    {
        "type": "mermaid",
        "id": "single-vs-scaled-arch",
        "payload": {
            "code": "flowchart TB\n    subgraph Single[Single-server architecture - high perf, low scalability]\n        U1[Users] --> LB1[Load Balancer]\n        LB1 --> App1[App Server<br/>1 instance, 32 vCPU]\n        App1 --> DB1[(PostgreSQL<br/>single primary)]\n        App1 --> C1[(Redis<br/>single instance)]\n    end\n    subgraph Scaled[Scaled architecture - lower per-req perf, high scalability]\n        U2[Users] --> CDN[CDN edge<br/>~330 PoPs]\n        CDN --> LB2[Global LB<br/>+ anycast]\n        LB2 --> AS1[App Server 1]\n        LB2 --> AS2[App Server 2]\n        LB2 --> AS3[App Server N<br/>stateless, autoscaled]\n        AS1 --> RG[(Redis cluster<br/>sharded, replicated)]\n        AS2 --> RG\n        AS3 --> RG\n        AS1 --> DBS[(PG primary<br/>+ 3 read replicas)]\n        AS2 --> DBS\n        AS3 --> DBS\n    end\n    classDef fast fill:#e6f4ea,stroke:#188038,color:#0d652d\n    classDef bottleneck fill:#fee,stroke:#c33,color:#900\n    class DB1,C1 bottleneck\n    class AS1,AS2,AS3,RG,DBS,CDN fast",
            "caption": "Single-server architecture maximizes per-request performance but every component is a single point of failure and a scaling ceiling. The scaled architecture trades per-request latency (network hops) for horizontal scalability and fault tolerance.",
            "alt_text": "Two architectures side by side. Single-server: users hit a load balancer, then a single 32-vCPU app server, then a single PostgreSQL primary and a single Redis. Maximum performance per request, but the DB and Redis are bottlenecks and single points of failure. Scaled architecture: users hit a CDN edge, then a global anycast load balancer, then N stateless app servers behind autoscaling, then a sharded replicated Redis cluster and a Postgres primary with read replicas. Per-request latency is higher due to network hops, but the system scales horizontally and survives component failures."
        }
    },
    {
        "type": "callout",
        "id": "amdahl-law",
        "payload": {
            "title": "Amdahl's Law — the ceiling on parallel speedup",
            "body": "Gene Amdahl proved in 1967 that if a fraction P of a workload can be parallelized and (1-P) must run serially, the maximum speedup from N processors is `1 / ((1-P) + P/N)`. The implication is brutal: if 5% of your workload is serial (a single-threaded lock, a serial commit log, a synchronous cross-shard query), then even with infinite processors your speedup is capped at `1 / 0.05 = 20x`. Most real systems hit this wall: database transactions need a serial commit log, distributed coordination needs a leader, garbage collection has stop-the-world phases. This is why 'just add more servers' eventually stops working — you hit the serial fraction. The system design response: minimize the serial fraction. Use sharding to keep transactions single-shard. Use append-only logs (no locking for reads). Use eventual consistency where possible (no coordination needed). The goal is to drive P toward 1.0.",
            "kind": "warning"
        }
    },
    {
        "type": "mermaid",
        "id": "diagnose-flowchart",
        "payload": {
            "code": "flowchart TD\n    Start[Users complain app is slow] --> Q1{Latency high<br/>at low load?}\n    Q1 -->|Yes - always slow| Perf[PERFORMANCE problem<br/>single request is slow]\n    Q1 -->|No - fast at low load| Q2{Latency grows<br/>with load?}\n    Q2 -->|Yes - degrades under load| Scale[SCALABILITY problem<br/>system cant handle growth]\n    Q2 -->|No - sudden spikes| Q3{Spikes correlate<br/>with downstream events?}\n    Q3 -->|Yes| Downstream[DEPENDENCY problem<br/>downstream slow or failing]\n    Q3 -->|No - random spikes| Q4{Spikes correlate<br/>with GC, deployment, cron?}\n    Q4 -->|Yes| Ops[OPERATIONAL problem<br/>GC pause, deploy warmup, etc]\n    Q4 -->|No - truly random| Tail[Long-tail latency<br/>investigate p99 specifically]\n    Perf --> PerfFix[Profile single request<br/>find hot path, optimize code/index/cache]\n    Scale --> ScaleFix[Identify bottleneck component<br/>add capacity, shard, partition, cache]\n    Downstream --> DownFix[Add circuit breaker<br/>timeout, fallback, async retry]\n    Ops --> OpsFix[Tune GC, warm up after deploys<br/>spread load, use read replicas]\n    Tail --> TailFix[Profile p99 requests<br/>look for slow disk, lock contention]\n    classDef problem fill:#fee,stroke:#c33,color:#900\n    classDef fix fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class Perf,Scale,Downstream,Ops,Tail problem\n    class PerfFix,ScaleFix,DownFix,OpsFix,TailFix fix",
            "caption": "Diagnosing performance vs scalability vs dependency vs operational problems. The shape of the latency-vs-load curve tells you which fix to apply.",
            "alt_text": "A diagnostic flowchart for slow apps. Start: users complain app is slow. Is latency high at low load? Yes means performance problem - profile single request, optimize code/index/cache. No, fast at low load: does latency grow with load? Yes means scalability problem - identify bottleneck, add capacity, shard, cache. No, sudden spikes: do spikes correlate with downstream events? Yes means dependency problem - add circuit breaker, timeout, fallback. No: do spikes correlate with GC, deployment, or cron? Yes means operational problem - tune GC, warm up, spread load. No, truly random: long-tail latency - investigate p99 specifically."
        }
    },
    {
        "type": "prose",
        "id": "real-system-redis-cassandra",
        "payload": {
            "text": "**Real systems make the trade-off explicit.**\n\n**Redis** optimizes for performance first: single-threaded, in-memory, ~100K ops/sec on one instance, sub-millisecond latency. It scales horizontally through Redis Cluster (sharding across N nodes), but each shard is still single-threaded — so throughput scales linearly with shards, but per-key latency stays flat at ~1ms. The designers explicitly separated the two concerns: 'be the fastest possible single instance' was the goal; horizontal scaling was layered on later via sharding.\n\n**Cassandra** optimizes for scalability first: distributed, multi-primary, no single point of failure, linear horizontal scaling. But per-request latency is higher than Redis — typically 5-20ms due to network hops, quorum reads (reads from multiple replicas), and write-path coordination. Cassandra trades per-request performance for the ability to handle petabytes across hundreds of nodes with no leader.\n\nThe lesson: when you pick a database, you're picking which side of the performance/scalability trade-off to optimize for. There is no 'best' — there is only 'best for your workload.' A session cache wants Redis. A time-series log across 1000 nodes wants Cassandra. Most systems need both, layered: Redis in front of Postgres for hot reads, Cassandra for write-heavy event logs."
        }
    },
    {
        "type": "quiz",
        "id": "q-amdahl",
        "payload": {
            "question": "You profile your monolithic service and find 10% of the request time is spent in a single-threaded in-memory lock (a global registry that all requests touch). You scale from 1 to 10 app servers. What's the maximum speedup you can possibly achieve?",
            "shape": "mcq",
            "options": [
                "10x — you have 10 servers, so 10x the throughput.",
                "1x — the lock doesn't matter, it's in-memory.",
                "~5.3x — by Amdahl's Law, max speedup with 10% serial = 1 / (0.1 + 0.9/10) = 5.3x. The serial fraction caps the speedup well below 10x.",
                "Unlimited — adding more servers always scales."
            ],
            "answer_index": 2,
            "rationale": "Amdahl's Law: if fraction (1-P) of the workload is serial, max speedup with N processors is `1 / ((1-P) + P/N)`. Here P=0.9 (90% parallelizable), 1-P=0.1 (10% serial), N=10: speedup = 1 / (0.1 + 0.9/10) = 1 / 0.19 = ~5.26x. You spent 10x the hardware for ~5x the throughput. With N=100 servers: 1 / (0.1 + 0.009) = ~9.2x. With N=infinity: 1 / 0.1 = 10x — the absolute ceiling. The serial 10% caps your maximum speedup at 10x, no matter how many servers you add. The fix isn't more servers — it's removing the serial fraction. Replace the global lock with per-shard locks, partition the registry, or use lock-free data structures. Until you do, scaling past ~5x is wasting money. This is why Amdahl's Law is the foundational limit on scalability engineering.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-diagnose-slow",
        "payload": {
            "prompt": "Black Friday is approaching. Your e-commerce API normally runs at 200 RPS with p99 latency of 80ms. Last year on Black Friday you hit 2000 RPS and p99 spiked to 5s, losing sales. You have budget for either (a) a major code optimization project, or (b) doubling server capacity. Which do you choose?",
            "context": "Your monitoring shows: at 200 RPS, CPU is at 30%, DB connection pool is 20% utilized, cache hit rate is 92%. There's no obvious single slow query. Last year's incident showed p50 jumped to 400ms at 1000 RPS, and the DB connection pool was 100% saturated at 1500 RPS.",
            "options": [
                {
                    "id": "a",
                    "text": "Code optimization — find the slow algorithm and fix it.",
                    "outcome": "Wrong diagnosis. At 200 RPS your code is fine (p99 80ms is great). The problem is saturation under load, not slow code.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Double server capacity (more app servers + larger DB connection pool).",
                    "outcome": "Partially right but insufficient. Doubling gets you to ~4000 RPS theoretical headroom. But last year's failure was DB connection pool exhaustion at 1500 RPS — doubling the pool gets you to 3000 RPS, still below the 2000 RPS target with safety margin.",
                    "correct": False
                },
                {
                    "id": "c",
                    "text": "Diagnose the bottleneck first (it's DB connection pool saturation), then fix the right layer: increase pool size, add read replicas for read-heavy queries, and add autoscaling on app servers with circuit breaking to shed load if DB saturates.",
                    "outcome": "Correct — last year's data shows the bottleneck is the DB connection pool, not the app code. Fix the bottleneck, add capacity, and add a safety net (circuit breaking) so you don't cascade to failure if load exceeds headroom.",
                    "correct": True
                },
                {
                    "id": "d",
                    "text": "Add more caching — cache everything.",
                    "outcome": "Helps but doesn't address the underlying bottleneck. Without understanding where the bottleneck is, you'll add complexity and may still fail.",
                    "correct": False
                }
            ],
            "rationale": "The data tells the story: at 200 RPS the system is healthy (CPU 30%, pool 20%, cache 92%). Last year, p50 jumped from 80ms to 400ms at 1000 RPS — that's not slow code (slow code would be slow at every load), it's queueing (latency grows when utilization approaches 100%). The DB connection pool saturated at 1500 RPS, meaning requests queued waiting for connections, p99 exploded, and the system cascaded. This is a scalability problem, not a performance problem. The fix has three parts: (1) remove the bottleneck — bigger DB connection pool, plus read replicas for read-heavy queries so the primary isn't the only path; (2) add capacity — autoscale app servers; (3) add a safety net — circuit breaking so if the DB saturates, you return 503 fast instead of queuing requests until they time out. The mistake is to jump to either 'optimize code' (option A — wrong diagnosis) or 'add servers blindly' (option B — addresses symptoms without fixing the bottleneck layer). The deeper lesson: always diagnose the bottleneck layer before choosing a fix. Adding capacity to a layer that isn't the bottleneck just wastes money.",
            "difficulty": "interview"
        }
    }
]

PVS_SOURCES = [
    {"title": "Amdahl, Gene — Validity of the Single Processor Approach to Achieving Large Scale Computing Capabilities (AFIPS 1967)", "url": "https://ieeexplore.ieee.org/document/4054633", "publisher": "AFIPS / IEEE", "type": "paper"},
    {"title": "Redis Documentation — Architecture and Performance", "url": "https://redis.io/docs/management/scaling/", "publisher": "Redis", "type": "official-doc"},
    {"title": "Cassandra Architecture — Apache Documentation", "url": "https://cassandra.apache.org/doc/latest/cassandra/architecture/", "publisher": "Apache Software Foundation", "type": "official-doc"},
    {"title": "Google SRE Book — Handling Overload", "url": "https://sre.google/sre-book/handling-overload/", "publisher": "Google SRE", "type": "book"}
]


# ──────────────────────────────────────────────────────────────────────
# 7. availability-vs-consistency
# ──────────────────────────────────────────────────────────────────────

AVC_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "tunable-consistency-deep",
        "payload": {
            "text": "**Tunable consistency — most production systems are mixed.** Real distributed databases don't make you pick one side of CAP for the whole system. They let you choose **per operation** based on the workload.\n\nIn DynamoDB, every read/write specifies a consistency level:\n- `EventuallyConsistentRead` (default, 1 read capacity unit per 4KB): reads from any replica, may be stale, but cheapest and most available.\n- `StronglyConsistentRead` (2 read capacity units per 4KB): reads from the leader, always returns the latest write, but fails if the leader is unreachable (CP behavior).\n\nIn Cassandra, every query specifies `CONSISTENCY LEVEL`:\n- `ONE` — read from any one replica (AP, fastest, may be stale).\n- `QUORUM` — read from a majority of replicas (tunable CP, slower, strongly consistent if writes are also QUORUM).\n- `ALL` — read from every replica (CP, slowest, fails if any replica is down).\n\nThis is the right design: a banking app uses strongly consistent reads for balances and eventually consistent reads for transaction history thumbnails. A social feed uses eventually consistent reads everywhere. The database doesn't force you into one bucket — the application code picks per operation, and the cost (latency, capacity, availability) is paid per operation."
        }
    },
    {
        "type": "mermaid",
        "id": "cap-triangle-diagram",
        "payload": {
            "code": "flowchart TD\n    C((Consistency<br/>linearizable))\n    A((Availability<br/>every request responds))\n    P((Partition tolerance<br/>survives network splits))\n    C --- A\n    A --- P\n    P --- C\n    CP[CP systems<br/>reject on partition<br/>e.g., Spanner, HBase,<br/>MongoDB majority]\n    AP[AP systems<br/>serve stale data on partition<br/>e.g., Cassandra, DynamoDB,<br/>CouchDB]\n    CA[CA systems<br/>only valid without partitions<br/>= single-machine DB<br/>e.g., Postgres on one box]\n    C -.-> CP\n    P -.-> CP\n    A -.-> AP\n    P -.-> AP\n    C -.-> CA\n    A -.-> CA\n    classDef cap fill:#e8f0fe,stroke:#1967d2,stroke-width:2px,color:#174ea6\n    classDef cp fill:#fee,stroke:#c33,color:#900\n    classDef ap fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef ca fill:#f3e8fd,stroke:#9334c6,color:#681da8\n    class C,A,P cap\n    class CP cp\n    class AP ap\n    class CA ca",
            "caption": "CAP triangle. Because partitions (P) are inevitable on real networks, distributed systems are either CP (sacrifice availability during partition) or AP (sacrifice strong consistency). CA only exists for single-machine systems with no partition to tolerate.",
            "alt_text": "A CAP triangle with Consistency, Availability, and Partition tolerance at the corners. CP systems (like Spanner, HBase, MongoDB with majority) prioritize consistency by rejecting requests during a partition. AP systems (like Cassandra, DynamoDB, CouchDB) prioritize availability by serving possibly stale data. CA systems only work without partitions, which means single-machine databases like Postgres on one box."
        }
    },
    {
        "type": "prose",
        "id": "bank-vs-social-comparison",
        "payload": {
            "text": "**Bank vs social feed — same database, different choices.**\n\n| Aspect | Bank ledger | Social feed |\n|--------|-------------|-------------|\n| Critical data | account balance, transaction history | posts, likes, comments |\n| Cost of stale read | overdraft, financial loss, disputes | user sees post 5s late |\n| Cost of unavailability | can't process payments, revenue loss | user refreshes, minor annoyance |\n| CAP choice | CP (consistency > availability) | AP (availability > consistency) |\n| Consistency level | strong (linearizable) | eventual |\n| Replication | synchronous, quorum writes | asynchronous, accept on any replica |\n| Latency cost | higher (must coordinate) | lower (no coordination) |\n| Real example | Spanner for AdWords billing | Cassandra for Instagram feed |\n\nBoth can run on the same physical infrastructure — the difference is the consistency policy chosen per operation. Modern distributed databases (DynamoDB, Spanner, CockroachDB, Cassandra) let you tune per operation. This is why 'AP vs CP' is the wrong question at the database level — the right question is 'per operation, which consistency level do you need?'\n\nThe architect's job is to identify, for each piece of data, what failure costs more: stale reads (favor CP) or unavailability (favor AP). Most systems have both: payment state is CP, social feed state is AP, in the same database cluster."
        }
    },
    {
        "type": "callout",
        "id": "dynamodb-tunable-example",
        "payload": {
            "title": "Real system: DynamoDB's tunable consistency",
            "body": "DynamoDB lets you set `ConsistentRead=true` per request. Strongly consistent reads cost 2x the read capacity units (RCU) of eventually consistent reads, and they fail if the leader replica is unreachable. Eventually consistent reads are cheaper, faster, and always available — but may return stale data. The DynamoDB team's recommendation is explicit: use strongly consistent reads for writes that other parts of the system will immediately read back (e.g., write an order, then read it back to confirm) — use eventually consistent reads for everything else (e.g., listing all orders, showing a dashboard). This is a per-operation, not per-table, decision — and it's why DynamoDB can power both Amazon's shopping cart (must be consistent) and its recommendation feed (can be eventually consistent) on the same infrastructure.",
            "kind": "tip"
        }
    },
    {
        "type": "mermaid",
        "id": "partition-scenario",
        "payload": {
            "code": "flowchart TD\n    subgraph Normal[Normal operation - no partition]\n        W1[Write to leader] --> R1[Sync to replica 1]\n        W1 --> R2[Sync to replica 2]\n        R1 --> A1[ACK write]\n        R2 --> A1\n        A1 --> Done1[Strong read from any replica<br/>sees the write]\n    end\n    subgraph Partitioned[Network partition - leader cut off from replica 2]\n        W2[Write to leader] --> R3[Sync to replica 1 only]\n        R3 --> A2[ACK write - CP path]\n        A2 --> Q1{Read from replica 2?}\n        Q1 -->|CP: refuse the read| Err[Return error<br/>unavailable but safe]\n        Q1 -->|AP: serve stale| Stale[Return old value<br/>available but stale]\n        W3[Write to replica 2] --> A3[ACK - AP path]\n        A3 --> Diverge[Replicas now diverge.<br/>Reconcile on heal via<br/>read-repair or vector clocks]\n    end\n    classDef cp fill:#fee,stroke:#c33,color:#900\n    classDef ap fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef ok fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class Err cp\n    class Stale,Diverge ap\n    class Done1 ok",
            "caption": "Network partition scenario. CP systems refuse reads from the unreachable side (return error). AP systems serve stale data and reconcile later (eventual consistency).",
            "alt_text": "A flowchart contrasting normal operation and partitioned operation. In normal operation, a write to the leader syncs to both replicas before ACKing, and strong reads from any replica see the write. In a partition, the leader can only sync to one replica. CP path: ACK the write, but refuse reads from the unreachable replica (return error - unavailable but safe). AP path: serve stale reads from the unreachable replica, and accept writes on that replica too (available but stale, replicas diverge, reconcile on heal)."
        }
    },
    {
        "type": "quiz",
        "id": "q-mixed-consistency",
        "payload": {
            "question": "You're building an e-commerce checkout flow. Which data should use strongly consistent reads/writes, and which can be eventually consistent?",
            "shape": "mcq",
            "options": [
                "Everything must be strongly consistent — it's e-commerce, accuracy matters.",
                "Inventory and payment state must be strongly consistent (CP). Product reviews, recommendations, and order history thumbnails can be eventually consistent (AP). The mix is fine — modern databases support per-operation consistency levels.",
                "Everything can be eventually consistent — eventual consistency is always fine.",
                "Only the payment confirmation needs strong consistency; everything else can be eventually consistent."
            ],
            "answer_index": 1,
            "rationale": "Mixed consistency is the right answer. Inventory must be strongly consistent — if you sell the last item to two customers, you have an overpromise and a customer service disaster. Payment state must be strongly consistent — partial charges or stale balance reads cause disputes. But product reviews (a user sees a review 5 seconds after it's posted — fine), recommendations (slightly stale behavioral signals don't matter), and order history thumbnails (the user can refresh) can all be eventually consistent. The mix lets you optimize: strongly consistent reads cost more (DynamoDB charges 2x RCU; Cassandra QUORUM is slower than ONE), so use them only where they're needed. Option A (everything strongly consistent) is overkill — you pay the latency and capacity cost everywhere, even where it's not needed. Option C (everything eventually consistent) is dangerous — you'd oversell inventory. Option D is too narrow — inventory matters too, not just payment.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-cassandra-choice",
        "payload": {
            "prompt": "You're designing a distributed counter for 'likes' on a viral post. Expected: 10,000 likes/sec at peak on a single popular post. Choose between (a) strongly consistent (CP) writes via Cassandra QUORUM, or (b) eventually consistent (AP) writes via Cassandra ONE with read-repair. Justify.",
            "context": "Likes are integer counters. The post is viral for ~1 hour. Users don't care if the displayed count is off by a few hundred for a few seconds. But the final count must be correct (advertisers pay based on engagement).",
            "options": [
                {
                    "id": "a",
                    "text": "QUORUM writes — strongly consistent, advertisers see the exact count.",
                    "outcome": "Wrong. At 10K writes/sec with QUORUM (3 replicas), you're doing 30K cross-node writes/sec, with consensus overhead. Latency will spike and you may not keep up — losing likes.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "ONE writes (AP) during the viral hour, then a periodic reconciliation job computes the authoritative count and stores it as the 'final' count for advertisers.",
                    "outcome": "Correct — the displayed count is eventually consistent (good enough for users), the final count is computed via aggregation (correct for advertisers), and the write path scales to 10K/sec without coordination overhead.",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "Use a single strongly consistent counter stored in Postgres.",
                    "outcome": "Won't scale — a single Postgres row with 10K writes/sec will lock-thrash and fail.",
                    "correct": False
                },
                {
                    "id": "d",
                    "text": "Use a CRDT counter (HyperLogLog or G-Counter).",
                    "outcome": "G-Counter (a state-based CRDT) is actually a good answer here, but it's an implementation detail of option B — the conceptual choice is still AP.",
                    "correct": False
                }
            ],
            "rationale": "The data tells you the answer: (1) users tolerate staleness for displayed likes (5s late is invisible); (2) advertisers need the final count correct, not the live count; (3) 10K writes/sec on one counter exceeds what a strongly consistent path can handle. So you decouple the two requirements: write eventually (AP, ONE consistency), then periodically (say every 60s) aggregate the deltas into an authoritative count that advertisers see. The write path scales linearly (no coordination), the aggregation job is cheap (sum a batch of deltas), and the displayed count is at most 60s stale. Option A (QUORUM) over-pays for consistency that nobody needs on the hot path. Option C (single Postgres row) is the textbook example of how not to scale a counter — row locks will serialize all 10K writes/sec. Option D (CRDT) is actually a smart implementation detail of option B — G-Counters are CRDTs that converge eventually without coordination, perfect for distributed counters. But the conceptual CAP choice is still AP. The deeper lesson: when you have multiple readers with different requirements (users vs advertisers), build multiple paths — don't make the hot path pay for the strictest reader's requirements.",
            "difficulty": "interview"
        }
    }
]

AVC_SOURCES = [
    {"title": "Gilbert & Lynch — Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services (SIGACT 2002)", "url": "https://users.ece.cmu.edu/~adrian/731-sp04/readings/GL-cap.pdf", "publisher": "ACM SIGACT", "type": "paper"},
    {"title": "Amazon DynamoDB — Read Consistency", "url": "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html", "publisher": "Amazon Web Services", "type": "official-doc"},
    {"title": "Google Spanner — TrueTime and External Consistency", "url": "https://research.google/pubs/pub39966/", "publisher": "Google Research", "type": "paper"},
    {"title": "Cassandra Documentation — Consistency Levels", "url": "https://cassandra.apache.org/doc/latest/cassandra/configuration/cass_yaml_file.html#consistency-levels", "publisher": "Apache Software Foundation", "type": "official-doc"}
]


# ──────────────────────────────────────────────────────────────────────
# 8. cap-theorem
# ──────────────────────────────────────────────────────────────────────

CAP_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "cap-real-choice-deep",
        "payload": {
            "text": "**The 'pick two' slogan is wrong.** The popular framing — 'CAP says pick two of three: C, A, or P' — is misleading because **P is not optional on a real network**. Network partitions *will* happen: cables get cut, routers fail, switches reboot, configs get pushed wrong. If your system cannot tolerate partitions, it will fail every time the network hiccups.\n\nThe real theorem is sharper: **during a partition**, you must choose between C and A. You can have both when the network is healthy. This is why PACELC is a better model:\n- **P (if Partition):** choose between **A** (availability) and **C** (consistency).\n- **E (Else — normal operation):** choose between **L** (latency) and **C** (consistency).\n\nEven when the network is healthy, strong consistency has a latency cost: you must coordinate (a quorum round, a Paxos round, a 2PC commit) before you can ACK. That coordination adds round-trips, which adds latency. So every distributed write implicitly chooses: do you pay the latency for strong consistency (CP), or do you ACK early and accept eventual consistency (AP)?"
        }
    },
    {
        "type": "mermaid",
        "id": "cap-triangle-labeled",
        "payload": {
            "code": "flowchart TD\n    C((C: Consistency<br/>every read sees<br/>latest write))\n    A((A: Availability<br/>every non-failed node<br/>responds))\n    P((P: Partition tolerance<br/>survives network splits))\n    C ---|cannot have both during partition| A\n    A ---|P is inevitable<br/>on real networks| P\n    P ---|cannot have both during partition| C\n    CP[CP systems<br/>reject writes during partition<br/>sacrifice A<br/>Examples: Spanner, HBase,<br/>MongoDB majority, etcd, ZooKeeper]\n    AP[AP systems<br/>accept writes on any node<br/>sacrifice strong C<br/>Examples: Cassandra, DynamoDB,<br/>CouchDB, Riak, Redis Cluster]\n    CA[CA: only valid if P never happens<br/>= single-machine database<br/>Examples: Postgres on one box,<br/>MySQL on one box]\n    C -.-> CP\n    P -.-> CP\n    A -.-> AP\n    P -.-> AP\n    C -.-> CA\n    A -.-> CA\n    classDef corner fill:#e8f0fe,stroke:#1967d2,stroke-width:2px,color:#174ea6\n    classDef cp fill:#fee,stroke:#c33,color:#900\n    classDef ap fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef ca fill:#f3e8fd,stroke:#9334c6,color:#681da8\n    class C,A,P corner\n    class CP cp\n    class AP ap\n    class CA ca",
            "caption": "CAP triangle with system labels. Real distributed systems are CP (reject on partition) or AP (serve stale). CA is only valid for single-machine databases.",
            "alt_text": "A CAP triangle. C, A, P at the corners. CP systems (Spanner, HBase, MongoDB majority, etcd, ZooKeeper) sacrifice availability during partitions. AP systems (Cassandra, DynamoDB, CouchDB, Riak, Redis Cluster) sacrifice strong consistency. CA only works without partitions — single-machine databases like Postgres or MySQL on one box."
        }
    },
    {
        "type": "prose",
        "id": "cassandra-vs-spanner-deep",
        "payload": {
            "text": "**Cassandra (AP) vs Spanner (CP) — two design philosophies.**\n\n**Cassandra** was designed at Facebook for inbox search — a workload that needed to scale to billions of rows, survive any single node failure, and accept writes at very high throughput. The team chose AP: every node accepts writes, conflicts are reconciled later (last-write-wins by default, or custom conflict resolution), and the system is eventually consistent. Reads can be at `ONE` (any replica, may be stale), `QUORUM` (majority, strongly consistent if writes are also QUORUM), or `ALL`. The trade-off: writes never block on coordination, throughput scales linearly with nodes, but reads may return stale data unless you pay for QUORUM.\n\n**Spanner** was designed at Google for AdWords billing — a workload where every dollar of ad spend must be correctly attributed, even across datacenters. The team chose CP: writes go through a Paxos leader, the leader synchronously replicates to a quorum across datacenters, and the write ACKs only after the quorum confirms. Spanner uses TrueTime (Google's GPS-synced atomic clocks) to give every transaction a globally-meaningful commit timestamp, enabling external consistency (linearizability across datacenters). The trade-off: writes have cross-datacenter latency (typically 10-100ms depending on regions), and during a partition, the minority side rejects writes.\n\nThe choice wasn't 'Cassandra is better' or 'Spanner is better' — it was 'which failure costs more for this workload?' Facebook inbox search: staleness is fine, throughput is critical → AP. Google billing: correctness is critical, can afford latency → CP. Same trade-off, opposite choices, both right for their workloads."
        }
    },
    {
        "type": "mermaid",
        "id": "partition-simulation",
        "payload": {
            "code": "flowchart TD\n    subgraph Healthy[Network healthy - both nodes reachable]\n        W1[Client writes 'set x=5']\n        W1 --> L1[Leader receives write]\n        L1 --> S1[Sync to follower]\n        S1 --> A1[ACK to client - both CP and AP succeed]\n        A1 --> R1[Subsequent read returns 5<br/>from either node]\n    end\n    subgraph Partitioned[Network partition - leader cannot reach follower]\n        W2[Client writes 'set x=6']\n        W2 --> L2[Leader receives write]\n        L2 --> S2{Can sync to follower?}\n        S2 -->|No - partitioned| CPPath[CP path:<br/>reject the write<br/>return error<br/>unavailable but consistent]\n        S2 -->|No - partitioned| APPath[AP path:<br/>accept write locally<br/>return OK<br/>available but may diverge]\n        CPPath --> CPRead[Reads may fail<br/>until partition heals<br/>but never return stale data]\n        APPath --> APRead[Reads from either side<br/>may return different values<br/>until reconciliation on heal]\n    end\n    classDef healthy fill:#e6f4ea,stroke:#188038,color:#0d652d\n    classDef cp fill:#fee,stroke:#c33,color:#900\n    classDef ap fill:#fff4e5,stroke:#cc7a00,color:#995500\n    class A1,R1 healthy\n    class CPPath,CPRead cp\n    class APPath,APRead ap",
            "caption": "Partition simulation. CP path rejects writes it can't prove are consistent (unavailable but safe). AP path accepts writes locally (available but may diverge until reconciliation).",
            "alt_text": "A flowchart showing partition behavior. In healthy operation, a write to the leader syncs to the follower, ACKs, and subsequent reads return the new value from either node. During a partition, the leader can't reach the follower. CP path: reject the write, return error (unavailable but consistent). Reads may fail until the partition heals, but never return stale data. AP path: accept the write locally, return OK (available but may diverge). Reads from either side may return different values until reconciliation on heal."
        }
    },
    {
        "type": "callout",
        "id": "pacelc-extension",
        "payload": {
            "title": "PACELC — CAP's missing latency dimension",
            "body": "CAP only addresses what happens during a partition. But even when the network is healthy, strong consistency has a latency cost: you must coordinate (Paxos round, quorum write, 2PC) before ACKing. PACELC, introduced by Abadi in 2010, makes this explicit: if there is a Partition, choose between A and C; Else (normal operation), choose between L (latency) and C. Example systems: Spanner is PA/EL (sacrifices consistency both during partition and normally for latency? No — Spanner is PC/EC: prioritizes consistency in both cases, accepting higher latency). Cassandra is PA/EL: sacrifices consistency during partitions (PA) and also sacrifices consistency for latency normally (EL) — that's why Cassandra ONE reads are so fast. DynamoDB is PA/EL by default but tunable to PC/EC per request. The PACELC model captures that 'low latency' and 'strong consistency' are on opposite ends of a spectrum, even without partitions.",
            "kind": "note"
        }
    },
    {
        "type": "quiz",
        "id": "q-pacelc-cassandra",
        "payload": {
            "question": "Cassandra's default consistency level is ONE for both reads and writes — read from one replica, ACK after one replica acknowledges the write. In PACELC terms, what is Cassandra?",
            "shape": "mcq",
            "options": [
                "PC/EC — prioritizes consistency during partitions and normally.",
                "PA/EL — sacrifices consistency during partitions (PA) and sacrifices consistency for latency in normal operation (EL).",
                "PA/EC — sacrifices consistency during partitions but prioritizes consistency normally.",
                "PC/EL — prioritizes consistency during partitions but sacrifices consistency for latency normally."
            ],
            "answer_index": 1,
            "rationale": "Cassandra at ONE consistency is PA/EL. PA: during a partition, any reachable node accepts writes — sacrifices strong consistency for availability (writes don't fail because of the partition). EL: even when the network is healthy, ONE-level writes ACK after a single replica confirms — sacrifices strong consistency (the other replicas may not yet have the write) for low latency (no coordination needed). The result is a system that's very fast and always writable, but reads may return stale data. This is intentional — Cassandra was designed for high-throughput, always-writable workloads like inbox search. If you change consistency to QUORUM on both reads and writes, Cassandra becomes PC/EC: writes block until a quorum confirms (sacrificing availability during partitions, and adding latency normally). The deeper lesson: consistency is not a database property, it's a per-operation choice. PACELC tells you the cost of that choice in two different conditions (during partition vs normally).",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-cap-payment",
        "payload": {
            "prompt": "You're designing a multi-region payment system. Each region processes payments locally for low latency. A user in Singapore pays $100; the Singapore region ACKs within 50ms. The user immediately checks their balance from a US session. What CAP choice should the system make, and what does the user see?",
            "context": "Singapore-to-US network latency is ~180ms one-way. A synchronous cross-region write (CP) would ACK in ~360ms minimum. An asynchronous cross-region write (AP) ACKs in <50ms but the US region may not yet have the write.",
            "options": [
                {
                    "id": "a",
                    "text": "Choose CP: synchronous replication across regions. Singapore ACKs after US confirms. User always sees consistent balance. Latency: 360ms+ per payment.",
                    "outcome": "Correct for safety, but 360ms payment latency is bad UX and may exceed 3DSecure timeout windows. Singapore users will complain payments feel slow.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Choose AP: ACK locally in 50ms, replicate asynchronously. US may briefly show stale balance. Risk: user might double-spend if they immediately transact from the US session.",
                    "outcome": "Correct for latency, but unsafe for payments — users could overdraw by transacting before the cross-region replication completes.",
                    "correct": False
                },
                {
                    "id": "c",
                    "text": "Mixed: synchronous replication only for balance-affecting writes (CP), asynchronous for read-mostly data (AP). Singapore ACKs after local + leader quorum, not full cross-region sync. Cross-region replication is async but fast (<1s). Balance reads route to the leader's region (CP read).",
                    "outcome": "Correct — pay the consistency cost only for the operations that need it. Latency stays low (local quorum ~50ms), cross-region consistency is eventual (<1s), and balance reads always hit the leader for correctness.",
                    "correct": True
                },
                {
                    "id": "d",
                    "text": "Single region only — don't go multi-region. Eliminate the CAP problem by not distributing.",
                    "outcome": "Solves CAP but kills latency for non-US users and creates a single point of failure for the whole payment system.",
                    "correct": False
                }
            ],
            "rationale": "The architect's response to CAP is rarely 'pick a side globally' — it's 'pick per operation, and route reads to the right place.' Payments are the canonical CP workload: correctness matters more than latency, and double-charging or overdrawing is unacceptable. But synchronous cross-region replication (option A) over-pays: 360ms latency is bad UX and may break external integrations. Option B (AP everywhere) under-pays: it's unsafe for balance-affecting operations. Option C is the right architecture: use a quorum within a single region for the synchronous ACK (50ms — fast because it's local), then asynchronous cross-region replication for global availability. Reads that must be correct (balance checks, transaction confirmation) route to the leader's region — pay the latency for those specific reads. Writes that don't need to be globally consistent immediately (audit logs, analytics) go AP. This is why DynamoDB Global Tables, CockroachDB, and Spanner all offer per-operation tunable consistency. The deeper lesson: CAP is not a database-level choice; it's a per-operation choice. Build a system where the hot path is fast (local quorum) and correctness-critical reads pay the cross-region cost only when needed.",
            "difficulty": "interview"
        }
    }
]

CAP_SOURCES = [
    {"title": "Brewer's Conjecture — Gilbert & Lynch proof (SIGACT News 2002)", "url": "https://users.ece.cmu.edu/~adrian/731-sp04/readings/GL-cap.pdf", "publisher": "ACM SIGACT", "type": "paper"},
    {"title": "Brewer, Eric — CAP Twelve Years Later (CACM 2012)", "url": "https://infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/", "publisher": "IEEE Computer / CACM", "type": "paper"},
    {"title": "Abadi, Daniel — Consistency Tradeoffs in Modern Distributed Database Design (IEEE Computer 2012, PACELC)", "url": "https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf", "publisher": "IEEE Computer", "type": "paper"},
    {"title": "Google Spanner Paper (OSDI 2012)", "url": "https://research.google/pubs/pub39966/", "publisher": "Google Research / USENIX", "type": "paper"},
    {"title": "Apache Cassandra Documentation — Architecture", "url": "https://cassandra.apache.org/doc/latest/cassandra/architecture/", "publisher": "Apache Software Foundation", "type": "official-doc"}
]


# ──────────────────────────────────────────────────────────────────────
# 9. caching-strategies
# ──────────────────────────────────────────────────────────────────────

CS_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "cache-hierarchy-deep",
        "payload": {
            "text": "**Cache hierarchy — layered caches compose.** Production systems rarely have one cache. They have a stack: each layer is faster but smaller, and each serves misses from the layer below.\n\nA typical web app stack:\n1. **Browser cache** (per-user, seconds-to-days TTL). Static assets with hashes in filenames (e.g., `app.abc123.js`) cached for a year. HTML cached for seconds.\n2. **CDN edge cache** (per-PoP, minutes-to-hours TTL). Static assets, sometimes HTML, cached at 300+ PoPs globally. ~10ms latency to user.\n3. **App-server in-process cache** (per-instance, seconds TTL). Frequently accessed config, computed values. ~0.01ms latency. Lost on restart.\n4. **Distributed cache (Redis/Memcached)** (shared, seconds-to-minutes TTL). User profiles, session data, query results. ~1ms latency. Survives app restarts.\n5. **Database query cache** (per-DB, often disabled). Cached query results. Often more trouble than it's worth (invalidation is hard).\n6. **Database buffer pool** (per-DB, transparent). Pages cached in RAM. ~0.1ms latency. The OS page cache provides another layer.\n\nThe key insight: each layer only holds a fraction of the data, and each layer serves ~90% of its requests from cache. So 1000 user requests might result in 100 CDN misses (10%), of which 10 reach the app (90% served from CDN), of which 1 reaches the DB (90% served from Redis). The DB sees 0.1% of original load. This is why a small cache can carry a 1000x-larger database."
        }
    },
    {
        "type": "mermaid",
        "id": "cache-hierarchy-diagram",
        "payload": {
            "code": "flowchart TD\n    User[User browser<br/>cache TTL: 1 year for hashed assets] --> CDN[CDN edge PoP<br/>~330 sites globally<br/>TTL: minutes-hours<br/>latency: 10ms]\n    CDN --> App[App server<br/>in-process cache<br/>TTL: seconds<br/>latency: 0.01ms]\n    App --> Redis[(Distributed cache<br/>Redis cluster<br/>TTL: minutes<br/>latency: 1ms)]\n    App --> DB[(Database<br/>+ buffer pool + OS page cache<br/>latency: 10-100ms)]\n    Redis --> DB\n    Notes[Each layer serves ~90% of its requests.<br/>1000 user requests → 100 CDN misses → 10 app misses → 1 DB hit.<br/>DB sees 0.1% of original load.]\n    classDef user fill:#e8f0fe,stroke:#1967d2,color:#174ea6\n    classDef cache fill:#e6f4ea,stroke:#188038,color:#0d652d\n    classDef db fill:#fef7e0,stroke:#f9ab00,color:#b06000\n    class User user\n    class CDN,App,Redis cache\n    class DB db",
            "caption": "Layered cache hierarchy. Each layer is faster, smaller, and serves ~90% of its incoming requests — so a small cache can carry a 1000x-larger database.",
            "alt_text": "A diagram of cache hierarchy. User browser cache (TTL 1 year for hashed assets) connects to CDN edge (330 PoPs, minutes-hours TTL, 10ms latency). CDN connects to app server in-process cache (TTL seconds, 0.01ms latency). App server connects to Redis distributed cache (TTL minutes, 1ms latency). Redis and app server both connect to the database (with buffer pool and OS page cache, 10-100ms latency). Each layer serves ~90% of its requests, so 1000 user requests become 100 CDN misses, 10 app misses, 1 DB hit. DB sees 0.1% of original load."
        }
    },
    {
        "type": "prose",
        "id": "strategies-comparison-table",
        "payload": {
            "text": "**All four strategies, side by side.**\n\n| Strategy | When written to cache | Read path | Write latency | Staleness | Failure risk | Best for |\n|----------|----------------------|-----------|---------------|-----------|--------------|----------|\n| **Cache-aside** | On read miss (lazy) | cache → DB on miss | low (DB only) | up to TTL | cache crash = slow, not broken | read-heavy, can tolerate staleness |\n| **Write-through** | On write (sync to both) | cache always hits | high (cache + DB sync) | none | cache down = write fails | writes-once-read-many, freshness critical |\n| **Write-behind** | On write (cache only, DB async) | cache always hits | very low (cache only) | DB may lag seconds-minutes | cache crash = data loss | high-write, low-criticality (counters, telemetry) |\n| **Refresh-ahead** | Proactively before TTL expires | cache always hits (for popular items) | low | none (for popular items) | wasted work on cold items | hot items (home page, trending) |\n\nThe right strategy depends on (1) read:write ratio, (2) staleness tolerance, (3) write latency tolerance, and (4) data-loss tolerance. Most systems combine: cache-aside as the default, write-through for transactional state, write-behind for counters and analytics, refresh-ahead for hot keys.\n\nThe architect's rule: start with cache-aside. Add complexity only when measurements prove you need it. Most cache-related outages come from over-engineering (write-behind on data you can't afford to lose) or under-engineering (cache-aside on a hot key without stampede protection)."
        }
    },
    {
        "type": "mermaid",
        "id": "cache-stampede-diagram",
        "payload": {
            "code": "flowchart TD\n    TTL[Popular key's<br/>TTL expires at T=0] --> Q[Within 100ms, 1000 requests arrive]\n    Q --> M1[Request 1: MISS - fetch from DB]\n    Q --> M2[Request 2: MISS - fetch from DB]\n    Q --> M3[Request 3: MISS - fetch from DB]\n    Q --> Mn[Request N: MISS - fetch from DB]\n    M1 --> DB1[(Database<br/>gets 1000 queries<br/>in 100ms)]\n    M2 --> DB1\n    M3 --> DB1\n    Mn --> DB1\n    DB1 --> Crash{DB<br/>saturated?}\n    Crash -->|Yes| Down[System down<br/>cascading failure]\n    Crash -->|No| Recov[Survives<br/>but slow]\n    DB1 --> Mitigation{Mitigation<br/>in place?}\n    Mitigation -->|Lock| Lock[Cache lock:<br/>only req 1 fetches,<br/>others wait]\n    Mitigation -->|Jitter| Jitter[Probabilistic early<br/>expiration: TTL + jitter<br/>spreads misses over time]\n    Mitigation -->|Refresh-ahead| RA[Refresh-ahead:<br/>refresh before expiry<br/>no miss ever happens]\n    classDef problem fill:#fee,stroke:#c33,color:#900\n    classDef mitigation fill:#e6f4ea,stroke:#188038,color:#0d652d\n    class Down problem\n    class Lock,Jitter,RA mitigation",
            "caption": "Cache stampede: when a popular key expires, N concurrent requests all miss simultaneously, hammering the DB. Three mitigations: cache locking, probabilistic TTL jitter, refresh-ahead.",
            "alt_text": "A flowchart of cache stampede. A popular key's TTL expires. Within 100ms, 1000 requests arrive. All 1000 see a MISS and fetch from the DB simultaneously. The DB gets 1000 queries in 100ms — it may saturate (system down, cascading failure) or barely survive but slow. Mitigations: cache lock (only the first request fetches, others wait), probabilistic early expiration with jitter (TTL is randomized so misses spread out over time), refresh-ahead (refresh before expiry so no miss ever happens)."
        }
    },
    {
        "type": "callout",
        "id": "netflix-evcache-real",
        "payload": {
            "title": "Real system: Netflix EVCache",
            "body": "Netflix's EVCache is a Memcached-based distributed cache deployed across multiple AWS regions. It serves 90%+ of Netflix's read traffic — user profiles, watch history, content metadata, recommendations. The architecture: each region has its own EVCache cluster (multiple shards for horizontal scaling, with replicas for HA). Writes go to the local region's EVCache synchronously (write-through for user state, cache-aside for content metadata), then replicate cross-region via EVCache's replication layer (asynchronous, ~seconds latency). On a region failure, Netflix routes traffic to a healthy region via Route 53 — the cache there may be slightly stale but the system stays available. This is a textbook example of layered caching (CDN → app → EVCache → Cassandra) and per-workload strategy choice (write-through for user state, cache-aside for content). The key insight: Netflix didn't pick one caching strategy — they use multiple, tuned per workload.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-write-behind-payment",
        "payload": {
            "question": "Your team lead proposes using write-behind caching for the payment system: 'Writes are 100x faster, the DB catches up in a few seconds, what could go wrong?' What's the right response?",
            "shape": "mcq",
            "options": [
                "Agree — write-behind is faster, and payments will sync eventually.",
                "Disagree — if the cache crashes before flushing to DB, committed payments are lost. Payments require write-through (or no caching of writes at all). Write-behind is for telemetry and counters, not transactions.",
                "Compromise — use write-behind but with frequent DB flushes (every 100ms).",
                "Compromise — use write-behind but with a sync flag on important payments."
            ],
            "answer_index": 1,
            "rationale": "Write-behind's defining failure mode is data loss on cache crash. If the cache ACKs a write to the user but the cache dies before flushing to the DB, that write is gone — no transaction log, no recovery. For payments, this is unacceptable: a user who got a 'payment received' ACK but whose payment was lost will dispute the charge, and you have no record to defend yourself. The rule: write-behind is for data you can afford to lose (telemetry, counters, analytics events). Write-through (or no caching at all) is for data you cannot lose (payments, orders, user accounts). Options C and D are 'compromises' that don't address the fundamental risk — even a 100ms flush window means up to 100ms of committed writes can be lost. The correct response is to push back: payments don't go through write-behind. If payment write latency is the problem, the fix is connection pooling, faster storage, or sharding — not a write-behind cache.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-stampede-real",
        "payload": {
            "prompt": "Your e-commerce site caches the home page product carousel in Redis with a 5-minute TTL. At peak (Black Friday), the carousel is requested 10,000 times/sec. Every 5 minutes, your database CPU spikes to 100% for ~10 seconds. Diagnose and fix.",
            "context": "The carousel requires joining 5 tables to compute (DB query: ~500ms). When the cache hits, response is 2ms. When it misses, response is 502ms. At the 5-minute TTL boundary, all 10K req/sec suddenly see misses.",
            "options": [
                {
                    "id": "a",
                    "text": "Make the carousel query faster — add indexes, denormalize.",
                    "outcome": "Helps marginally but doesn't fix the spike pattern. The DB will still get hit by all 10K concurrent requests at once.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "Add cache locking — only the first miss fetches from DB, others wait for the result. The DB sees 1 query, not 10,000.",
                    "outcome": "Correct for the spike, but adds latency for the 9,999 waiters (up to 500ms) and adds a single point of failure (the lock holder).",
                    "correct": True
                },
                {
                    "id": "c",
                    "text": "Use refresh-ahead: proactively refresh the cache 30 seconds before expiry, in the background. Popular items never miss.",
                    "outcome": "Correct for the spike and the latency — but you're computing the carousel every 4.5 minutes regardless of demand. Wasteful if the carousel is rarely read.",
                    "correct": True
                },
                {
                    "id": "d",
                    "text": "Set TTL to infinity — never expire.",
                    "outcome": "Catastrophic — the carousel would be frozen at the first cached version forever, never updating as products change.",
                    "correct": False
                }
            ],
            "rationale": "The diagnosis is a textbook cache stampede. At the TTL boundary, 10,000 concurrent requests all see MISS, all fetch the 500ms query from the DB simultaneously, and the DB spikes. The fundamental fix is to ensure only one (or a few) requests pay the DB cost — options B (lock) and C (refresh-ahead) both do this. Option B (cache locking) is the simplest fix: the first MISS acquires a lock and fetches, other requests wait. The DB sees 1 query, the 9,999 waiters see ~500ms latency (not great but not catastrophic). Option C (refresh-ahead) is better for the hot carousel case: refresh in the background 30 seconds before expiry — users never see a miss, the DB is queried once every 4.5 minutes. The trade-off: refresh-ahead computes the carousel even if nobody reads it. For a home page carousel, that's fine — it's always being read. Option A (query optimization) addresses a different problem (slow query) and doesn't fix the spike pattern. Option D (infinite TTL) would freeze the carousel forever. The best production answer combines B + C + jitter: refresh-ahead for the proactive refresh, cache locking as a safety net, and TTL jitter (e.g., 5min ± 30s) so multiple carousels don't all expire simultaneously. The deeper lesson: caching without stampede protection is a ticking bomb on hot keys. Always include stampede mitigation in the cache design, not as an afterthought.",
            "difficulty": "interview"
        }
    }
]

CS_SOURCES = [
    {"title": "Tanenbaum — Distributed Systems: Principles and Paradigms (caching chapter)", "url": "https://www.distributed-systems.net/index.php/books/ds3/", "publisher": "Pearson", "type": "book"},
    {"title": "Netflix Tech Blog — Distributed Caching with EVCache", "url": "https://netflixtechblog.com/distributed-caching-with-evcache-2bf652d6a5bf", "publisher": "Netflix Technology Blog", "type": "blog"},
    {"title": "Redis Documentation — Patterns — Cache Aside", "url": "https://redis.io/docs/manual/patterns/cache/", "publisher": "Redis", "type": "official-doc"},
    {"title": "Vattani, Aditya et al. — Optimizing Probabilistic Early Expiration for Cache Stampede Prevention (WSDM 2015)", "url": "https://dl.acm.org/doi/10.1145/2684822.2685298", "publisher": "ACM WSDM", "type": "paper"}
]


# ──────────────────────────────────────────────────────────────────────
# 10. cache-aside
# ──────────────────────────────────────────────────────────────────────

CA_NEW_BLOCKS = [
    {
        "type": "prose",
        "id": "hit-miss-path-deep",
        "payload": {
            "text": "**The HIT and MISS paths, side by side.** Cache aside's apparent simplicity hides two very different code paths the application must execute correctly.\n\n**HIT path (cache hit, ~1ms):**\n1. App calls `cache.get(key)`.\n2. Redis returns the value in ~0.5-1ms (network + lookup).\n3. App deserializes and returns.\n\nThe HIT path is what makes cache-aside fast — it's a single Redis call, no DB involvement, no serialization of complex queries.\n\n**MISS path (cache miss, ~50-100ms):**\n1. App calls `cache.get(key)` — returns nil (0.5ms).\n2. App queries the database (10-100ms depending on query complexity).\n3. App serializes the result and calls `cache.set(key, value, TTL)` (1ms).\n4. App returns the value.\n\nThe MISS path is what makes cache-aside slow on the first request — but it's a one-time cost amortized over many subsequent HITs. The ratio of HITs to MISSes is the **cache hit rate** — typically 90-99% in production. At 95% hit rate, average latency = 0.95 × 1ms + 0.05 × 50ms = 3.45ms — far below the un-cached 50ms.\n\nThe subtle bug: if step 3 (`cache.set`) fails silently (Redis momentarily down, network blip), the next read will also miss — and the next, and the next. The cache stays empty until Redis recovers. Most production code logs and alarms on set-failure rates to catch this."
        }
    },
    {
        "type": "mermaid",
        "id": "hit-miss-flow",
        "payload": {
            "code": "flowchart TD\n    Read[App: get_user 42] --> Get1[cache.get 'user:42']\n    Get1 --> Hit{Hit?}\n    Hit -->|YES - 1ms total| Return1[Deserialize + return<br/>HIT path: ~1ms]\n    Hit -->|MISS| DB[db.fetch_user 42<br/>~50ms]\n    DB --> Set[cache.set 'user:42', value, TTL=300s<br/>~1ms]\n    Set --> Return2[Return value<br/>MISS path: ~52ms]\n    Set -.->|set fails silently| Silent{Set OK?}\n    Silent -->|No - Redis down| Warn[Next reads will MISS too<br/>alarm and degrade to DB-only path]\n    Silent -->|Yes| OK[Cache populated]\n    classDef fast fill:#e6f4ea,stroke:#188038,color:#0d652d\n    classDef slow fill:#fff4e5,stroke:#cc7a00,color:#995500\n    classDef problem fill:#fee,stroke:#c33,color:#900\n    class Return1 fast\n    class Return2 slow\n    class Warn problem",
            "caption": "Cache aside HIT and MISS paths. HIT is a single Redis call (~1ms). MISS adds a DB fetch and a cache.set (~52ms). Silent set failures cause cascading misses.",
            "alt_text": "A flowchart of cache aside. App calls get_user(42), which calls cache.get. If hit, deserialize and return - 1ms total (HIT path). If miss, fetch from DB (50ms), then cache.set with TTL (1ms), then return - 52ms total (MISS path). If the cache.set fails silently (Redis down), next reads will also miss - alarm and degrade to DB-only path."
        }
    },
    {
        "type": "prose",
        "id": "write-invalidation-deep",
        "payload": {
            "text": "**Write invalidation — the order matters.** When the application updates the database, it must also update (or invalidate) the cache. The order of operations determines which failure modes you're exposed to:\n\n**Pattern 1: Update DB, then update cache.** If the cache update fails, the cache now holds stale data until TTL expires. Worst case: a write to the DB never propagates to the cache, and reads return the old value for the full TTL.\n\n**Pattern 2: Update DB, then invalidate cache (delete).** On the next read, the cache miss repopulates from the DB. If the delete fails, the cache holds stale data until TTL expires — same staleness window as Pattern 1, but the cache is empty (not stale) for the brief moment between DB update and delete.\n\n**Pattern 3 (BAD): Update cache, then update DB.** If the DB write fails after the cache was updated, the cache now holds data that doesn't exist in the DB. Reads will return 'successful' results for an operation that didn't actually happen. Never use this pattern.\n\n**Pattern 4 (BAD): Delete cache, then update DB.** Between the delete and the DB update, another read can MISS, fetch the OLD value from the DB, and write the OLD value back to the cache — overwriting the soon-to-be-updated value. The cache and DB diverge, and the cache stays stale until TTL expires. This is a classic race condition.\n\nThe consensus: use Pattern 2 (update DB first, then invalidate cache), and always set a TTL as a safety net for failed invalidations. The TTL bounds the maximum staleness window — even if invalidation fails, the cache will eventually expire and re-fetch from the DB."
        }
    },
    {
        "type": "mermaid",
        "id": "write-invalidation-seq",
        "payload": {
            "code": "sequenceDiagram\n    participant App\n    participant DB\n    participant Cache\n    Note over App: Pattern 2 - update DB then invalidate cache\n    App->>DB: UPDATE user SET bio='new' WHERE id=42\n    DB-->>App: OK (write committed)\n    App->>Cache: DEL 'user:42'\n    Cache-->>App: OK (1 key deleted)\n    Note over App,Cache: Cache now empty - next read will MISS and repopulate\n    Note over App,Cache: If DEL fails, TTL is the safety net:\n    Note over App,Cache: stale data served until TTL expires, then corrected\n    Note over App,Cache: ---\n    Note over App,Cache: Anti-pattern 4 - delete cache then update DB\n    App->>Cache: DEL 'user:42'\n    Note over App: Between DEL and DB UPDATE,\n    Note over App: a concurrent read can MISS,\n    Note over App: fetch OLD value from DB,\n    Note over App: and SET it back into cache.\n    App->>DB: UPDATE user SET bio='new' WHERE id=42\n    Note over Cache: Cache now holds OLD value\n    Note over Cache: written by the concurrent reader.\n    Note over Cache: DB has NEW value. Diverged!\n    Note over Cache: Stuck until TTL expires.",
            "caption": "Write invalidation sequence. Pattern 2 (update DB then DEL cache) is safe — failed deletes are bounded by TTL. Anti-pattern 4 (DEL cache then update DB) has a race condition: a concurrent read can repopulate the cache with the OLD value.",
            "alt_text": "A sequence diagram. Pattern 2: app updates DB first (committed), then deletes the cache key. Next read will miss and repopulate. If DEL fails, TTL is the safety net. Anti-pattern 4: app deletes the cache key first, then updates the DB. Between the delete and the DB update, a concurrent read can miss, fetch the OLD value from the DB, and SET it back into the cache. Now the cache holds the OLD value and the DB holds the NEW value — diverged, stuck until TTL expires."
        }
    },
    {
        "type": "prose",
        "id": "stampede-mitigation-comparison",
        "payload": {
            "text": "**Cache stampede mitigations, compared.** All three approaches reduce the thundering-herd problem; each has different trade-offs.\n\n| Mitigation | How it works | Pros | Cons |\n|------------|--------------|------|------|\n| **Cache lock** | First MISS acquires a lock; others wait. | Simple, DB sees 1 query. | Waiters pay extra latency (up to the DB query time). Lock holder is a single point of failure. |\n| **Probabilistic early expiration** | TTL = base + random(-jitter, +jitter). Misses spread over time instead of clustering. | No coordination needed; decentralized. | Some misses still happen, just spread out. Tuning the jitter is tricky. |\n| **Refresh-ahead** | Background job refreshes popular items before expiry. | Users never see a miss for popular items. | Wastes work refreshing items that may not be read. |\n\nThe production choice depends on the workload:\n- **Hot key with predictable traffic** (home page, top product): refresh-ahead — zero misses, low latency, worth the wasted refresh.\n- **Many keys with spiky access** (user profiles): probabilistic early expiration — cheap, scales, requires no coordination.\n- **One-off expensive query** (rare but slow): cache lock — keep the DB safe, accept the waiter latency.\n\nIn practice, most teams combine: refresh-ahead for the top-N hottest keys, probabilistic jitter for the long tail, and cache locking as the last-resort safety net on the rarest, most expensive queries. Netflix, Facebook, and Twitter all use combinations of these techniques."
        }
    },
    {
        "type": "code",
        "id": "redis-stampede-code",
        "payload": {
            "language": "python",
            "code": "import redis\nimport json\nimport time\nimport uuid\n\nr = redis.Redis(...)\n\n# Cache-aside with stampede protection via SET NX (lock)\n\ndef get_user(user_id):\n    key = f'user:{user_id}'\n    lock_key = f'lock:{key}'\n\n    # 1. Fast path: cache HIT\n    cached = r.get(key)\n    if cached:\n        return json.loads(cached)\n\n    # 2. MISS - try to acquire a lock with NX (only one wins)\n    #    Others wait and retry the cache read.\n    lock_token = str(uuid.uuid4())\n    acquired = r.set(lock_key, lock_token, nx=True, ex=10)  # 10s TTL on the lock\n\n    if not acquired:\n        # Another request is fetching - wait and retry cache\n        for _ in range(20):\n            time.sleep(0.05)  # 50ms\n            cached = r.get(key)\n            if cached:\n                return json.loads(cached)\n        # Lock held too long - fall through to DB as a safety net\n\n    try:\n        # 3. Cache MISS path: fetch from DB (the slow part)\n        user = db.fetch_user(user_id)\n\n        # 4. Populate cache with TTL (safety net for failed invalidation)\n        #    Add +/- 30s jitter to spread out future expiries (stampede mitigation)\n        jitter = random.randint(-30, 30)\n        r.set(key, json.dumps(user), ex=300 + jitter)\n        return user\n    finally:\n        # 5. Release the lock - only if we still hold it (use Lua for atomic check-and-del)\n        r.eval(\n            'if redis.call(\"get\", KEYS[1]) == ARGV[1] then '\n            '  return redis.call(\"del\", KEYS[1]) '\n            'else return 0 end',\n            1, lock_key, lock_token\n        )\n\ndef update_user(user_id, data):\n    # Pattern 2: update DB first, then invalidate cache\n    db.update_user(user_id, data)\n    r.delete(f'user:{user_id}')  # if this fails, TTL is the safety net",
            "caption": "Production cache-aside in Python with stampede protection (cache lock + TTL jitter) and safe write invalidation (DB first, then delete)."
        }
    },
    {
        "type": "callout",
        "id": "t-debounce-key",
        "payload": {
            "title": "Key design matters as much as TTL",
            "body": "A subtle cache-aside bug: cache key choice. If you cache by `user_id` only, all reads of a user share one entry — fine. But if you cache `user:42:with_orders` (a join of user + their orders) under the same `user:42` key as the basic profile, an order update invalidates the basic profile too — unnecessary. Use specific keys per shape of data: `user:{id}`, `user:{id}:with_orders`, `user:{id}:permissions`. On write, invalidate only the keys whose shape changed. Netflix's EVCache uses a versioned key scheme: `user:{id}:v{schema_version}` — bumping the version invalidates the whole shape atomically. The lesson: cache key design is a schema decision, not an afterthought. Plan your cache keys like you plan your database schema.",
            "kind": "tip"
        }
    },
    {
        "type": "quiz",
        "id": "q-write-order-race",
        "payload": {
            "question": "Your team implements cache invalidation as: `cache.delete(key); db.update(...)`. The code review flags it as a race condition. Why?",
            "shape": "mcq",
            "options": [
                "It's not a race — delete before update is fine because the cache will repopulate.",
                "Between the cache.delete and the db.update, a concurrent read can MISS, fetch the OLD value from the DB, and SET it back into the cache — overwriting the new value the db.update is about to write. Cache and DB diverge until TTL expires.",
                "The race is that the DB update might fail and the cache is already deleted.",
                "There's no race condition — delete-then-update is the standard pattern."
            ],
            "answer_index": 1,
            "rationale": "This is the classic cache-aside race condition. Sequence: (1) App A calls cache.delete(key) — cache is now empty. (2) Before App A calls db.update, App B reads: cache MISS, fetches OLD value from DB, calls cache.set(key, OLD_VALUE). (3) App A calls db.update — DB now has NEW value. (4) The cache now holds OLD_VALUE (set by App B in step 2), the DB holds NEW_VALUE — they diverged. Subsequent reads return the OLD value until TTL expires. The fix: reverse the order — update DB first, then delete cache. Pattern 2 (update DB, then delete cache) avoids this race because there's no window where a MISS could repopulate the cache with stale data. The window between db.update and cache.delete is a 'stale read window' (reads may return the OLD cached value briefly), but it self-corrects on the delete. Option 2 is incorrect because the DB update failing is a different problem (transactional integrity, not cache coherence). Option 4 is wrong — delete-then-update is explicitly an anti-pattern.",
            "difficulty": "interview"
        }
    },
    {
        "type": "scenario",
        "id": "scenario-stale-bio",
        "payload": {
            "prompt": "A user updates their profile bio. They refresh the page 2 seconds later and still see the old bio. They refresh again 10 seconds later — old bio. They refresh at 60 seconds — finally the new bio appears. Your code does: `db.update(...); cache.delete(key)` with TTL=300s. Diagnose.",
            "context": "The cache.delete call appears in your logs as successful. Redis is healthy. The DB write is committed.",
            "options": [
                {
                    "id": "a",
                    "text": "The cache.delete failed silently — Redis is dropping some commands.",
                    "outcome": "Unlikely if Redis is healthy and other deletes work. But check by adding a GET after the DELETE in code.",
                    "correct": False
                },
                {
                    "id": "b",
                    "text": "There's a race condition: another reader fetched the OLD value between the db.update and the cache.delete, and repopulated the cache with OLD data. The TTL (300s) means stale data is served for up to 5 minutes.",
                    "outcome": "Possible but unlikely — the window between db.update and cache.delete is microseconds, very few reads would land in it.",
                    "correct": False
                },
                {
                    "id": "c",
                    "text": "There's a multi-layer cache hierarchy. The browser, CDN, app-server in-process cache, and Redis all cached the OLD bio. The cache.delete only cleared Redis. The CDN or browser is serving the stale version.",
                    "outcome": "Correct — a single cache.delete only clears one layer. The CDN may have cached the bio response with its own TTL. The browser may have cached the page. Without Cache-Control headers and CDN purges, stale data persists at every layer.",
                    "correct": True
                },
                {
                    "id": "d",
                    "text": "The DB replication lag is high — the read replica doesn't yet have the new bio.",
                    "outcome": "Possible but the 60-seconds-then-it-works pattern doesn't match typical replication lag (usually <1s).",
                    "correct": False
                }
            ],
            "rationale": "The pattern — stale for ~60s, then suddenly fresh — is the signature of a multi-layer cache hierarchy. The 60-second mark likely corresponds to the TTL of an intermediate cache (CDN, browser, or app-server cache). The cache.delete only cleared Redis; the intermediate layer is still serving the old response until its own TTL expires. The fix is two-fold: (1) issue a CDN purge (or use cache-busting URLs with version hashes) so the CDN drops the stale response immediately; (2) set appropriate Cache-Control headers on the response (e.g., `Cache-Control: no-cache` for user-specific pages, `max-age=60` for public pages) so each layer knows how long to cache. The broader lesson: in a multi-layer cache, a single invalidation is insufficient. You need a coordinated invalidation strategy (or accept multi-layer staleness). Production systems use Cache-Control headers + CDN purge APIs + versioned asset URLs to keep all layers in sync. Option A (silent Redis failure) is unlikely if other deletes work and Redis is healthy. Option B (the race condition from anti-pattern 4) is possible but the timing would be much rarer and wouldn't produce the consistent ~60s pattern. Option D (replication lag) is usually sub-second in modern databases and doesn't match the 60s pattern.",
            "difficulty": "interview"
        }
    }
]

CA_SOURCES = [
    {"title": "Redis Documentation — Cache Pattern (Cache-Aside / Lazy Loading)", "url": "https://redis.io/docs/manual/patterns/cache/", "publisher": "Redis", "type": "official-doc"},
    {"title": "Wikipedia — Cache Invalidation Patterns", "url": "https://en.wikipedia.org/wiki/Cache_invalidation", "publisher": "Wikipedia", "type": "encyclopedia"},
    {"title": "Netflix Tech Blog — EVCache: Distributed Caching at Netflix", "url": "https://netflixtechblog.com/distributed-caching-with-evcache-2bf652d6a5bf", "publisher": "Netflix Technology Blog", "type": "blog"},
    {"title": "Marc Brooker (AWS) — Cache Stampede Prevention", "url": "https://brooker.co.za/blog/2012/09/16/cache.html", "publisher": "Marc Brooker's Blog", "type": "blog"}
]


# ──────────────────────────────────────────────────────────────────────
# Apply
# ──────────────────────────────────────────────────────────────────────

UPDATES = [
    ("how-the-internet-works", HOW_INTERNET_NEW_BLOCKS, HOW_INTERNET_SOURCES),
    ("dns",                   DNS_NEW_BLOCKS,         DNS_SOURCES),
    ("http",                  HTTP_NEW_BLOCKS,         HTTP_SOURCES),
    ("tcp",                   TCP_NEW_BLOCKS,          TCP_SOURCES),
    ("latency-vs-throughput", LAT_NEW_BLOCKS,          LAT_SOURCES),
    ("performance-vs-scalability", PVS_NEW_BLOCKS,     PVS_SOURCES),
    ("availability-vs-consistency", AVC_NEW_BLOCKS,     AVC_SOURCES),
    ("cap-theorem",           CAP_NEW_BLOCKS,          CAP_SOURCES),
    ("caching-strategies",    CS_NEW_BLOCKS,           CS_SOURCES),
    ("cache-aside",           CA_NEW_BLOCKS,            CA_SOURCES),
]


def enrich(slug: str, new_blocks: list, sources: list) -> tuple[int, int]:
    path = CONCEPTS_DIR / f"{slug}.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_ids = {b.get("id") for b in data.get("blocks", [])}
    added = 0
    for block in new_blocks:
        if block["id"] in existing_ids:
            print(f"  [{slug}] SKIP duplicate block id: {block['id']}")
            continue
        data["blocks"].append(block)
        added += 1
        existing_ids.add(block["id"])

    if "sources" not in data:
        data["sources"] = sources
    else:
        # merge by url
        existing_urls = {s["url"] for s in data["sources"]}
        for src in sources:
            if src["url"] not in existing_urls:
                data["sources"].append(src)
                existing_urls.add(src["url"])

    # Write back with stable formatting
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return added, len(data["sources"])


def main() -> int:
    total_blocks_added = 0
    total_sources = 0
    for slug, blocks, sources in UPDATES:
        added, src_count = enrich(slug, blocks, sources)
        total_blocks_added += added
        total_sources += src_count
        print(f"  [{slug}] +{added} blocks, sources={src_count}")
    print(f"\nTOTAL: +{total_blocks_added} blocks added across {len(UPDATES)} concepts.")
    print(f"TOTAL: {total_sources} sources across all concepts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
