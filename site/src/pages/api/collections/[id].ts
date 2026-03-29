import type { APIRoute } from "astro"
import { getSession } from "../../../lib/auth.server"

export const prerender = false

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// PUT /api/collections/:id — upsert collection
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const env = (locals as any).runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  const body = await request.json()
  const { name, tabs, updated_at, created_at } = body
  const id = params.id!

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

// DELETE /api/collections/:id — delete collection
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = (locals as any).runtime.env
  const session = await getSession(request, env.DB, env)
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  const db = env.DB as D1Database
  await db.prepare('DELETE FROM collection WHERE id = ? AND "userId" = ?').bind(params.id!, session.user.id).run()

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

// OPTIONS — CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}
