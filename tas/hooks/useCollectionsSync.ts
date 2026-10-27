import { useEffect, useCallback, useRef } from "react"
import type { AuthUser } from "./useAuth"
import type { Collection } from "../types/collections"
import {
  fetchCloudCollections,
  planSync,
  pushCollectionsToCloud,
  deleteCloudCollection,
} from "../utils/collectionsSync"
import {
  saveCollections as saveToLocalStorage,
  trackDeletedCollection,
  getDeletedCollectionIds,
  clearDeletedCollectionId,
  getSyncedVersions,
  setSyncedVersions,
} from "../utils/collectionsStorage"

interface UseCollectionsSyncProps {
  user: AuthUser | null
  collections: Collection[]
  setCollections: (collections: Collection[]) => void
}

/** Record that the account's cloud now has these versions of these collections, and not these ids */
function recordSynced(userId: string, pushed: Collection[], deletedIds: string[] = []): void {
  const versions = getSyncedVersions(userId)
  pushed.forEach((c) => (versions[c.id] = c.updatedAt))
  deletedIds.forEach((id) => delete versions[id])
  setSyncedVersions(userId, versions)
}

export function useCollectionsSync({ user, collections, setCollections }: UseCollectionsSyncProps) {
  const isSyncingRef = useRef(false)
  // Something changed while a full sync was running, so run another when it finishes
  const resyncRef = useRef(false)

  // The latest collections, for syncs started from callbacks. Callers pass a change to
  // syncToCloud before React re-renders, so this is also the list as it was before the change.
  const collectionsRef = useRef(collections)
  useEffect(() => {
    collectionsRef.current = collections
  }, [collections])

  // Merge local and cloud collections, then push and delete whatever the cloud is missing
  const fullSync = useCallback(
    async (userId: string) => {
      if (isSyncingRef.current) {
        resyncRef.current = true
        return
      }
      isSyncingRef.current = true

      try {
        do {
          resyncRef.current = false
          try {
            const cloud = await fetchCloudCollections()

            // Read local state now, after the fetch, so changes made meanwhile aren't overwritten
            const deletedIds = getDeletedCollectionIds()
            const { merged, needsPush, needsCloudDelete } = planSync(
              collectionsRef.current,
              cloud,
              deletedIds,
              getSyncedVersions(userId),
            )

            // Update local state with merged collections
            collectionsRef.current = merged
            setCollections(merged)
            saveToLocalStorage(merged)

            // Push any local-only or newer collections to cloud
            if (needsPush.length > 0) {
              await pushCollectionsToCloud(needsPush)
            }

            // Delete any collections from cloud that were deleted locally
            await Promise.all(needsCloudDelete.map((id) => deleteCloudCollection(id)))

            // The cloud now matches the merged list. Deletions recorded after the plan was made
            // stay recorded for the next sync.
            setSyncedVersions(userId, Object.fromEntries(merged.map((c) => [c.id, c.updatedAt])))
            deletedIds.forEach(clearDeletedCollectionId)
          } catch (error) {
            console.error("Failed to sync collections:", error)
          }
          // Something changed while that sync ran, so sync again
        } while (resyncRef.current)
      } finally {
        isSyncingRef.current = false
      }
    },
    [setCollections],
  )

  // Sync on login
  const userId = user?.id
  useEffect(() => {
    if (userId) fullSync(userId)
  }, [userId, fullSync])

  // Sync changes to cloud when collections change
  const syncToCloud = useCallback(
    async (newCollections: Collection[]) => {
      if (!user) return

      const previous = collectionsRef.current
      collectionsRef.current = newCollections

      // Find deleted collections
      const deletedIds = previous.filter((p) => !newCollections.find((n) => n.id === p.id)).map((c) => c.id)

      // Track deleted collections locally BEFORE attempting cloud deletion
      // This ensures they don't come back on refresh even if cloud delete fails
      deletedIds.forEach(trackDeletedCollection)

      // A full sync is merging right now; it runs again afterwards and picks this up
      if (isSyncingRef.current) {
        resyncRef.current = true
        return
      }

      // Find new or updated collections
      const changedCollections = newCollections.filter((n) => {
        const prev = previous.find((p) => p.id === n.id)
        return !prev || prev.updatedAt !== n.updatedAt
      })

      try {
        // Delete removed collections from cloud
        await Promise.all(
          deletedIds.map(async (id) => {
            await deleteCloudCollection(id)
            // Clear from tracked list after successful cloud deletion
            clearDeletedCollectionId(id)
            recordSynced(user.id, [], [id])
          }),
        )

        // Push changed collections to cloud
        if (changedCollections.length > 0) {
          await pushCollectionsToCloud(changedCollections)
          recordSynced(user.id, changedCollections)
        }
      } catch (error) {
        console.error("Failed to sync changes to cloud:", error)
        // Note: deleted IDs remain tracked, will be cleaned up on next initial sync
      }
    },
    [user],
  )

  // Sync Now: the same merge as on sign-in, so local changes that never reached the cloud
  // are pushed instead of being replaced by the cloud copy
  const refreshFromCloud = useCallback(async () => {
    if (user) await fullSync(user.id)
  }, [user, fullSync])

  return { syncToCloud, refreshFromCloud }
}
