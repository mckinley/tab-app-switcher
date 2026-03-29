import type { APIRoute } from "astro"
import { createAuth } from "../../../lib/auth.server"

export const prerender = false

const handleAuth: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime
  const env = runtime.env
  const auth = createAuth(env.DB, env)
  return auth.handler(request)
}

export const GET = handleAuth
export const POST = handleAuth
