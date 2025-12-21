import { useEffect, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import type { Collection } from "../types/collections"
import {
  syncCollections,
  pushCollectionsToCloud,
  deleteCloudCollection,
  fetchCloudCollections,
} from "../utils/collectionsSync"
import {
  saveCollections as saveToLocalStorage,
  trackDeletedCollection,
  getDeletedCollectionIds,
  clearDeletedCollectionId,
  clearAllDeletedCollectionIds,
} from "../utils/collectionsStorage"

interface UseCollectionsSyncProps {
  user: User | null
  collections: Collection[]
  setCollections: (collections: Collection[]) => void
}

export function useCollectionsSync({ user, collections, setCollections }: UseCollectionsSyncProps) {
  const previousCollectionsRef = useRef<Collection[]>(collections)
  const isSyncingRef = useRef(false)

  // Sync on login - merge local and cloud collections
  useEffect(() => {
    if (!user) return

    const performInitialSync = async () => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true

      try {
        // Get locally tracked deleted collection IDs
        const deletedIds = getDeletedCollectionIds()

        const { merged, needsPush, needsCloudDelete } = await syncCollections(collections, deletedIds)

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
    }

    performInitialSync()
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

  // Refresh from cloud (manual sync)
  const refreshFromCloud = useCallback(async () => {
    if (!user) return

    try {
      const cloudCollections = await fetchCloudCollections()
      // Filter out any collections that are marked as deleted locally
      const deletedIds = new Set(getDeletedCollectionIds())
      const filteredCollections = cloudCollections.filter((c) => !deletedIds.has(c.id))
      setCollections(filteredCollections)
      saveToLocalStorage(filteredCollections)
    } catch (error) {
      console.error("Failed to refresh from cloud:", error)
    }
  }, [user, setCollections])

  return { syncToCloud, refreshFromCloud }
}
