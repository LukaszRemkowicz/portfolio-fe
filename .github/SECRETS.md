# GitHub Secrets

## Currently needed
- `ADD_TO_PROJECT_PAT` (secret) - PAT with Projects read/write + Issues read, used by `add-issues-to-project.yml`.
- `ADD_TO_PROJECT_URL` (repo variable) - GitHub Project board URL (not the repo URL).
- `GITHUB_TOKEN` - provided automatically (CI, CodeQL, Trivy SARIF upload, release tags).

Shared workflows in `LukaszRemkowicz/ci-cd` need no other secrets. CI uses no Cloudflare credentials:
`wrangler deploy --dry-run` runs offline.

## Future deploy (not wired)
No deploy workflow exists yet; added in a separate cutover task.
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` - Workers deploy credentials.
- Per-environment vars from Doppler (`wrangler.jsonc` `env.*.vars` only sets `ENVIRONMENT`):
  `ENVIRONMENT`, `SITE_DOMAIN`, `API_URL`, `SSR_API_URL`, `GA_TRACKING_ID`, `ENABLE_GA`,
  `SENTRY_DSN_FE`, `PROJECT_OWNER`.
- Cloudflare Access service-token credentials (client id + secret) for Worker -> origin calls.

## Branch model
`feat/* -> dev -> main`; `hotfix/*` and `release/*` may target `main`. Bump `VERSION` and
`package.json` together (CI enforces equality); merging to `main` tags `v<VERSION>`.
