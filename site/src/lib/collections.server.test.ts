// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import {
  deleteCollection,
  InvalidCollection,
  listCollections,
  readCollectionBody,
  upsertCollection,
  type CollectionsDb,
} from "./collections.server"

// node:sqlite isn't in Vite's list of Node built-ins yet, so load it with require
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite")

/** A D1-shaped wrapper around an in-memory SQLite database with the production schema. */
function createDb(): CollectionsDb {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(readFileSync(path.join(__dirname, "../../schema.sql"), "utf8"))
  for (const id of ["alice", "bob"]) {
    sqlite
      .prepare(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES (?, ?, ?, 1, '', '')`,
      )
      .run(id, id, `${id}@example.com`)
  }
  return {
    prepare(query) {
      const statement = sqlite.prepare(query)
      return {
        bind: (...values) => ({
          all: async <T>() => ({ results: statement.all(...(values as never[])) as T[] }),
          run: async () => ({ meta: { changes: Number(statement.run(...(values as never[])).changes) } }),
        }),
      }
    },
  }
}

const input = (name: string) => ({
  name,
  tabs: [{ id: "t1", url: "https://example.com", title: "Example", favicon: "", createdAt: 1, updatedAt: 1 }],
  updated_at: "2026-10-27T12:00:00.000Z",
  created_at: "2026-10-27T11:00:00.000Z",
})

describe("collections storage", () => {
  let db: CollectionsDb

  beforeEach(() => {
    db = createDb()
  })

  it("creates, updates, lists and deletes a user's collection", async () => {
    expect(await upsertCollection(db, "alice", "c1", input("Reading"))).toBe(true)
    expect(await upsertCollection(db, "alice", "c1", input("Reading list"))).toBe(true)

    const collections = await listCollections(db, "alice")
    expect(collections).toEqual([
      {
        id: "c1",
        user_id: "alice",
        name: "Reading list",
        tabs: input("x").tabs,
        updated_at: "2026-10-27T12:00:00.000Z",
        created_at: "2026-10-27T11:00:00.000Z",
      },
    ])

    await deleteCollection(db, "alice", "c1")
    expect(await listCollections(db, "alice")).toEqual([])
  })

  it("doesn't let one user overwrite or delete another user's collection", async () => {
    await upsertCollection(db, "alice", "c1", input("Alice's"))

    expect(await upsertCollection(db, "bob", "c1", input("Bob's"))).toBe(false)
    await deleteCollection(db, "bob", "c1")

    expect((await listCollections(db, "alice")).map((c) => c.name)).toEqual(["Alice's"])
    expect(await listCollections(db, "bob")).toEqual([])
  })
})

describe("readCollectionBody", () => {
  const request = (body: string) =>
    new Request("https://tabappswitcher.com/api/collections/c1", { method: "PUT", body })

  it("accepts what the apps send", async () => {
    await expect(readCollectionBody(request(JSON.stringify(input("Work"))))).resolves.toMatchObject({ name: "Work" })
  })

  it.each([
    ["not JSON", "{"],
    ["not an object", "[]"],
    ["a missing name", JSON.stringify({ ...input("x"), name: undefined })],
    ["tabs that aren't an array", JSON.stringify({ ...input("x"), tabs: "nope" })],
    ["a bad timestamp", JSON.stringify({ ...input("x"), updated_at: "yesterday" })],
    ["too many tabs", JSON.stringify({ ...input("x"), tabs: Array(3000).fill({}) })],
  ])("rejects %s", async (_label, body) => {
    await expect(readCollectionBody(request(body))).rejects.toBeInstanceOf(InvalidCollection)
  })
})
