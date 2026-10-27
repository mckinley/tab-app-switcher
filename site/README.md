# Tab Application Switcher - Website

Marketing website with a live demo of the Tab Application Switcher, plus account and collections pages. Built with Astro and React islands, served by a Cloudflare Worker with D1 and Better Auth.

## Development

```bash
npm run dev     # Start dev server (port from .env.development, 4409)
npm run build   # Build for production
npm run preview # Preview production build
```

Local secrets (`BETTER_AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) go in `.dev.vars`, which is gitignored: copy `.dev.vars.example`.

## Deployment

The site runs on Cloudflare Workers (the `tab-app-switcher` Worker, custom domain `tabappswitcher.com`). Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and runs `wrangler deploy` from this directory using `wrangler.toml`.

## Accounts

Signing in is optional, with Google, or with Apple once it's set up (below). The Account page
deletes an account: Better Auth's `delete-user`, which wants a sign-in from the last day, so the
page signs out and back in first when it's older. The user's sessions and collections go with it
through their foreign keys (D1 enforces them). The privacy policy is the `#privacy` section of
`/about`, also at `/privacy`.

### Sign in with Apple

Offered once the Worker has `AUTH_APPLE_ID`, `AUTH_APPLE_TEAM_ID`, `AUTH_APPLE_KEY_ID` and
`AUTH_APPLE_PRIVATE_KEY` (`GET /api/sign-in-providers` tells the sign-in page). The site makes
Apple's client secret from the key itself, so nothing needs renewing. To set it up, in the
[Apple Developer account](https://developer.apple.com/account/resources/identifiers/list):

1. **Identifiers → + → App IDs → App**: description "Tab Application Switcher Sign In", explicit
   bundle ID `com.tabappswitcher.signin`, and tick **Sign In with Apple**. Register.
2. **Identifiers → + → Services IDs**: description "Tab Application Switcher", identifier
   `com.tabappswitcher.web`. Register, open it, tick **Sign In with Apple** → **Configure**:
   primary App ID `com.tabappswitcher.signin`, domain `tabappswitcher.com`, return URL
   `https://tabappswitcher.com/api/auth/callback/apple`. Save.
3. **Keys → +**: name "Sign in with Apple", tick **Sign in with Apple** → **Configure** → primary
   App ID `com.tabappswitcher.signin`. Register and download the `AuthKey_<key ID>.p8` (Apple
   only offers it once).
4. From the repo root on a Mac with `native/.env`:
   `./scripts/apple-sign-in-secrets.sh ~/Downloads/AuthKey_<key ID>.p8 com.tabappswitcher.web`

## Database

D1 (`DB` binding). The schema is in `schema.sql` and matches production. There are no migrations, so schema changes are applied by hand with `wrangler d1 execute` and `schema.sql` is updated to match.

## Structure

```
site/
├── src/pages/       # Astro pages and API routes (api/auth, api/app-auth, api/collections)
├── src/layouts/     # Page layout
├── src/lib/         # Better Auth server setup and client
├── islands/         # React islands mounted by the pages (client:only)
├── views/           # Page views rendered by the islands
├── components/      # Site-specific components
├── schema.sql       # D1 schema
└── wrangler.toml    # Worker config
```

The site imports shared components from `tas/` for the live demo.
