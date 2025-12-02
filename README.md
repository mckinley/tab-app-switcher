# Tab Application Switcher

Like your system's Application Switcher, but for your browser tabs.

## Monorepo Structure

```
├── packages/ui/   Shared shadcn/ui components
├── tas/           Shared app components and styles
├── site/          Website (Vite + React)
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
| `npm run prep`              | Format, lint, and test (run before committing)  |
| `npm run depcheck`          | Check for unused dependencies in all workspaces |
| `npm run release <version>` | Release new version (see below)                 |

## Releasing

Versions are kept in sync across extension and native app. To release:

```bash
npm run release patch   # 1.0.0 → 1.0.1
npm run release minor   # 1.0.0 → 1.1.0
npm run release major   # 1.0.0 → 2.0.0
```

This will:

1. Bump versions in all projects
2. Run `npm run prep` (format, lint, test)
3. Commit and tag
4. Push to GitHub
5. Publish native app to GitHub Releases
6. Publish extension to Chrome Web Store

**Prerequisites:** Set up credentials in `extension/.env` and `native/.env` (see each project's README).

## Other Platforms

The extension supports Firefox, Edge, and Safari. The native app can potentially support Windows and Linux.

| Component  | Documentation                                            |
| ---------- | -------------------------------------------------------- |
| Extension  | [extension/CROSS_BROWSER.md](extension/CROSS_BROWSER.md) |
| Native App | [native/CROSS_PLATFORM.md](native/CROSS_PLATFORM.md)     |

## Technologies

- **Build:** Vite, TypeScript
- **UI:** React, Tailwind CSS, shadcn/ui
- **Extension:** WXT framework
- **Native:** Electron
