import { betterAuth } from "better-auth"
import { bearer } from "better-auth/plugins"

// Better Auth factory — called per-request since CF Workers pass env through context
export function createAuth(
  db: D1Database,
  env: { BETTER_AUTH_URL: string; BETTER_AUTH_SECRET: string; AUTH_GOOGLE_ID: string; AUTH_GOOGLE_SECRET: string },
) {
  return betterAuth({
    database: db,
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [bearer()],
    socialProviders: {
      google: {
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh when < 1 day remaining
    },
    trustedOrigins: [
      "http://localhost:4321",
      "https://tabappswitcher.com",
      "https://tab-app-switcher.mckinley-digital-account.workers.dev",
    ],
  })
}

// Helper to get session from request headers (works with both cookies and bearer tokens)
export async function getSession(
  request: Request,
  db: D1Database,
  env: { BETTER_AUTH_URL: string; BETTER_AUTH_SECRET: string; AUTH_GOOGLE_ID: string; AUTH_GOOGLE_SECRET: string },
) {
  const auth = createAuth(db, env)
  return auth.api.getSession({ headers: request.headers })
}
