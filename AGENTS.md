<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

- Shopify owns catalog/cart/checkout/orders. The Prisma DB only holds store operations data.
- All storefront commerce calls go through `src/lib/commerce` (`commerce` picks Shopify or the demo provider). Don't call Shopify from components directly.
- Every admin page and server action must call `requireUser()`; `src/proxy.ts` is only an optimistic redirect.
- String "enum" columns are validated with the lists in `src/lib/constants.ts` (schema must stay SQLite + PostgreSQL compatible).
- Before pushing: `npm run lint && npm run typecheck && npm test && npm run build`.
