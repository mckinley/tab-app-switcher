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
- `extension/` (WXT + React): entrypoints `background`, `content`, `popup`, `options`,
  `tabs`, `welcome`. The `tas_activate` command is Alt+Tab, or Alt+1 on Firefox and Safari.
  `utils/tabTracker.ts` keeps MRU order. `utils/nativeAppConnection.ts` connects to the
  native app at `ws://localhost:48125`. `utils/auth.ts` signs in against
  `https://tabappswitcher.com/api/auth` and keeps a bearer token. Cross-browser notes are
  in `extension/CROSS_BROWSER.md`.
- `native/` (Electron, electron-vite): `src/main` (tray, global shortcuts, WebSocket server
  on port 48125, auth, auto-updater), `src/preload`, `src/renderer` (switcher overlay,
  settings, tab management). Auto-updates come from GitHub Releases on this repo. See
  `native/CROSS_PLATFORM.md`.
- `site/` (Astro 5 + `@astrojs/cloudflare`, React islands, Tailwind v4): pages in
  `site/src/pages/*.astro` mount `site/islands/*` with `client:only="react"`, which render
  `site/views/*`. The home-page demo (`site/views/Index.tsx`) runs the real `tas` switcher
  on in-memory demo tabs. The demo adapters in `site/providers/` and
  `site/lib/{platform,settings}` aren't imported anywhere right now. Server routes: `src/pages/api/auth/[...all].ts`
  (Better Auth with the bearer plugin, Google sign-in) and `src/pages/api/collections`
  (CRUD on the `collection` table in D1, binding `DB`).
- `extension-test/`: a standalone test extension that demonstrates Chrome's
  modifier-keyup behavior with commands. It isn't a workspace.
- `resources/`: store listing copy and screenshots.

## Deploy and release

- **Site:** pushing to `main` runs `.github/workflows/deploy.yml`. It builds the site and
  runs `wrangler deploy` from `site/` to the `tab-app-switcher` Worker (custom domain
  `tabappswitcher.com`). The account comes from the `CLOUDFLARE_ACCOUNT_ID` repo secret,
  because `site/wrangler.toml` has no `account_id`. Worker secrets: `BETTER_AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. For local dev, put them in `site/.dev.vars`
  (gitignored).
- **CI:** `.github/workflows/ci.yml` runs `lint:all` and `test:all` on pushes and PRs to
  `main`, with Node from `.tool-versions`.
- **Extension and native:** `npm run release patch|minor|major` (`scripts/release.mjs`)
  bumps the version in every project, runs `prep`, commits with `git add -A`, tags, pushes
  `main`, publishes the macOS app to GitHub Releases and submits the extension to the
  Chrome, Firefox and Edge stores. Safari is separate (`npm run publish:safari` in
  `extension/`). Store and signing credentials live in `extension/.env` and `native/.env`
  (see the `.env.example` files).

## Rules and gotchas

- Never run `npm run release` or any `publish*` script unless asked. They push to `main`
  and submit to public stores.
- Extension and native versions are kept in sync by the release script. Don't bump them
  by hand.
- The extension, native app and `tas/hooks/useAuth.ts` call the production API at
  `https://tabappswitcher.com`. Changes to `/api/auth` or `/api/collections` affect
  shipped clients, including old versions still installed.
- If you change the WebSocket protocol in `tas/types/protocol.ts`, keep the extension and
  native app compatible across versions; users update them separately.
- The site's D1 database (`tab-app-switcher-db`) has no migrations. Its schema lives in
  `site/schema.sql` (Better Auth tables plus `collection`, with quoted camelCase columns
  and text timestamps), which matches production. Schema changes are applied by hand
  with `wrangler d1 execute`; update `site/schema.sql` in the same change.
- Better Auth's `trustedOrigins` in `site/src/lib/auth.server.ts` lists the local dev
  origin (`http://localhost:4409`, from `site/.env.development`). If the dev port changes,
  update it there too.
- The site and API are public; don't commit credentials. The `.env` files are gitignored,
  and only the `.env.example` / `.env.development` files are committed.

This project is tracked in the pjmgmt HQ: mckinley/pjmgmt, hq/projects/tab-application-switcher.md.
