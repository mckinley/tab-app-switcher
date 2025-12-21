import { TabManagement } from "@tas/components/TabManagement"
import { SwitcherContainer } from "@tas/components/SwitcherContainer"
import { ExtensionPlatformProvider, useTabs, useTabActions, extensionTabManagementAdapter } from "../../lib/platform"
import { signInWithGoogleExtension, signOutExtension } from "../../utils/auth"
import "./globals.css"

function TabManagementContent() {
  const { tabs } = useTabs()
  const { activateTab, closeTab, reorderTabs, createWindowWithTabs } = useTabActions()

  const handleSelectTab = (tabId: string) => {
    activateTab(tabId)
  }

  const handleCloseTab = (tabId: string) => {
    closeTab(tabId)
  }

  const handleReorderTabs = async (tabId: string, newIndex: number, targetWindowId?: number) => {
    await reorderTabs(tabId, newIndex, targetWindowId)
  }

  const handleSendCollectionToWindow = async (tabUrls: string[]) => {
    await createWindowWithTabs(tabUrls)
  }

  return (
    <SwitcherContainer variant="screen">
      <TabManagement
        tabs={tabs}
        onClose={() => window.close()}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onSendCollectionToWindow={handleSendCollectionToWindow}
        onSignIn={signInWithGoogleExtension}
        onSignOut={signOutExtension}
      />
    </SwitcherContainer>
  )
}

function App() {
  return (
    <ExtensionPlatformProvider adapter={extensionTabManagementAdapter}>
      <TabManagementContent />
    </ExtensionPlatformProvider>
  )
}

export default App
