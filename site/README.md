# Tab Application Switcher - Website

Marketing website with a live demo of the Tab Application Switcher, plus account and collections pages. Built with Astro and React islands, served by a Cloudflare Worker with D1 and Better Auth.

## Development

```bash
npm run dev     # Start dev server (port from .env.development, 4409)
npm run build   # Build for production
npm run preview # Preview production build
```

Local secrets (`BETTER_AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) go in `.dev.vars`, which is gitignored.

## Deployment

The site runs on Cloudflare Workers (the `tab-app-switcher` Worker, custom domain `tabappswitcher.com`). Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and runs `wrangler deploy` from this directory using `wrangler.toml`.

## Database

D1 (`DB` binding). The schema is in `schema.sql` and matches production. There are no migrations, so schema changes are applied by hand with `wrangler d1 execute` and `schema.sql` is updated to match.

## Structure

```
site/
├── src/pages/       # Astro pages and API routes (api/auth, api/collections)
├── src/layouts/     # Page layout
├── src/lib/         # Better Auth server setup and client
├── islands/         # React islands mounted by the pages (client:only)
├── views/           # Page views rendered by the islands
├── components/      # Site-specific components
├── schema.sql       # D1 schema
└── wrangler.toml    # Worker config
```

The site imports shared components from `tas/` for the live demo.
