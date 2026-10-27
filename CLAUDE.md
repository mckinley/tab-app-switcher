# Tab Application Switcher

Like your system's application switcher (Alt+Tab), but for browser tabs, in most-recently-used
order. It ships as a browser extension (Chrome, Firefox, Edge, Safari), a native Electron
menu bar app that gets a global Alt+Tab and talks to the extension, and a site at
https://tabappswitcher.com with a live demo, downloads, and account/collections pages. The
three share the switcher UI from `tas/` and the shadcn primitives from `packages/ui/`.

## Commands (run from the repo root)

```sh
npm install              # all workspaces; extension postinstall runs `wxt prepare`
npm run dev              # site (Astro) on PORT from site/.env.development (4409)
npm run dev:extension    # WXT dev build (dev server port 3005)
npm run dev:native       # electron-vite dev
npm run tc               # build tas, then tsc + astro check + extension/native typechecks
npm run lint:all         # tc + eslint everywhere (what CI runs)
npm run test:all         # vitest in site, extension, tas, native (what CI runs)
npm run test:e2e         # build extension + native, then Playwright e2e with real keys (e2e/README.md)
npm run check            # prettier check + lint:all
npm run prep             # format + lint:fix; run before committing
npm run build:all        # tas, site, extension, native
npm run depcheck         # unused-dependency check per workspace
npm run generate:icons   # scripts/generate-icons.mjs
```

Per-browser extension builds and zips: `npm run build:firefox|edge|safari` and
`npm run zip:all` inside `extension/`.

## Architecture

- `packages/ui/` (`@tab-app-switcher/ui`): shadcn/ui primitives. Add components with
  `npx shadcn@latest add <name>` from that directory.
- `tas/` (`@tab-app-switcher/tas`, alias `@tas`): the core product library. It holds
  `TabSwitcher`, `TabManagement` and settings components, keyboard handling, sorting
  strategies (`tas/sorting`), collections storage/sync, `useAuth`, design tokens and a
  Tailwind preset. `tas/types/protocol.ts` defines the extension-to-native WebSocket
  protocol.
- `extension/` (WXT + React): entrypoints `background`, `popup`, `options`, `tabs`,
  `welcome`, and `signin` (a Safari-only content script). The `tas_activate` command is
  Alt+Tab, or Alt+1 on Firefox and Safari. `utils/tabTracker.ts` keeps MRU order.
  `utils/nativeAppConnection.ts` connects to the native app at `ws://localhost:48125`.
  `utils/auth.ts` signs in through the site's `/api/app-auth` with
  `identity.launchWebAuthFlow` (in Safari, a tab plus the `signin` script) and keeps a bearer
  token in `storage.local`. Cross-browser notes are in `extension/CROSS_BROWSER.md`.
- `native/` (Electron, electron-vite): `src/main` (tray, global shortcuts, WebSocket server
  on port 48125, auth, auto-updater), `src/preload`, `src/renderer` (switcher overlay,
  settings, tab management). Auto-updates come from GitHub Releases on this repo. See
  `native/CROSS_PLATFORM.md`. The WebSocket server listens on 127.0.0.1 and ::1 only and
  refuses any connection whose Origin isn't a `chrome-extension://`, `moz-extension://` or
  `safari-web-extension://` URL, so web pages can't read tabs or send commands.
  `src/main/auth.ts` signs in through the person's browser, which comes back to
  `http://127.0.0.1:48125/auth/callback` on that server, and keeps the bearer token encrypted
  with `safeStorage`.
- `site/` (Astro 5 + `@astrojs/cloudflare`, React islands, Tailwind v4): pages in
  `site/src/pages/*.astro` mount `site/islands/*` with `client:only="react"`, which render
  `site/views/*`. The home-page demo (`site/views/Index.tsx`) runs the real `tas` switcher
  on in-memory demo tabs. Server routes: `src/pages/api/auth/[...all].ts`
  (Better Auth with the bearer plugin, Google sign-in), `src/pages/api/app-auth/[action].ts`
  (sign-in for the extension and native app: a one-time code with PKCE, traded for a bearer
  token; see `src/lib/appAuth.server.ts`) and `src/pages/api/collections` (CRUD on the
  `collection` table in D1, binding `DB`). The apps register how they keep their token with
  `setAuthPlatform` (`tas/utils/appAuth.ts`), which `useAuth` and the collections sync use.
- `e2e/` (`@tab-app-switcher/e2e`): Playwright end-to-end tests. They run the built extension
  in Chromium (several profiles in one browser) and the built native app, and press real keys
  with xdotool under Xvfb + openbox (`e2e/run.sh`). The native app exposes its state to the
  tests only when launched with `TAS_E2E=1`.
- `extension-test/`: a standalone test extension that demonstrates Chrome's
  modifier-keyup behavior with commands. It isn't a workspace.
