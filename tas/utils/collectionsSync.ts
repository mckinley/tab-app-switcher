/**
 * Collections sync service - offline-first with last-write-wins conflict resolution
 */

import type { Collection, CollectionTab } from "../types/collections"
import { supabase } from "./supabase"

interface CloudCollection {
  id: string
  user_id: string
  name: string
  tabs: CollectionTab[]
  updated_at: string
  created_at: string
}

function cloudToLocal(cloud: CloudCollection): Collection {
  return {
    id: cloud.id,
    name: cloud.name,
    tabs: cloud.tabs,
    updatedAt: new Date(cloud.updated_at).getTime(),
  }
}

function localToCloud(local: Collection, userId: string): Omit<CloudCollection, "created_at"> {
  return {
    id: local.id,
    user_id: userId,
    name: local.name,
    tabs: local.tabs,
    updated_at: new Date(local.updatedAt).toISOString(),
  }
}

export async function fetchCloudCollections(): Promise<Collection[]> {
  const { data, error } = await supabase.from("collections").select("*").order("updated_at", { ascending: false })

  if (error) throw error
  return (data as CloudCollection[]).map(cloudToLocal)
}

export async function upsertCloudCollection(collection: Collection): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("collections").upsert(localToCloud(collection, user.id), { onConflict: "id" })

  if (error) throw error
}

export async function deleteCloudCollection(collectionId: string): Promise<void> {
  const { error } = await supabase.from("collections").delete().eq("id", collectionId)

  if (error) throw error
}

/**
 * Merge local and cloud collections using last-write-wins strategy
 * Returns the merged list of collections
 */
export function mergeCollections(local: Collection[], cloud: Collection[]): Collection[] {
  const merged = new Map<string, Collection>()

  // Add all cloud collections
  for (const c of cloud) {
    merged.set(c.id, c)
  }

  // Merge local collections - local wins if newer
  for (const localC of local) {
    const cloudC = merged.get(localC.id)
    if (!cloudC || localC.updatedAt > cloudC.updatedAt) {
      merged.set(localC.id, localC)
    }
  }

  return Array.from(merged.values())
}

/**
 * Sync local collections with cloud
 * Returns the merged collections and a list of collections that need to be pushed to cloud
 */
export async function syncCollections(
  localCollections: Collection[],
): Promise<{ merged: Collection[]; needsPush: Collection[] }> {
  const cloudCollections = await fetchCloudCollections()
  const merged = mergeCollections(localCollections, cloudCollections)

  // Find collections that need to be pushed (local is newer or doesn't exist in cloud)
  const cloudMap = new Map(cloudCollections.map((c) => [c.id, c]))
  const needsPush = merged.filter((c) => {
    const cloud = cloudMap.get(c.id)
    return !cloud || c.updatedAt > new Date(cloud.updatedAt).getTime()
  })

  return { merged, needsPush }
}

/**
 * Push all collections that need updating to cloud
 */
export async function pushCollectionsToCloud(collections: Collection[]): Promise<void> {
  await Promise.all(collections.map(upsertCloudCollection))
}

export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function signInWithGoogle(redirectTo?: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo ?? window.location.origin,
    },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
