import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@tas/hooks/useAuth"
import { useCollectionsSync } from "@tas/hooks/useCollectionsSync"
import { loadCollections, saveCollections, createCollection, renameCollection } from "@tas/utils/collectionsStorage"
import type { Collection } from "@tas/types/collections"
import { CollectionsPanel } from "@tas/components/CollectionsPanel"
import { Navigation, SubnavItem } from "@/components/Navigation"
import { Footer } from "@/components/Footer"

const subnavItems: SubnavItem[] = [
  { to: "/account", label: "Account" },
  { to: "/collections", label: "Collections" },
]

const Collections = () => {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections([]))
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)

  const { syncToCloud } = useCollectionsSync({
    user,
    collections,
    setCollections,
  })

  // Redirect to login if not signed in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?returnTo=/collections")
    }
  }, [isLoading, user, navigate])

  const updateCollections = (newCollections: Collection[]) => {
    setCollections(newCollections)
    saveCollections(newCollections)
    syncToCloud(newCollections)
  }

  const handleCreateCollection = (name: string) => {
    const newCollection = createCollection(name)
    updateCollections([...collections, newCollection])
  }

  const handleDeleteCollection = (id: string) => {
    const newCollections = collections.filter((c) => c.id !== id)
    updateCollections(newCollections)
    if (selectedCollection === id) {
      setSelectedCollection(null)
    }
  }

  const handleRenameCollection = (id: string, newName: string) => {
    const newCollections = renameCollection(collections, id, newName)
    updateCollections(newCollections)
  }

  const handleRemoveTab = (collectionId: string, tabId: string) => {
    const newCollections = collections.map((c) => {
      if (c.id === collectionId) {
        return { ...c, tabs: c.tabs.filter((t) => t.id !== tabId) }
      }
      return c
    })
    updateCollections(newCollections)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation subnavItems={subnavItems} />
        <div className="flex-1 max-w-4xl mx-auto px-8 py-16">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation subnavItems={subnavItems} />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-8 py-12 w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">Collections</h1>

        <CollectionsPanel
          collections={collections}
          selectedCollection={selectedCollection}
          onSelectCollection={setSelectedCollection}
          onCreateCollection={handleCreateCollection}
          onDeleteCollection={handleDeleteCollection}
          onRenameCollection={handleRenameCollection}
          onRemoveTab={handleRemoveTab}
        />
      </main>

      <Footer />
    </div>
  )
}

export default Collections
