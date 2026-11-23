# Portfolio Frontend

React 18 + TypeScript app in React Router 7 framework mode (SSR) running on Cloudflare Workers. It renders the public site, serves a small BFF under `/app/*` for browser JSON flows, and proxies to the API (Supabase Edge Function).

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

### Backend access (Supabase Edge Function)

The Worker calls the Supabase Edge Function API (BFF and SSR loaders). Set `SSR_API_URL` to the function URL and the Worker secret `API_ORIGIN_SECRET`, which is sent as `X-Origin-Secret`, together with the visitor IP (`X-Real-IP`, `X-Visitor-IP`) so the API throttles per visitor. There is no tunnel or Cloudflare Access path anymore.

`MEDIA_ORIGIN` (optional) makes the Worker serve `/media/*` from that origin; used locally (Django) and on test deploys without an origin route, e.g. `*.workers.dev`. Leave it unset in production.

### Local dev

By default `.dev.vars.example` points `SSR_API_URL` at the e2e mock backend. To run against the real local API, start the Edge Function from the backend repo (`infra/scripts/run_local_api.sh`, port 8001) and Django for media (port 8000), then set in `.dev.vars`:

```
SSR_API_URL=http://localhost:8001
API_ORIGIN_SECRET=local-dev-secret
MEDIA_ORIGIN=http://localhost:8000
```

`docker compose up -d fe` runs the dev server in Docker on http://localhost:8080 with the same values via `docker/dev.vars` (`host.docker.internal` instead of `localhost`). `node_modules` lives in a Docker volume (Linux binaries); `npm ci` reruns when `package-lock.json` changes.

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

The version lives only in `package.json`. `.github/workflows/ci-cd.yml` runs lint/format/type-check, Jest with coverage, Playwright e2e, staging and production build + `wrangler deploy --dry-run`, Trivy and `audit-ci`. `.github/workflows/release.yml`: a new `package.json` version merged to `main` is tagged `v<version>` and deployed to the `portfolio-fe-production` Worker (needs `CLOUDFLARE_API_TOKEN`, see `.github/SECRETS.md`).

## Security headers and CSP

- `workers/app.ts` adds HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` to every Worker response (`src/server/securityHeaders.ts`; existing headers are kept). `public/_headers` has the same set for static assets.
- HTML responses also get a per-request-nonce CSP (`src/server/csp.ts`, set in `src/entry.server.tsx`). Default is `Content-Security-Policy-Report-Only`; set `CSP_MODE=enforce` (Worker var) to send `Content-Security-Policy`. GA hosts are allowed only when `ENABLE_GA=true` and `GA_TRACKING_ID` is set.
- With a valid `SENTRY_DSN_FE`, violations go to Sentry (`report-uri` + `report-to csp-endpoint` + `Reporting-Endpoints`) and the Sentry origin is added to `connect-src`.
- Production and the `supabase` test env set `CSP_MODE=enforce` in `wrangler.jsonc`; local and staging stay Report-Only. New hosts must be added to `buildCsp`; `e2e/csp.spec.ts` runs the preview in enforce mode and fails on any violation. `react-zoom-pan-pinch` injects a `<style>` without a nonce option, so `vite.config.ts` patches it to carry the page nonce.

## Public routes

`/`, `/astrophotography`, `/astrophotography/:slug`, `/travel/:country/:place/:date`, `/privacy`, `/shop` and `/programming` (both feature-flagged; disabled means 404), `/health`, `/robots.txt`. `/app/*` is BFF transport, not a website route.
