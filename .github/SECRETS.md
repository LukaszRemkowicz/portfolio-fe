# GitHub Secrets

## Currently needed
- `ADD_TO_PROJECT_PAT` (secret) - PAT with Projects read/write + Issues read, used by `add-issues-to-project.yml`.
- `ADD_TO_PROJECT_URL` (repo variable) - GitHub Project board URL (not the repo URL).
- `GITHUB_TOKEN` - provided automatically (CI, CodeQL, Trivy SARIF upload, release tags).

Shared workflows in `LukaszRemkowicz/ci-cd` need no other secrets. PR CI uses no Cloudflare credentials:
`wrangler deploy --dry-run` runs offline.

## Production deploy (`release.yml`)
Merging a new `package.json` version to `main` tags `v<version>` and deploys the `portfolio-fe-production` Worker.
- `CLOUDFLARE_API_TOKEN` (secret) - API token with Account > Workers Scripts > Edit.
- `CLOUDFLARE_ACCOUNT_ID` (repo variable) - Cloudflare account id.
- `PROJECT_OWNER` (repo variable) - build-time only (PWA manifest name).

Runtime config lives in Cloudflare on each Worker, not in GitHub: set once as Worker secrets
(survive deploys): `SITE_DOMAIN`, `API_URL`, `SSR_API_URL`, `GA_TRACKING_ID`, `ENABLE_GA`,
`SENTRY_DSN_FE`, `PROJECT_OWNER`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`
(source values: Doppler `portfolio/prd`). `ENVIRONMENT` comes from `wrangler.jsonc`.

## Branch model
`feat/* -> dev -> main`; `hotfix/*` and `release/*` may target `main`. Bump the `version` in
`package.json`; merging to `main` tags `v<version>` and deploys production.
