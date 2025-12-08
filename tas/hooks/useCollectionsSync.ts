import { useEffect, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import type { Collection } from "../types/collections"
import {
  syncCollections,
  pushCollectionsToCloud,
  deleteCloudCollection,
  fetchCloudCollections,
} from "../utils/collectionsSync"
import { saveCollections as saveToLocalStorage } from "../utils/collectionsStorage"

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
        const { merged, needsPush } = await syncCollections(collections)

        // Update local state with merged collections
        setCollections(merged)
        saveToLocalStorage(merged)

        // Push any local-only or newer collections to cloud
        if (needsPush.length > 0) {
          await pushCollectionsToCloud(needsPush)
        }
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

      // Find new or updated collections
      const changedCollections = newCollections.filter((n) => {
        const prev = previous.find((p) => p.id === n.id)
        return !prev || prev.updatedAt !== n.updatedAt
      })

      try {
        // Delete removed collections from cloud
        await Promise.all(deletedIds.map(deleteCloudCollection))

        // Push changed collections to cloud
        if (changedCollections.length > 0) {
          await pushCollectionsToCloud(changedCollections)
        }
      } catch (error) {
        console.error("Failed to sync changes to cloud:", error)
      }
    },
    [user],
  )

  // Refresh from cloud (manual sync)
  const refreshFromCloud = useCallback(async () => {
    if (!user) return

    try {
      const cloudCollections = await fetchCloudCollections()
      setCollections(cloudCollections)
      saveToLocalStorage(cloudCollections)
    } catch (error) {
      console.error("Failed to refresh from cloud:", error)
    }
  }, [user, setCollections])

  return { syncToCloud, refreshFromCloud }
}
