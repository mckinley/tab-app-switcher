import { useState, useEffect } from 'react';
import { TabManagement } from '@tas/components/TabManagement';
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs';
import { ThemeToggle } from '../../components/ThemeToggle';
import './globals.css';

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS);

  const loadTabs = () => {
    browser.runtime.sendMessage({ type: 'GET_TABS' }).then((response) => {
      if (response?.tabs) {
        setTabs(response.tabs);
      }
    });
  };

  useEffect(() => {
    loadTabs();

    // Load shortcuts from storage
    browser.storage.local.get('shortcuts').then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts);
      }
    });

    const handleTabUpdate = () => {
      loadTabs();
    };

    browser.tabs.onUpdated.addListener(handleTabUpdate);
    browser.tabs.onRemoved.addListener(handleTabUpdate);
    browser.tabs.onCreated.addListener(handleTabUpdate);
    browser.tabs.onActivated.addListener(handleTabUpdate);

    return () => {
      browser.tabs.onUpdated.removeListener(handleTabUpdate);
      browser.tabs.onRemoved.removeListener(handleTabUpdate);
      browser.tabs.onCreated.removeListener(handleTabUpdate);
      browser.tabs.onActivated.removeListener(handleTabUpdate);
    };
  }, []);

  const handleSelectTab = (tabId: string) => {
    browser.tabs.update(parseInt(tabId), { active: true });
  };

  const handleCloseTab = (tabId: string) => {
    browser.tabs.remove(parseInt(tabId));
  };

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts);
    browser.storage.local.set({ shortcuts: newShortcuts });
  };

  return (
    <TabManagement
      tabs={tabs}
      isOpen={true}
      onClose={() => window.close()}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      shortcuts={shortcuts}
      onShortcutsChange={handleShortcutsChange}
      settingsThemeToggle={<ThemeToggle />}
      variant="fullpage"
    />
  );
}

export default App;

