# Security Notes

## Dependency pinning

NO CAP pins the Excalidraw Mermaid conversion dependency to `2.2.2` and the Mermaid parser to `1.2.0`. Excalidraw 0.18.1 is retained because it contains the vendor security fix for the Mermaid-to-Excalidraw XSS issue.

The project also pins `nanoid` to `5.1.16` or newer. Version 5.1.16 contains the fix for the negative-size infinite-loop issue documented as CVE-2026-67214.

`lodash-es` is constrained to `4.18.0` or newer by npm overrides so an older transitive copy is not selected when the package graph is re-resolved.

## Installation policy

Use a fresh dependency resolution from `package.json` and do not run `npm audit fix --force`. Forced fixes can downgrade Excalidraw or introduce incompatible dependency combinations.

Recommended verification:

```bash
npm install
npm audit
npm run type-check
npm run build
npm run content:validate
```

The security pins are based on the currently published patched package versions and are intentionally kept explicit so a clean install reproduces the same dependency policy.
