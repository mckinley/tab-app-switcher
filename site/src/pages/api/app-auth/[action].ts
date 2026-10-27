import type { APIRoute } from "astro"
import { createAuth } from "../../../lib/auth.server"
import {
  APP_CORS_HEADERS,
  appSignInDonePage,
  finishAppSignIn,
  redeemAppCode,
  startAppSignIn,
  type AppAuthOptions,
} from "../../../lib/appAuth.server"

export const prerender = false

// Sign-in for the browser extension and the Mac app; see lib/appAuth.server.ts

function appAuthOptions(env: App.Locals["runtime"]["env"]): AppAuthOptions {
  return {
    siteOrigin: env.BETTER_AUTH_URL,
    extraExtensionIds: (env.APP_AUTH_EXTENSION_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  }
}

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env
  if (params.action === "start") return startAppSignIn(request, createAuth(env.DB, env), appAuthOptions(env))
  if (params.action === "finish") return finishAppSignIn(request, createAuth(env.DB, env), appAuthOptions(env))
  if (params.action === "done") return appSignInDonePage(request)
  return new Response("Not found", { status: 404 })
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env
  if (params.action === "token") return redeemAppCode(request, createAuth(env.DB, env))
  return new Response("Not found", { status: 404 })
}

export const OPTIONS: APIRoute = async ({ params }) => {
  if (params.action === "token") return new Response(null, { status: 204, headers: APP_CORS_HEADERS })
  return new Response(null, { status: 404 })
}
