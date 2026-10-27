# Tab Application Switcher

Like your system's Application Switcher, but for your browser tabs.

## Monorepo Structure

```
├── packages/ui/   Shared shadcn/ui components
├── tas/           Shared app components and styles
├── site/          Website (Astro on Cloudflare Workers)
├── extension/     Browser extension (WXT)
├── native/        macOS menu bar app (Electron)
├── resources/     Store listing descriptions and screenshots
```

- **packages/ui** contains shadcn/ui primitives (Button, Dialog, etc.) - add new components with `npx shadcn@latest add <component>` from the `packages/ui` directory
- **tas** contains app-specific components (TabSwitcher, Settings) and design tokens
- All projects import from `@tab-app-switcher/ui` and `@tab-app-switcher/tas`

## Getting Started

```bash
npm install             # Install all workspace dependencies
npm run dev:site        # Run the website
npm run dev:extension   # Run the browser extension
npm run dev:native      # Run the native app
```

## Common Commands

| Command                     | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `npm run dev:site`          | Start the website                               |
| `npm run dev:extension`     | Start the browser extension                     |
| `npm run dev:native`        | Start the native Electron app                   |
| `npm run build:all`         | Build all projects                              |
| `npm run prep`              | Format and fix lint (run before committing)     |
| `npm run depcheck`          | Check for unused dependencies in all workspaces |
| `npm run release <version>` | Release new version (see below)                 |

## Releasing

Versions are kept in sync across extension and native app. To release, from an up-to-date `main`:

```bash
npm run release patch   # 1.0.0 → 1.0.1
npm run release minor   # 1.0.0 → 1.1.0
npm run release major   # 1.0.0 → 2.0.0
```

This checks that the store and Apple credentials still work (an expired key or an Apple agreement
waiting to be accepted stops it here), runs the checks CI runs (format, lint, typechecks, unit
tests), bumps the version in every project, commits, tags `vX.Y.Z` and pushes. The tag starts the
[Release workflow](.github/workflows/release.yml), which takes about 20 minutes:

1. Checks the secrets and credentials again, then runs CI, including the end-to-end tests
2. Builds, signs and notarizes the Mac app into a draft GitHub release
3. Submits the extension to the Chrome, Firefox and Edge stores, publishes the GitHub release
   (installed Mac apps update from it) and redeploys the site, so its download link points at the
   new version

`node scripts/check-release-credentials.mjs` runs the credential checks on their own.

Safari is still published by hand: `npm run publish:safari` in `extension/` on a Mac, then submit
the build for review in App Store Connect (see [extension/CROSS_BROWSER.md](extension/CROSS_BROWSER.md)).

To try the pipeline without publishing anything, run the Release workflow by hand from the Actions
tab: it builds everything unsigned and attaches the packages to the run.

`npm run release -- patch --local` publishes from your Mac instead, with the credentials in
`extension/.env` and `native/.env`, Safari included. Its tag says so, and the Release workflow
then only runs CI for it.

### One-time setup: repository secrets

The workflow reads the same credentials as the `.env` files, as
[repository secrets](https://github.com/mckinley/tab-app-switcher/settings/secrets/actions). On
the Mac that has `extension/.env`, `native/.env` and the Developer ID Application certificate in
its keychain, with the [GitHub CLI](https://cli.github.com) signed in:

```bash
npm run release:secrets
```

It sets the Chrome, Firefox and Edge store credentials from `extension/.env`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` from `native/.env`, and `CSC_LINK` and
`CSC_KEY_PASSWORD` from the certificate (macOS asks for the keychain password to export it). Run
it again when any of them changes, such as a renewed certificate. A dry run of the Release
workflow lists anything still missing in its summary.

The Mac app isn't published without the signing and notarization secrets, and a release that's
missing them stops before anything is built. A store whose secrets are missing is skipped with a
warning, and the others still go out.

The site deploys to Cloudflare Workers from `main` once lint, typechecks and unit tests pass
(`.github/workflows/ci.yml` → `deploy.yml`).

## Other Platforms

| Component  | Documentation                                            |
| ---------- | -------------------------------------------------------- |
| Extension  | [extension/CROSS_BROWSER.md](extension/CROSS_BROWSER.md) |
| Native App | [native/CROSS_PLATFORM.md](native/CROSS_PLATFORM.md)     |

## Technologies

- **Build:** Vite, TypeScript
- **Site:** Astro on Cloudflare Workers, D1, Better Auth
- **UI:** React, Tailwind CSS, shadcn/ui
- **Extension:** WXT framework
- **Native:** Electron
