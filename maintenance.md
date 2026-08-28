# Dependency Maintenance Log — georecorregut

**Date:** 2026-08-28
**Branch:** `chore/dependency-update`
**Context:** First maintenance pass after several months of no updates. Environment: Node v22 (project-pinned via `.node-version`, machine default v24 managed via `fnm`), npm 11.6.2, Firebase CLI 15.25.1.

---

## Environment notes

- **Node version:** Project requires Node 22 (`nextn` and `firebase-frameworks` both cap engine support there). Machine default is Node 24, managed per-project via `fnm` + `.node-version` file.
- **Registry workaround:** Corporate Microsoft Defender Network Protection intermittently blocks TLS handshakes to `registry.npmjs.org` (`ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE`). Not a rate-limit/burst issue — confirmed via isolated single-package requests still failing. **Workaround in place:** npm registry temporarily pointed at `https://registry.npmmirror.com` for this maintenance session.
  - Revert when done: `npm config set registry https://registry.npmjs.org/`
- **npm config adjustments kept:**
  ```
  fetch-retries = 5
  fetch-retry-factor = 10
  fetch-retry-maxtimeout = 120000
  fetch-retry-mintimeout = 20000
  ```
  These are safe permanent defaults (only add delay on genuine failures).

---

## ✅ Completed updates

| Package                             | From     | To                      | Notes                                                        |
| ----------------------------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `@types/node`                       | 20.19.43 | latest                  | dev tooling                                                  |
| `eslint`                            | 9.34.0   | 9.39.4                  | held on 9.x line — see deferred `eslint-config-next` pairing |
| `dotenv`                            | 16.6.1   | latest                  |                                                              |
| `zod`                               | 3.25.76  | latest 3.x (held)       | see Blocked section — do NOT bump to v4                      |
| `@hookform/resolvers`               | 4.1.3    | latest                  | supports zod ^3 and ^4, no conflict                          |
| `lucide-react`                      | 0.475.0  | latest                  |                                                              |
| `@opentelemetry/winston-transport`  | 0.14.1   | latest                  |                                                              |
| `@emnapi/wasi-threads`              | 1.2.3    | latest                  |                                                              |
| `genkit-cli`                        | 0.0.2    | latest                  | was badly stale, dev-only CLI tool                           |
| `firebase` (client SDK)             | 11.10.0  | 12.18.0                 | manually tested via emulator: auth + Firestore OK            |
| `firebase-admin`                    | 13.10.0  | **held at latest 13.x** | see Blocked section — do NOT bump to v14                     |
| `react` / `react-dom`               | 18.3.1   | 19.2.8                  | full migration, see below                                    |
| `@types/react` / `@types/react-dom` | 18.3.x   | 19.x                    | paired with React 19                                         |
| `recharts`                          | 2.15.4   | 3.x                     | clean build, no warnings                                     |
| `date-fns`                          | 3.6.0    | **removed**             | confirmed unused across `src/` and `functions/`              |
| `react-day-picker`                  | 8.10.2   | **removed**             | confirmed unused across `src/` and `functions/`              |

### React 19 migration details

- Ran official codemod: `npx codemod@latest react/19/migration-recipe`
- Ran types codemod: `npx types-react-codemod@latest preset-19 ./src`
- Checked for `react-transition-group` (known `findDOMNode` removal gotcha) — not applicable to this project
- Manually verified via `firebase emulators:start`: auth flows, forms (react-hook-form), Radix UI components (dialogs/dropdowns/accordions/tooltips/toasts), charts

---

## 🚫 Deferred / not done this pass

