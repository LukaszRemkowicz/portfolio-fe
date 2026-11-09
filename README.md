# Portfolio Frontend

React 18 + TypeScript app in React Router 7 framework mode (SSR) running on Cloudflare Workers. It renders the public site, serves a small BFF under `/app/*` for browser JSON flows, and proxies to the Django backend.

## Stack

React Router 7 (framework mode), Vite, `@cloudflare/vite-plugin` + Wrangler, TanStack Query, Axios, i18next, CSS Modules, Sentry, `vite-plugin-pwa`, Jest, Playwright.

## Layout

- `src/routes.ts` - route table; `src/routes/*` - route modules (loaders, `meta`, components)
- `src/root.tsx` - document shell, root loader (public env, SEO defaults, language)
- `src/entry.server.tsx` / `src/entry.client.tsx` - SSR render and hydration
- `workers/app.ts` - Worker entry (request id, env wiring, error logging)
- `src/server/bff/*` - BFF routes, validation, media normalization, backend proxy; `src/server/logging.ts` - JSON logs
- `src/utils/publicEnv.ts` - public env contract (window, `process.env`, Vite env)
- `src/seo/buildMeta.ts` - meta tags; `robots.txt` is a resource route (`src/routes/robots.ts`)
- `wrangler.jsonc` - Worker config with `staging` and `production` envs
- `docs/ssr-client-only-boundaries.md` - what must stay out of the SSR path

## Configuration

Copy `.dev.vars.example` to `.dev.vars` (gitignored) for local values. Main variables: `SITE_DOMAIN`, `API_URL` (public), `SSR_API_URL` (Worker to backend), `PROJECT_OWNER`, `GA_TRACKING_ID`, `ENABLE_GA`, `SENTRY_DSN_FE`, `ENVIRONMENT`. Deploy-time values come from Doppler; no routes are declared in `wrangler.jsonc`.

### Backend access (Cloudflare Tunnel)

The Worker reaches Django like the old in-network frontend did, through a Cloudflare Tunnel: the `cloudflared` service in the portfolio repo compose files forwards `https://<tunnel host>` to `http://be:8000`. The tunnel host is protected by Cloudflare Access; the Worker sends its service token on every backend call (BFF and SSR loaders) from the secrets `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`, together with the visitor IP (`X-Real-IP`) so Django throttles per visitor. Set `SSR_API_URL` to the tunnel host.

`MEDIA_ORIGIN` (optional) is for test deploys without an origin route, e.g. `*.workers.dev`: the Worker then serves `/media/*` and full-size images (`/app/image-files/*`, served by nginx via X-Accel) from that origin. Leave it unset in production, where Workers routes send both to the VPS.

## Commands

```bash
npm run dev            # react-router dev
npm run build          # type-check + react-router build
npm run preview        # build + vite preview
npm run deploy:dry-run # wrangler deploy --dry-run (after build)
CLOUDFLARE_ENV=staging npm run build   # or production; bakes the env into the build
```

## Tests

```bash
npm run type-check && npm run lint && npm run format:check
npm test                 # Jest
npx playwright test      # builds, starts mock backend (e2e/mock-backend) + preview
```

Tip: `PLAYWRIGHT_CHANNEL=chrome npx playwright test` uses the installed Chrome. Install the bundled browser with `npx playwright install chromium`.

## Versioning and CI

`VERSION` and `package.json` `version` must match (checked in CI). `.github/workflows/ci-cd.yml` runs lint/format/type-check, Jest with coverage, Playwright e2e, staging and production build + `wrangler deploy --dry-run`, Trivy and `audit-ci`. `.github/workflows/release.yml`: a new `VERSION` merged to `main` is tagged `v<VERSION>` and deployed to the `portfolio-fe-production` Worker (needs `CLOUDFLARE_API_TOKEN`, see `.github/SECRETS.md`).

## Public routes

`/`, `/astrophotography`, `/astrophotography/:slug`, `/travel/:country/:place/:date`, `/privacy`, `/shop` and `/programming` (both feature-flagged; disabled means 404), `/health`, `/robots.txt`. `/app/*` is BFF transport, not a website route.
