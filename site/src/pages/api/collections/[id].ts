import type { APIRoute } from "astro"
import { getSession } from "../../../lib/auth.server"
import {
  InvalidCollection,
  deleteCollection,
  isValidCollectionId,
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

// PUT /api/collections/:id — upsert collection
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) return json({ error: "Unauthorized" }, 401)
  if (!isValidCollectionId(params.id)) return json({ error: "Invalid id" }, 400)

  let body
  try {
    body = await readCollectionBody(request)
  } catch (error) {
    if (error instanceof InvalidCollection) return json({ error: error.message }, 400)
    throw error
  }

  // Another user's collection with this id is left alone
  const saved = await upsertCollection(env.DB, session.user.id, params.id, body)
  if (!saved) return json({ error: "Not found" }, 404)
  return json({ success: true })
}

// DELETE /api/collections/:id — delete collection
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) return json({ error: "Unauthorized" }, 401)
  if (!isValidCollectionId(params.id)) return json({ error: "Invalid id" }, 400)

  await deleteCollection(env.DB, session.user.id, params.id)
  return json({ success: true })
}

// OPTIONS — CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}
