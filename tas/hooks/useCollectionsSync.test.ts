import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useState } from "react"
import { useCollectionsSync } from "./useCollectionsSync"
import type { Collection } from "../types/collections"

const collection = (id: string, name: string, updatedAt: number): Collection => ({
  id,
  name,
  tabs: [],
  createdAt: 1,
  updatedAt,
})

describe("useCollectionsSync", () => {
  let cloud: { id: string; user_id: string; name: string; tabs: []; updated_at: string; created_at: string }[]
  let puts: string[]

  beforeEach(() => {
    localStorage.clear()
    cloud = []
    puts = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          puts.push(url.split("/").pop()!)
          return new Response("{}")
        }
        return new Response(JSON.stringify(cloud))
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it("Sync Now keeps collections that never reached the cloud, and pushes them", async () => {
    const user = { id: "u1", name: "U", email: "u@example.com" }
    const { result } = renderHook(() => {
      const [collections, setCollections] = useState<Collection[]>([])
      return { collections, setCollections, ...useCollectionsSync({ user, collections, setCollections }) }
    })
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    // A collection made locally (say its upload failed), and one only in the cloud
    act(() => result.current.setCollections([collection("local", "Made here", 5000)]))
    cloud = [
      {
        id: "remote",
        user_id: "u1",
        name: "From another device",
        tabs: [],
        updated_at: new Date(4000).toISOString(),
        created_at: new Date(1).toISOString(),
      },
    ]

    await act(() => result.current.refreshFromCloud())

    expect(result.current.collections.map((c) => c.name)).toEqual(["Made here", "From another device"])
    expect(puts).toEqual(["local"])
  })
})
