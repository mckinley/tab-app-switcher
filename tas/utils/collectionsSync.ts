/**
 * Collections sync service - offline-first with last-write-wins conflict resolution
 *
 * Platform-agnostic: uses fetch() to call the collections API.
 * Auth headers are injected by the platform (cookies for site, bearer token for extension/native).
 */

import type { Collection, CollectionTab } from "../types/collections"

const API_BASE = "https://tabappswitcher.com"

/** Platform-specific auth header provider. Set by each platform at init. */
let authHeaderProvider: (() => Promise<Record<string, string>>) | null = null

/** Set the auth header provider for the current platform */
export function setAuthHeaderProvider(provider: () => Promise<Record<string, string>>) {
  authHeaderProvider = provider
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (authHeaderProvider) {
    const authHeaders = await authHeaderProvider()
    Object.assign(headers, authHeaders)
  }
  return headers
}

interface CloudCollection {
  id: string
  user_id: string
  name: string
  tabs: CollectionTab[]
  updated_at: string
  created_at: string
}

function cloudToLocal(cloud: CloudCollection): Collection {
  const createdAt = new Date(cloud.created_at).getTime()
  const updatedAt = new Date(cloud.updated_at).getTime()

  const tabs = cloud.tabs.map((tab) => ({
    ...tab,
    createdAt: tab.createdAt || createdAt,
    updatedAt: tab.updatedAt || updatedAt,
  }))

  return {
    id: cloud.id,
    name: cloud.name,
    tabs,
    createdAt,
    updatedAt,
  }
}

export async function fetchCloudCollections(): Promise<Collection[]> {
  const headers = await getHeaders()
  const res = await fetch(`${API_BASE}/api/collections`, {
    headers,
    credentials: "include",
  })

  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`)
  const data = (await res.json()) as CloudCollection[]
  return data.map(cloudToLocal)
}

export async function upsertCloudCollection(collection: Collection): Promise<void> {
  const headers = await getHeaders()
  const res = await fetch(`${API_BASE}/api/collections/${collection.id}`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify({
      name: collection.name,
      tabs: collection.tabs,
      updated_at: new Date(collection.updatedAt).toISOString(),
      created_at: new Date(collection.createdAt).toISOString(),
    }),
  })

  if (!res.ok) throw new Error(`Failed to upsert collection: ${res.status}`)
}

export async function deleteCloudCollection(collectionId: string): Promise<void> {
  const headers = await getHeaders()
  const res = await fetch(`${API_BASE}/api/collections/${collectionId}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  })

  if (!res.ok) throw new Error(`Failed to delete collection: ${res.status}`)
}

/**
 * Merge local and cloud collections using last-write-wins strategy
 */
export function mergeCollections(local: Collection[], cloud: Collection[], deletedIds: string[] = []): Collection[] {
  const merged = new Map<string, Collection>()
  const deletedSet = new Set(deletedIds)

  for (const c of cloud) {
    if (!deletedSet.has(c.id)) {
      merged.set(c.id, c)
    }
  }

  for (const localC of local) {
    const cloudC = merged.get(localC.id)
    if (!cloudC || localC.updatedAt > cloudC.updatedAt) {
      merged.set(localC.id, localC)
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Sync local collections with cloud
 */
export async function syncCollections(
  localCollections: Collection[],
  deletedIds: string[] = [],
): Promise<{ merged: Collection[]; needsPush: Collection[]; needsCloudDelete: string[] }> {
  const cloudCollections = await fetchCloudCollections()
  const merged = mergeCollections(localCollections, cloudCollections, deletedIds)

  const cloudMap = new Map(cloudCollections.map((c) => [c.id, c]))
  const needsPush = merged.filter((c) => {
    const cloud = cloudMap.get(c.id)
    return !cloud || c.updatedAt > new Date(cloud.updatedAt).getTime()
  })

  const needsCloudDelete = deletedIds.filter((id) => cloudMap.has(id))

  return { merged, needsPush, needsCloudDelete }
}

/**
 * Push all collections that need updating to cloud
 */
export async function pushCollectionsToCloud(collections: Collection[]): Promise<void> {
  await Promise.all(collections.map(upsertCloudCollection))
}