- `resources/`: store listing copy and screenshots.

## Deploy and release

- **Site:** pushing to `main` runs `.github/workflows/ci.yml`, whose `deploy-site` job (after
  lint, typechecks and unit tests pass) calls `deploy.yml`: it builds the site and runs
  `wrangler deploy` from `site/` to the `tab-app-switcher` Worker (custom domain
  `tabappswitcher.com`). The Mac download link uses the latest published GitHub release and
  its zip (`PUBLIC_MAC_APP_VERSION`, `PUBLIC_MAC_APP_ZIP`, `site/lib/downloads.ts`); from 1.2.5
  the Mac app is one universal build for Apple Silicon and Intel. `site/wrangler.toml` pins `account_id`,
  so the deploy's only secret is `CLOUDFLARE_API_TOKEN`. Worker secrets: `BETTER_AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. For local dev, copy `site/.dev.vars.example` to
  `site/.dev.vars` (gitignored).
- **CI:** `.github/workflows/ci.yml` runs `lint:all` and `test:all`, and the e2e suite in a
  second job, on pushes and PRs to `main`, with Node from `.tool-versions`.
- **Extension and native:** `npm run release patch|minor|major` (`scripts/release.mjs`) checks
  that `main` is clean and current, runs `check` and `test:all`, bumps the version in every
  project, commits, tags `vX.Y.Z` and pushes both. The tag runs `.github/workflows/release.yml`:
  CI, then the Mac app built, signed and notarized on macOS into a draft GitHub release, and
  Chrome, Firefox and Edge store submissions in parallel; then it publishes the release and
  redeploys the site. Run that workflow by hand for a dry run that publishes nothing; its summary
  lists any missing secrets, which `npm run release:secrets` (`scripts/release-secrets.sh`) copies
  to GitHub from the Mac with the `.env` files and the Developer ID certificate.
  `npm run release -- patch --local` publishes from a Mac with `extension/.env` and `native/.env`
  instead, and its tag ("Published locally") makes the workflow only run CI. Safari is separate
  (`npm run publish:safari` in `extension/`).

## Rules and gotchas

- Never run `npm run release`, any `publish*` script, or push a `v*` tag unless asked. They push
  to `main`, publish the Mac app and submit to public stores. Running the Release workflow by
  hand (`workflow_dispatch`) is a dry run and publishes nothing.
- Extension and native versions are kept in sync by the release script. Don't bump them
  by hand.
- The extension and native app call the production API at `https://tabappswitcher.com` (the
  site's pages call their own origin). Changes to `/api/auth`, `/api/app-auth` or
  `/api/collections` affect shipped clients, including old versions still installed. The
  allowed sign-in redirects (store extension ids, the Firefox add-on id's hash, the native
  callback) are in `site/src/lib/appAuth.server.ts`.
- If you change the WebSocket protocol in `tas/types/protocol.ts`, keep the extension and
  native app compatible across versions; users update them separately.
- The site's D1 database (`tab-app-switcher-db`) has no migrations. Its schema lives in
  `site/schema.sql` (Better Auth tables plus `collection`, with quoted camelCase columns
  and text timestamps), which matches production. Schema changes are applied by hand
  with `wrangler d1 execute`; update `site/schema.sql` in the same change.
- Better Auth's `trustedOrigins` in `site/src/lib/auth.server.ts` lists the local dev
  origin (`http://localhost:4409`, from `site/.env.development`). If the dev port changes,
  update it there too.
- Chrome shortcut scope: keep "In Chrome". Chrome gives a "Global" shortcut to one profile
  only, so Alt+Tab in every other profile opens the first profile's tabs. In "In Chrome" scope
  Chrome drops the popup's key-up events after a second shortcut press, so the background
  closes and reopens the popup on repeated presses (see its command handler);
  `e2e/tests/extension.spec.ts` covers both scopes.
- Site URLs have no trailing slash (pjmgmt's url-format and canonical-urls standards):
  `build.format: "file"` makes `/about` the file `about.html`, the last rule in
  `site/public/_redirects` sends `/about/` there with a 301, and `Layout.astro` writes the
  canonical tag (pass `noindex` for signed-in pages, which `@astrojs/sitemap` also leaves out
  in `astro.config.ts`). The old pages `/getting-started`, `/compare`, `/history`, `/pricing`,
  `/support` and `/terms` are 301s to their `/about#…` sections in the same file; the shipped
  apps still link to `/getting-started`, so keep those rules.
- The site and API are public; don't commit credentials. The `.env` files are gitignored,
  and only the `.env.example` / `.env.development` files are committed.

This project is tracked in the pjmgmt HQ: mckinley/pjmgmt, hq/projects/tab-application-switcher.md.
