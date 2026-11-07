# Mock Django backend

Zero-dependency deterministic backend for SSR/e2e tests.

Run: `MOCK_BACKEND_PORT=8765 MOCK_FLAGS_OFF=shop,programming node e2e/mock-backend/server.mjs`

- `MOCK_BACKEND_PORT` (default 8765); `MOCK_FLAGS_OFF` comma list of `/v1/settings/` flags forced to false.
- Endpoints: `/v1/{profile,background,settings,categories,tags,projects,shop/products,travel-highlights}/`,
  `/v1/astroimages/[latest/|<slug>/]`, `/v1/travel/poland/krakow/2024-05-10/`, `POST /v1/contact/`,
  `/image-urls/[<slug>/]`, `/image-files/<slug>/serve/` (PNG), `/media/*`.
- Slugs: orion-nebula, andromeda-galaxy, milky-way-arch. Unknown -> 404 `{"detail":"Not found."}`.
- Text is pl/en via `?lang=`, else `i18next` cookie, else Accept-Language. Every request is logged to stdout.
