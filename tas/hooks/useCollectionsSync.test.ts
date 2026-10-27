import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useEffect, useState } from "react"
import { useCollectionsSync } from "./useCollectionsSync"
import type { Collection } from "../types/collections"
import { loadCollections, saveCollections } from "../utils/collectionsStorage"

const collection = (id: string, name: string, updatedAt: number): Collection => ({
  id,
  name,
  tabs: [],
  createdAt: 1,
  updatedAt,
})

type CloudRow = { id: string; user_id: string; name: string; tabs: []; updated_at: string; created_at: string }

const row = (id: string, name: string, updatedAt: number): CloudRow => ({
  id,
  user_id: "u1",
  name,
  tabs: [],
  updated_at: new Date(updatedAt).toISOString(),
  created_at: new Date(1).toISOString(),
})

const alice = { id: "u1", name: "U", email: "u@example.com" }

describe("useCollectionsSync", () => {
  let cloud: CloudRow[]
  let puts: string[]
  let deletes: string[]
  // Set to hold the next fetch of the list until it's resolved
  let holdNextFetch: { release: () => void } | null
  let failNextFetch: boolean

  beforeEach(() => {
    localStorage.clear()
    cloud = []
    puts = []
    deletes = []
    holdNextFetch = null
    failNextFetch = false
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const id = url.split("/").pop()!
        if (init?.method === "PUT") {
          puts.push(id)
          const body = JSON.parse(String(init.body)) as Omit<CloudRow, "id" | "user_id">
          cloud = [...cloud.filter((c) => c.id !== id), { id, user_id: "u1", ...body }]
          return new Response("{}")
        }
        if (init?.method === "DELETE") {
          deletes.push(id)
          cloud = cloud.filter((c) => c.id !== id)
          return new Response("{}")
        }
        if (failNextFetch) {
          failNextFetch = false
          return new Response("", { status: 500 })
        }
        // Answer with the list as it is now, after any hold
        const held = holdNextFetch
        if (held) {
          holdNextFetch = null
          await new Promise<void>((resolve) => (held.release = resolve))
        }
        return new Response(JSON.stringify(cloud))
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  /**
   * The hook on a list of collections, the way the site's pages use it. Tab Management loads
   * the saved list in an effect instead, after the first render (`loadInEffect`).
   */
  function renderSync(user: typeof alice = alice, { loadInEffect = false } = {}) {
    return renderHook(() => {
      const [collections, setCollections] = useState<Collection[]>(() => (loadInEffect ? [] : loadCollections([])))
      useEffect(() => {
        if (loadInEffect) setCollections(loadCollections([]))
      }, [])
      const sync = useCollectionsSync({ user, collections, setCollections })
      const update = (next: Collection[]) => {
        setCollections(next)
        saveCollections(next)
        sync.syncToCloud(next)
      }
      return { collections, setCollections, update, ...sync }
    })
  }

  /** Start a sync that waits on its fetch of the list until finish() */
  async function startHeldSync(sync: () => Promise<void>) {
    const hold = { release: () => {} }
    holdNextFetch = hold
    const calls = vi.mocked(fetch).mock.calls.length
    const done = sync()
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(calls))
    return {
      finish: () =>
        act(async () => {
          hold.release()
          await done
        }),
    }
  }

  const names = (collections: Collection[]) => collections.map((c) => c.name)

  it("Sync Now keeps collections that never reached the cloud, and pushes them", async () => {
    const { result } = renderSync()
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    // A collection made locally (say its upload failed), and one only in the cloud
    act(() => result.current.setCollections([collection("local", "Made here", 5000)]))
    cloud = [row("remote", "From another device", 4000)]

    await act(() => result.current.refreshFromCloud())

    expect(names(result.current.collections)).toEqual(["Made here", "From another device"])
    expect(puts).toEqual(["local"])
  })

  it("drops a collection deleted on another device instead of uploading it again", async () => {
    cloud = [row("a", "Reading", 4000), row("b", "Work", 4000)]
    const { result } = renderSync()
    await waitFor(() => expect(names(result.current.collections)).toEqual(["Reading", "Work"]))

    // Another device deletes "Reading"
    cloud = cloud.filter((c) => c.id !== "a")
    await act(() => result.current.refreshFromCloud())

    expect(names(result.current.collections)).toEqual(["Work"])
    expect(puts).toEqual([])
  })

  it("keeps a collection changed here after another device deleted it", async () => {
    cloud = [row("a", "Reading", 4000)]
    const { result } = renderSync()
    await waitFor(() => expect(names(result.current.collections)).toEqual(["Reading"]))

    // Renamed here while offline, deleted elsewhere
    vi.mocked(fetch).mockImplementationOnce(async () => new Response("", { status: 503 }))
    act(() => result.current.update([{ ...result.current.collections[0], name: "Reading list", updatedAt: 6000 }]))
    cloud = []
    await act(() => result.current.refreshFromCloud())

    expect(names(result.current.collections)).toEqual(["Reading list"])
    expect(cloud.map((c) => c.name)).toEqual(["Reading list"])
  })

  it("keeps a collection made while a sync is running, and uploads it", async () => {
    cloud = [row("remote", "From another device", 4000)]
    const { result } = renderSync()
    await waitFor(() => expect(result.current.collections).toHaveLength(1))

    const sync = await startHeldSync(() => result.current.refreshFromCloud())
    act(() => result.current.update([...result.current.collections, collection("new", "Made meanwhile", 5000)]))
    await sync.finish()

    expect(names(result.current.collections).sort()).toEqual(["From another device", "Made meanwhile"])
    expect(names(loadCollections([])).sort()).toEqual(["From another device", "Made meanwhile"])
    expect(cloud.map((c) => c.id).sort()).toEqual(["new", "remote"])
  })

  it("doesn't bring back a collection deleted while a sync is running", async () => {
    cloud = [row("a", "Reading", 4000), row("b", "Work", 4000)]
    const { result } = renderSync()
    await waitFor(() => expect(result.current.collections).toHaveLength(2))

    const sync = await startHeldSync(() => result.current.refreshFromCloud())
    act(() => result.current.update(result.current.collections.filter((c) => c.id !== "a")))
    await sync.finish()

    expect(names(result.current.collections)).toEqual(["Work"])
    expect(cloud.map((c) => c.id)).toEqual(["b"])
    expect(deletes).toEqual(["a"])
  })

  it("deletes a collection from the cloud even when the sync on sign-in failed", async () => {
    saveCollections([collection("a", "Reading", 4000), collection("b", "Work", 4000)])
    cloud = [row("a", "Reading", 4000), row("b", "Work", 4000)]
    failNextFetch = true
    const { result } = renderSync(alice, { loadInEffect: true })
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(result.current.collections).toHaveLength(2)

    act(() => result.current.update(result.current.collections.filter((c) => c.id !== "a")))

    await waitFor(() => expect(deletes).toEqual(["a"]))
    await act(() => result.current.refreshFromCloud())
    expect(names(result.current.collections)).toEqual(["Work"])
  })

  it("uploads this device's collections to another account it signs in to", async () => {
    cloud = [row("a", "Reading", 4000)]
    const first = renderSync()
    await waitFor(() => expect(names(first.result.current.collections)).toEqual(["Reading"]))
    first.unmount()

    // Signed in to another account, whose cloud is empty
    cloud = []
    const second = renderSync({ id: "u2", name: "V", email: "v@example.com" })
    await waitFor(() => expect(puts).toEqual(["a"]))
    expect(names(second.result.current.collections)).toEqual(["Reading"])
  })
})
