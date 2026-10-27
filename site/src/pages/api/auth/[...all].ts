import type { APIRoute } from "astro"
import { createAuth } from "../../../lib/auth.server"
import { appCorsPreflight, withAppCors } from "../../../lib/appAuth.server"

export const prerender = false

const handleAuth: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime
  const env = runtime.env
  const auth = createAuth(env.DB, env)
  // The extension and the Mac app check and end their sessions from other origins
  return withAppCors(request, await auth.handler(request))
}

export const GET = handleAuth
export const POST = handleAuth
export const OPTIONS: APIRoute = async ({ request }) => appCorsPreflight(request)
