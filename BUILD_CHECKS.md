# NO CAP — Build Verification

## Verified in this environment

- Content validation: **PASS** — 144 concepts, 0 warnings
- Content report: **PASS** — 144 published; 329 Mermaid blocks; 144 images; 15 videos; 144 simulations; 147 code blocks; 154 scenarios; 1,047 source references
- TypeScript/TSX syntax parse: **PASS** — 84 source files parsed, 0 parser failures
- Cloudflare Worker source syntax: **PASS** — `node --check worker/src/index.js`
- `package.json` syntax: **PASS**
- Mermaid structural checks: **PASS** — 329 blocks checked; 0 legacy token-per-word diagrams; no multiline node-label syntax detected
- ZIP integrity: verified after packaging

## Not run here

A full `npm run type-check` / `npm run build` could not be completed in this environment because dependency installation timed out while resolving the project packages. The repository is packaged without `node_modules`; run `npm install` followed by the commands below on your development machine.

```bash
npm install
npm run type-check
npm run content:validate
npm run build
npm run dev
```

For deployment:

```bash
npx wrangler login
cd worker
npx wrangler d1 create nocap
npx wrangler d1 migrations apply nocap --remote
npx wrangler deploy
```

Then connect the frontend to Cloudflare Pages and follow `SETUP_GUIDE.md`.
