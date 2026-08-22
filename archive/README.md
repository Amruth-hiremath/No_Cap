# Archive

This directory holds legacy/stale files kept for traceability. None of these files are referenced by the live build. Do not import from here.

## Contents

- `REPAIR_DIRECTIVE.md` — Stale master project brief (2430 lines, historical context only).
- `worker-legacy/` — Pre-JS Worker artefacts (Python implementation, manifest, version pin, README). The deployed Worker is `worker/src/index.js` and is configured by `worker/wrangler.toml`. These Python files are NOT deployed and would regress OAuth if ever resurrected (see `scripts/auth-audit-report.md`).
