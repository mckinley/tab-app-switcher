# Tab Application Switcher Monorepo

Like your system's Application Switcher, but for your browser tabs.

## Monorepo Structure

This repository contains multiple projects:

```
/
├── site/           Marketing website (Vite + React) - self-contained
├── extension/      Browser extension (Chrome/Firefox) - self-contained
├── tas/            Core Tab Application Switcher library
├── [root configs]  Shared monorepo configs (eslint, postcss)
```

### Projects

- **`site/`** - Marketing website showcasing TAS functionality with live demo
- **`extension/`** - Browser extension that brings TAS to Chrome and Firefox
- **`tas/`** - Self-contained component library with the core TAS functionality
- **`native/`** - Electron desktop app for OS-level keyboard shortcuts

### Shared Architecture

All projects use the `tas/` library for consistent Tab Application Switcher functionality. Each project has its own shadcn/ui components, while sharing design tokens via `tas/tailwind.preset.ts`.

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd tab-app-switcher

# Install all workspace dependencies
npm install
```

### Development

```bash
# Run the marketing site
npm run dev:site

# Run the browser extension
npm run dev:extension

# Run the native app
npm run dev:native

# Run both site and extension in parallel
npm run dev:all
```

### Building

```bash
# Build the site
npm run build:site

# Build the extension
npm run build:extension

# Build everything
npm run build:all
```

## Workspaces

This project uses npm workspaces for monorepo management:

- Shared dependencies are hoisted to the root
- React (18.3.1) is consistent across all projects
- Each workspace has its own `package.json`

## Deployment

### Site Deployment

The site can be deployed to any static hosting platform (Vercel, Netlify, etc.).

**For Vercel:**

- Root Directory: `site`
- Build Command: `npm run build`
- Output Directory: `dist`

**For other platforms:**

- Navigate to the `site/` directory
- Run `npm install` and `npm run build`
- Deploy the `dist/` folder

### Extension Deployment

See [`extension/README.md`](extension/README.md) for Chrome Web Store packaging instructions.

### Native App Releases

The native app uses GitHub Releases for distribution with auto-updates via `electron-updater`.

**Setup:**

1. Create `.env` file in `native/` directory:
   ```bash
   cp native/.env.example native/.env
   ```
2. Add your GitHub token to `.env`:
   ```
   GH_TOKEN=your_github_token_here
   ```
3. Get a token from: https://github.com/settings/tokens/new (scope: `repo`)

**Publishing a release:**

```bash
# From root directory
npm run publish:native:mac

# Or from native directory
cd native && npm run publish:mac
```

This will build the app, create a GitHub release, and upload the installer. Users will get automatic updates.

**Installing the app (for users):**

Since the app is not code-signed, macOS will block it with a "damaged" error. Users need to remove the quarantine flag:

```bash
# After downloading and extracting the ZIP
xattr -cr ~/Downloads/Tab\ Application\ Switcher.app

# Then move to Applications and open
mv ~/Downloads/Tab\ Application\ Switcher.app /Applications/
open /Applications/Tab\ Application\ Switcher.app
```

## Project-Specific Documentation

- **Site**: See `site/` directory
- **Extension**: See [`extension/README.md`](extension/README.md)
- **Native App**: See [`native/RELEASE_SETUP.md`](native/RELEASE_SETUP.md)
- **TAS Library**: See [`tas/README.md`](tas/README.md)

## Contributing

Contributions are welcome! You can:

- Edit files directly in your IDE and push changes
- Edit files in GitHub's web interface
- Use GitHub Codespaces
- Submit pull requests with your improvements

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

The site is a standard Vite + React application and can be deployed to any static hosting platform:

- **Vercel** (recommended): Connect your GitHub repo and set root directory to `site/`
- **Netlify**: Similar to Vercel, set base directory to `site/`
- **GitHub Pages**: Build locally and deploy the `site/dist/` folder
- **Cloudflare Pages**: Connect repo and configure build settings

See the Deployment section above for detailed instructions.
