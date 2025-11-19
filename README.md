# Tab Application Switcher Monorepo

Like your system's Application Switcher, but for your browser tabs.

**Website**: [Tab Application Switcher](https://lovable.dev/projects/96412299-9bcf-420f-899c-970901425139)

## Monorepo Structure

This repository contains multiple projects:

```
/
├── site/           Marketing website (Vite + React)
├── extension/      Browser extension (Chrome/Firefox)
├── tas/            Core Tab Application Switcher library
├── [root configs]  Shared build configs for site deployment
```

### Projects

- **`site/`** - Marketing website showcasing TAS functionality with live demo
- **`extension/`** - Browser extension that brings TAS to Chrome and Firefox
- **`tas/`** - Self-contained component library with the core TAS functionality
- **`native/`** (future) - Desktop app using Electron

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

# Run both in parallel
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

### Site Deployment (Lovable)

The site is deployed automatically via [Lovable](https://lovable.dev/projects/96412299-9bcf-420f-899c-970901425139).

**Important**: Root-level files must stay for Lovable compatibility:
- `index.html`
- `vite.config.ts`
- `package.json`
- `public/`

### Extension Deployment

See [`extension/README.md`](extension/README.md) for Chrome Web Store packaging instructions.

## Project-Specific Documentation

- **Site**: See `site/` directory
- **Extension**: See [`extension/README.md`](extension/README.md)
- **TAS Library**: See [`tas/README.md`](tas/README.md)

## Contributing

Changes made via Lovable will be committed automatically to this repo.

You can also:
- Edit files directly in your IDE and push changes
- Edit files in GitHub's web interface
- Use GitHub Codespaces
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/96412299-9bcf-420f-899c-970901425139) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
