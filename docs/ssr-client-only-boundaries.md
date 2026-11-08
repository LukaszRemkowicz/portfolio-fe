# SSR Client-Only Boundary Inventory

> Components and modules that must **never** be imported in the SSR render path
> (`src/entry.server.tsx`, `src/root.tsx`, route loaders and any module they import).

---

## Language Contract For SSR

Language resolution on the server (`getRequestLanguage` in `src/utils/requestMeta.ts`):

1. `i18next` cookie
2. `Accept-Language` request header
3. Falls back to `'en'`

**Supported languages:** `en`, `pl`. The server i18n instance comes from `createServerI18n()` in `src/i18n.server.ts`.

---

## Client-Only Modules (Must Never Be Imported On Server)

| File                              | Reason                                                |
| --------------------------------- | ----------------------------------------------------- |
| `src/i18n.client.ts`              | `LanguageDetector` reads `localStorage` + `navigator` |
| `src/utils/initClientServices.ts` | Sentry `window` listeners + SW unregister             |
| `src/utils/analytics.ts`          | `window.gtag`, `document.head`, `localStorage`        |
| `src/hooks/useGoogleAnalytics.ts` | calls `loadGoogleAnalytics`                           |

---

## Client-Only Components (Wrapped In `<ClientOnly>` Or Mounted Client-Side)

| Component            | Reason                                            |
| -------------------- | ------------------------------------------------- |
| `StarBackground.tsx` | canvas / `requestAnimationFrame`                  |
| `ShootingStars.tsx`  | canvas animation                                  |
| `CookieConsent.tsx`  | `localStorage`, `setTimeout`                      |
| `ScrollToHash.tsx`   | `window.location.hash`, `document.getElementById` |

---

## SSR-Safe Shared Modules

| File                     | Status                                            |
| ------------------------ | ------------------------------------------------- |
| `src/utils/publicEnv.ts` | Safe, guards `window`/`process` access            |
| `src/api/api.ts`         | Safe, `setLanguageGetter` pattern, no i18n import |
| `src/api/constants.ts`   | Safe, uses `getEnv` and `publicEnv`               |
| `src/api/services.ts`    | Safe, no browser globals (uses `api.ts`)          |
| `src/api/routes.ts`      | Safe, constants only                              |
| `src/i18n.server.ts`     | Safe, server-only factory                         |
| `src/server/logging.ts`  | Safe, console JSON logs                           |
