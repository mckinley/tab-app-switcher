import type { APIRoute } from "astro"
import { getSession } from "../../../lib/auth.server"

export const prerender = false

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// GET /api/collections — list user's collections
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  const db = env.DB as D1Database
  const results = await db
    .prepare('SELECT id, "userId", name, tabs, "updatedAt", "createdAt" FROM collection WHERE "userId" = ?')
    .bind(session.user.id)
    .all()

  type CollectionRow = { id: string; userId: string; name: string; tabs: string; updatedAt: string; createdAt: string }
  const collections = (results.results as CollectionRow[]).map((row) => ({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    tabs: JSON.parse(row.tabs || "[]"),
    updated_at: row.updatedAt,
    created_at: row.createdAt,
  }))

  return new Response(JSON.stringify(collections), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

// POST /api/collections — create collection
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  const body = (await request.json()) as {
    id: string
    name: string
    tabs: unknown[]
    updated_at: string
    created_at: string
  }
  const { id, name, tabs, updated_at, created_at } = body

  const db = env.DB as D1Database
  await db
    .prepare(
      'INSERT INTO collection (id, "userId", name, tabs, "updatedAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, tabs = excluded.tabs, "updatedAt" = excluded."updatedAt"',
    )
    .bind(id, session.user.id, name, JSON.stringify(tabs), updated_at, created_at)
    .run()

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

// OPTIONS — CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}