| Item                 | Current | Latest available | Reason deferred                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`               | 15.5.24 | 16.3.3           | **`firebase-frameworks@0.11.8`** (Firebase Hosting's Next.js SSR integration) only supports Next.js 12–15. Firebase has closed new participation in this "web frameworks experiment" entirely, recommending migration to **Firebase App Hosting** instead — a separate infrastructure product (Cloud Run–backed, `apphosting.yaml` config, different deploy commands). This is a migration project, not a dependency bump.   |
| `eslint-config-next` | 15.5.2  | 16.3.3           | Must stay paired with `next` version — deferred alongside it.                                                                                                                                                                                                                                                                                                                                                                |
| `tailwindcss`        | 3.4.19  | 4.3.x            | v4 is a ground-up rewrite: JS config → CSS-based `@theme` config, `darkMode: ['class']` needs explicit `@variant` redefinition, `tailwindcss-animate` plugin deprecated in favor of `tw-animate-css`, PostCSS config changes. Official upgrade tool exists but only covers ~40% of shadcn/ui-based projects automatically. High visual-regression risk for a "get back to stable" pass — treat as its own dedicated project. |
| `typescript`         | 5.9.3   | 7.0.2            | **Not a normal major bump** — v7 is a full native/Go-based compiler rewrite, published as `latest` only ~1 month ago (also has active `rc`/`dev`/`next` tags, signaling active flux). Too immature for ecosystem tooling (`@typescript-eslint`, Next.js type-checking) to be trusted yet. **5.9.3 is already the latest stable 5.x — no action needed**, just don't jump to 7.x.                                             |

---

## 🔒 Blocked by upstream peer dependencies (do not force)

| Package          | Held at     | Blocked from | Blocking dependency                                                                                     | Recheck command                                 |
| ---------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `zod`            | 3.25.76     | 4.x          | `@genkit-ai/next@1.41.0` requires `zod@^3.24.1`                                                         | `npm view @genkit-ai/next peerDependencies`     |
| `firebase-admin` | latest 13.x | 14.x         | `firebase-frameworks@0.11.8` requires `firebase-admin@^11\|^12\|^13` (npm marks 14.x tree as `invalid`) | `npm view firebase-frameworks peerDependencies` |

**Do not use `--force` or `--legacy-peer-deps` on either of these** — both are genkit/Firebase's internal schema/SDK dependencies where forcing a mismatched version risks silent runtime failures, not just install-time warnings.

---

## Follow-up roadmap (separate future projects, not maintenance)

1. **Firebase App Hosting migration** — required before adopting Next.js 16+. Involves moving off `firebase-frameworks`/Hosting web-frameworks-experiment onto App Hosting (`apphosting.yaml`, Cloud Run-backed). Do this deliberately, not as part of routine maintenance.
2. **Tailwind CSS v4 migration** — CSS-based config rewrite, dark mode strategy change, animation plugin swap. Budget dedicated time; expect visual QA across the whole app.
3. **TypeScript 7 (native compiler)** — revisit in 6–12 months once `@typescript-eslint`/Next.js ecosystem confirms compatibility.
4. **Re-check blocked peer dependencies periodically** (zod v4, firebase-admin v14) — rerun the recheck commands above every few months.

---

## Pre-existing code quality items (not caused by this update, deferred to separate PR)

Surfaced by `npm run build` / ESLint on first build in months — none are blockers, none were introduced by dependency changes:

- Unused imports/vars across several files: `src/app/layout.tsx`, `src/components/auth/login-form.tsx`, `src/components/dashboard/dashboard-header.tsx`, `src/components/dashboard/place-search-results.tsx`, `src/components/dashboard/sidebar.tsx`, `src/contexts/app-context.tsx`, `src/hooks/use-toast.ts`, `src/lib/firebase.ts`
- `react-hooks/exhaustive-deps` warnings in `src/contexts/app-context.tsx` (missing/unnecessary deps in several `useEffect`/`useCallback` hooks) — worth a closer look since these _can_ hide stale-closure bugs, even though the app has run fine in production
- `no-page-custom-font` warning in `layout.tsx`
- `no-img-element` warning in `src/components/icons/travel-favicon.tsx`
- Cosmetic webpack warnings ("Critical dependency: the request of a dependency is an expression") from `@opentelemetry/instrumentation` and Express internals via genkit — known upstream issue, doesn't affect build success or runtime.

---

## Registry cleanup (do before merging)

```powershell
npm config set registry https://registry.npmjs.org/
npm config get registry   # confirm reverted
```

Decide whether to keep or revert `maxsockets` / retry settings based on whether the Defender TLS issue is resolved by IT later.
