import { env } from "cloudflare:workers"
import type { APIRoute } from "astro"
import { signInProviders } from "../../lib/auth.server"

export const prerender = false

/** GET /api/sign-in-providers: the providers the sign-in page offers, ["google"] or ["google", "apple"] */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ providers: signInProviders(env) }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  })
