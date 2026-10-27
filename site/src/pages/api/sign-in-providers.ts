import type { APIRoute } from "astro"
import { signInProviders } from "../../lib/auth.server"

export const prerender = false

/** GET /api/sign-in-providers: the providers the sign-in page offers, ["google"] or ["google", "apple"] */
export const GET: APIRoute = async ({ locals }) =>
  new Response(JSON.stringify({ providers: signInProviders(locals.runtime.env) }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  })
