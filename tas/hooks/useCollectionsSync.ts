import { useEffect, useCallback, useRef } from "react"
import type { AuthUser } from "./useAuth"
import type { Collection } from "../types/collections"
import { syncCollections, pushCollectionsToCloud, deleteCloudCollection } from "../utils/collectionsSync"
import {
  saveCollections as saveToLocalStorage,
  trackDeletedCollection,
  getDeletedCollectionIds,
  clearDeletedCollectionId,
  clearAllDeletedCollectionIds,
} from "../utils/collectionsStorage"

interface UseCollectionsSyncProps {
  user: AuthUser | null
  collections: Collection[]
  setCollections: (collections: Collection[]) => void
}

export function useCollectionsSync({ user, collections, setCollections }: UseCollectionsSyncProps) {
  const previousCollectionsRef = useRef<Collection[]>(collections)
  const isSyncingRef = useRef(false)

  // The latest collections, for syncs started from callbacks
  const collectionsRef = useRef(collections)
  useEffect(() => {
    collectionsRef.current = collections
  }, [collections])

  // Merge local and cloud collections, then push and delete whatever the cloud is missing
  const fullSync = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      // Get locally tracked deleted collection IDs
      const deletedIds = getDeletedCollectionIds()

      const { merged, needsPush, needsCloudDelete } = await syncCollections(collectionsRef.current, deletedIds)

      // Update local state with merged collections
      setCollections(merged)
      saveToLocalStorage(merged)

      // IMPORTANT: Update previousCollectionsRef so future deletions are detected correctly
      // Without this, collections added from cloud during merge won't be tracked
      // when the user deletes them later
      previousCollectionsRef.current = merged

      // Push any local-only or newer collections to cloud
      if (needsPush.length > 0) {
        await pushCollectionsToCloud(needsPush)
      }

      // Delete any collections from cloud that were deleted locally
      if (needsCloudDelete.length > 0) {
        await Promise.all(
          needsCloudDelete.map(async (id) => {
            await deleteCloudCollection(id)
            clearDeletedCollectionId(id)
          }),
        )
      }

      // Clear any remaining deleted IDs that weren't in cloud
      // (they were already deleted or never synced)
      clearAllDeletedCollectionIds()
    } catch (error) {
      console.error("Failed to sync collections:", error)
    } finally {
      isSyncingRef.current = false
    }
  }, [setCollections])

  // Sync on login
  useEffect(() => {
    if (user) fullSync()
  }, [user]) // Only run when user changes (login/logout)

  // Sync changes to cloud when collections change
  const syncToCloud = useCallback(
    async (newCollections: Collection[]) => {
      if (!user || isSyncingRef.current) return

      const previous = previousCollectionsRef.current
      previousCollectionsRef.current = newCollections

      // Find deleted collections
      const deletedIds = previous.filter((p) => !newCollections.find((n) => n.id === p.id)).map((c) => c.id)

      // Track deleted collections locally BEFORE attempting cloud deletion
      // This ensures they don't come back on refresh even if cloud delete fails
      deletedIds.forEach(trackDeletedCollection)

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
          }),
        )

        // Push changed collections to cloud
        if (changedCollections.length > 0) {
          await pushCollectionsToCloud(changedCollections)
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
    if (user) await fullSync()
  }, [user, fullSync])

  return { syncToCloud, refreshFromCloud }
}
