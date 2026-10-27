/**
 * Collections sync service - offline-first with last-write-wins conflict resolution
 *
 * Platform-agnostic: uses fetch() to call the collections API, signed in with the site's
 * cookie or the app's bearer token (see utils/appAuth).
 */

import type { Collection, CollectionTab } from "../types/collections"
import { authRequestInit, getApiBase } from "./appAuth"

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const { headers, credentials } = await authRequestInit()
  return fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...headers },
    credentials,
  })
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
  const res = await request("/api/collections")

  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`)
  const data = (await res.json()) as CloudCollection[]
  return data.map(cloudToLocal)
}

export async function upsertCloudCollection(collection: Collection): Promise<void> {
  const res = await request(`/api/collections/${collection.id}`, {
    method: "PUT",
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
  const res = await request(`/api/collections/${collectionId}`, { method: "DELETE" })

  if (!res.ok) throw new Error(`Failed to delete collection: ${res.status}`)
}

/**
 * Merge local and cloud collections using last-write-wins strategy.
 *
 * `synced` is the version (updatedAt) of each collection the last time this device saw it in
 * the cloud. A local collection that's missing from the cloud but was there, unchanged since,
 * was deleted on another device, so it's dropped instead of being uploaded again.
 */
export function mergeCollections(
  local: Collection[],
  cloud: Collection[],
  deletedIds: string[] = [],
  synced: Record<string, number> = {},
): Collection[] {
  const merged = new Map<string, Collection>()
  const deletedSet = new Set(deletedIds)

  for (const c of cloud) {
    if (!deletedSet.has(c.id)) {
      merged.set(c.id, c)
    }
  }

  for (const localC of local) {
    const cloudC = merged.get(localC.id)
    const deletedElsewhere = !cloudC && synced[localC.id] !== undefined && localC.updatedAt <= synced[localC.id]
    if (deletedElsewhere) continue
    if (!cloudC || localC.updatedAt > cloudC.updatedAt) {
      merged.set(localC.id, localC)
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * What a sync does: the merged list, what to upload, and which cloud copies to delete
 */
export function planSync(
  localCollections: Collection[],
  cloudCollections: Collection[],
  deletedIds: string[] = [],
  synced: Record<string, number> = {},
): { merged: Collection[]; needsPush: Collection[]; needsCloudDelete: string[] } {
  const merged = mergeCollections(localCollections, cloudCollections, deletedIds, synced)

  const cloudMap = new Map(cloudCollections.map((c) => [c.id, c]))
  const needsPush = merged.filter((c) => {
    const cloud = cloudMap.get(c.id)
    return !cloud || c.updatedAt > cloud.updatedAt
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
