/**
 * Collections storage for the /api/collections routes, kept apart from the routes so it can be
 * tested against a real SQLite database.
 *
 * The request and response shapes (snake_case timestamps, tabs as an array) are what shipped
 * extension and native app versions send and expect, so keep them stable.
 */

/** The part of Cloudflare's D1 binding these functions use. */
export interface CollectionsDb {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
      run(): Promise<{ meta: { changes: number } }>
    }
  }
}

export interface CollectionInput {
  name: string
  tabs: unknown[]
  updated_at: string
  created_at: string
}

export interface CloudCollection extends CollectionInput {
  id: string
  user_id: string
}

/** Limits that real collections stay far below (tab favicons can be data URLs). */
export const LIMITS = {
  bodyBytes: 2 * 1024 * 1024,
  idLength: 128,
  nameLength: 500,
  tabs: 2000,
}

export class InvalidCollection extends Error {}

export function isValidCollectionId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= LIMITS.idLength
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && !Number.isNaN(Date.parse(value))
}

/**
 * Read and check a collection from a request body. Throws InvalidCollection with a message
 * suitable for a 400 response.
 */
export async function readCollectionBody(request: Request): Promise<CollectionInput & { id?: unknown }> {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > LIMITS.bodyBytes) throw new InvalidCollection("Collection is too large")

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new InvalidCollection("Body must be JSON")
  }
  if (!body || typeof body !== "object") throw new InvalidCollection("Body must be a JSON object")

  const { id, name, tabs, updated_at, created_at } = body as Record<string, unknown>
  if (typeof name !== "string" || name.length > LIMITS.nameLength) throw new InvalidCollection("Invalid name")
  if (!Array.isArray(tabs) || tabs.length > LIMITS.tabs || !tabs.every((t) => t && typeof t === "object")) {
    throw new InvalidCollection("Invalid tabs")
  }
  if (!isTimestamp(updated_at) || !isTimestamp(created_at)) throw new InvalidCollection("Invalid timestamps")

  return { id, name, tabs, updated_at, created_at }
}

export async function listCollections(db: CollectionsDb, userId: string): Promise<CloudCollection[]> {
  const { results } = await db
    .prepare('SELECT id, "userId", name, tabs, "updatedAt", "createdAt" FROM collection WHERE "userId" = ?')
    .bind(userId)
    .all<{ id: string; userId: string; name: string; tabs: string; updatedAt: string; createdAt: string }>()

  return results.map((row) => ({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    tabs: parseTabs(row.tabs),
    updated_at: row.updatedAt,
    created_at: row.createdAt,
  }))
}

function parseTabs(json: string): unknown[] {
  try {
    const tabs = JSON.parse(json || "[]")
    return Array.isArray(tabs) ? tabs : []
  } catch {
    return []
  }
}

/**
 * Create the collection, or update it if this user already owns one with this id.
 * Returns false when the id belongs to someone else's collection (nothing is changed).
 */
export async function upsertCollection(
  db: CollectionsDb,
  userId: string,
  id: string,
  input: CollectionInput,
): Promise<boolean> {
  const { meta } = await db
    .prepare(
      'INSERT INTO collection (id, "userId", name, tabs, "updatedAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET name = excluded.name, tabs = excluded.tabs, "updatedAt" = excluded."updatedAt" ' +
        'WHERE collection."userId" = excluded."userId"',
    )
    .bind(id, userId, input.name, JSON.stringify(input.tabs), input.updated_at, input.created_at)
    .run()
  return meta.changes > 0
}

export async function deleteCollection(db: CollectionsDb, userId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM collection WHERE id = ? AND "userId" = ?').bind(id, userId).run()
}
