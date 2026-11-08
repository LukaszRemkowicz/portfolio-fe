# AGENTS.md

Repo-level first-stop guide for agents working on the portfolio frontend.

## Hard Rules

- Do not commit or push without explicit user permission.
- Never deploy (no `wrangler deploy` without `--dry-run`).
- Do not change BFF/API contracts (`/app/*`, backend `/v1/*` usage) or SEO output (meta, canonical, robots, sitemap links) without agreement.
- Keep `VERSION` and `package.json` `version` identical when bumping.

## Architecture

- React Router 7 framework mode on Cloudflare Workers; no Node server.
- `src/routes.ts` route table, `src/routes/*` route modules (loader + `meta`).
- `src/root.tsx` document shell and root loader; `src/entry.server.tsx`, `src/entry.client.tsx`.
- `workers/app.ts` Worker entry; `src/server/bff/*` BFF (`/app/*`) and backend proxy.
- `src/utils/publicEnv.ts` public env; `src/seo/buildMeta.ts` meta; `src/server/logging.ts` logs.
- `wrangler.jsonc` has `staging` and `production` envs; build with `CLOUDFLARE_ENV=<env>`.
- SSR vs client-only rules: `docs/ssr-client-only-boundaries.md`.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run format:check`
- `npm test`
- `CI=1 npx playwright test` (add `PLAYWRIGHT_CHANNEL=chrome` to use local Chrome)
- `npm run build && npm run deploy:dry-run` for Worker size/bundle checks.

## Notes

- Don't kill processes you did not start; other Workers may run on port 9229.
