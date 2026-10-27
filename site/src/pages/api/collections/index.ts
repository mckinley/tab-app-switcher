import type { APIRoute } from "astro"
import { getSession } from "../../../lib/auth.server"
import {
  InvalidCollection,
  isValidCollectionId,
  listCollections,
  readCollectionBody,
  upsertCollection,
} from "../../../lib/collections.server"

export const prerender = false

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

// GET /api/collections — list user's collections
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) return json({ error: "Unauthorized" }, 401)

  return json(await listCollections(env.DB, session.user.id))
}

// POST /api/collections — create collection
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) return json({ error: "Unauthorized" }, 401)

  let body
  try {
    body = await readCollectionBody(request)
  } catch (error) {
    if (error instanceof InvalidCollection) return json({ error: error.message }, 400)
    throw error
  }
  if (!isValidCollectionId(body.id)) return json({ error: "Invalid id" }, 400)

  const saved = await upsertCollection(env.DB, session.user.id, body.id, body)
  if (!saved) return json({ error: "Not found" }, 404)
  return json({ success: true })
}

// OPTIONS — CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}
