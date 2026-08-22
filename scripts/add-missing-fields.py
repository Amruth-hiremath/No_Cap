#!/usr/bin/env python3
"""Add missing required fields to concept JSON files."""
import json, os

CONTENT_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'concepts')

# Summaries and why_it_matters for each concept
additions = {
    'how-the-internet-works': {
        'summary': 'The internet is a network of networks. Your device does not connect directly to a server — it goes through routers, ISPs, DNS resolvers, CDNs, and finally the origin. Understanding this chain is the foundation for every system-design decision.',
        'why_it_matters': 'Every system-design decision — where to cache, what to replicate, why latency varies, why TLS matters — depends on understanding the path a request takes from browser to origin and back.',
    },
    'dns': {
        'summary': 'DNS is the phonebook of the internet. Humans remember example.com; routers need 93.184.216.34. DNS bridges this gap with a hierarchical, distributed, eventually-consistent database.',
        'why_it_matters': 'DNS is one of the most common single points of failure in real outages. If your DNS is down, no one can find you, no matter how healthy your servers are.',
    },
    'load-balancing': {
        'summary': 'A load balancer sits in front of a pool of backend servers, distributing incoming requests across them. It enables horizontal scaling, fault tolerance, and rolling deploys.',
        'why_it_matters': 'A single server cannot handle meaningful traffic, cannot survive hardware failure, and cannot scale beyond one machine. Load balancing solves all three.',
    },
    'caching': {
        'summary': 'Cache aside (lazy loading) is the most common caching strategy. The application checks the cache first; on a miss, it fetches from the source, writes to the cache with a TTL, and returns.',
        'why_it_matters': 'Most real workloads are read-heavy. The database can serve these reads, but every read costs CPU, I/O, and latency. Caching stores the result of an expensive operation in faster storage.',
    },
    'cap-theorem': {
        'summary': 'CAP is the most quoted — and most misunderstood — theorem in distributed systems. A distributed system can provide at most two of three guarantees: Consistency, Availability, Partition tolerance.',
        'why_it_matters': 'Because partitions are inevitable on real networks, the real choice is between consistency and availability when a partition occurs. This trade-off shapes every distributed database design.',
    },
}

for slug, fields in additions.items():
    fpath = os.path.join(CONTENT_DIR, f'{slug}.json')
    with open(fpath) as f:
        data = json.load(f)

    for key, val in fields.items():
        if key not in data:
            data[key] = val
            print(f'  Added {key} to {slug}')

    # Add failure_modes if missing
    if 'failure_modes' not in data:
        failure_map = {
            'how-the-internet-works': [
                'A single router failure can blackhole traffic until BGP converges (minutes).',
                'DNS cache poisoning can redirect users to attacker-controlled servers.',
                'TLS interception by middleboxes can break certificate pinning.',
            ],
            'dns': [
                'Authoritative nameserver outage — your domain becomes unreachable globally.',
                'DNS cache poisoning — users redirected to malicious IPs.',
                'TTL too long — a misconfigured record takes hours to undo globally.',
            ],
            'load-balancing': [
                'LB itself becomes SPOF without active-active redundancy.',
                'Sticky sessions prevent failover — if a backend dies, its users lose their session.',
                'Health check too slow — dead backends keep receiving traffic until LB notices.',
            ],
            'caching': [
                'Cache stampede — popular key expires, 1000 requests miss simultaneously, hammering the DB.',
                'Stale data — invalidation fails, users see old data until TTL expires.',
                'Cache thundering herd — warm cache after cold restart overwhelms origin.',
            ],
            'cap-theorem': [
                'Split-brain — network partition causes two primaries, divergent writes, data loss on heal.',
                'Stale reads — AP system serves outdated data that violates business invariants.',
                'Write unavailability — CP system rejects writes during partition, blocking users.',
            ],
        }
        data['failure_modes'] = failure_map.get(slug, [])
        print(f'  Added failure_modes to {slug}')

    # Add real_system_mappings if missing
    if 'real_system_mappings' not in data:
        mappings = {
            'how-the-internet-works': [
                {'system': 'Cloudflare', 'how': 'Operates one of the largest edge networks, intercepting requests at 300+ cities worldwide before they reach origin.'},
                {'system': 'AWS VPC', 'how': 'Isolates your servers in a virtual network with custom routing tables and security groups.'},
            ],
            'dns': [
                {'system': 'Cloudflare DNS', 'how': '1.1.1.1 public resolver with sub-10ms global anycast. Authoritative + recursive in one platform.'},
                {'system': 'AWS Route 53', 'how': 'Managed DNS with weighted routing, health checks, and failover policies.'},
            ],
            'load-balancing': [
                {'system': 'AWS ALB', 'how': 'L7 load balancer with path-based routing, TLS termination, and target group health checks.'},
                {'system': 'NGINX', 'how': 'Self-hosted L7 LB with least-connections, IP hash, and weighted round-robin algorithms.'},
            ],
            'caching': [
                {'system': 'Netflix', 'how': 'Multi-tier caching: CDN edge → origin cache (EVCache) → database. 90%+ of reads served from cache.'},
                {'system': 'Redis / Memcached', 'how': 'In-memory key-value stores implementing cache aside with TTL and LRU eviction.'},
            ],
            'cap-theorem': [
                {'system': 'Cassandra', 'how': 'AP system — accepts writes on any reachable node, reconciles via read-repair and anti-entropy.'},
                {'system': 'Google Spanner', 'how': 'CP system — synchronous replication with Paxos consensus, rejects writes during partition.'},
            ],
        }
        data['real_system_mappings'] = mappings.get(slug, [])
        print(f'  Added real_system_mappings to {slug}')

    with open(fpath, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

print('Done.')
