import { useState, useEffect } from 'react';
import { TabSwitcher } from '@tas/components/TabSwitcher';
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs';
import { ThemeToggle } from '../../components/ThemeToggle';
import './globals.css';

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1); // Start with second tab (index 1)
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS);

  // Load tabs from background script
  useEffect(() => {
    browser.runtime.sendMessage({ type: 'GET_TABS' }).then((response) => {
      if (response?.tabs) {
        setTabs(response.tabs);
      }
    });
  }, []);

  // Load shortcuts from storage
  useEffect(() => {
    browser.storage.local.get('shortcuts').then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts);
      }
    });
  }, []);

  const handleSelectTab = (tabId: string) => {
    // Send message to background to activate tab
    browser.runtime.sendMessage({
      type: 'ACTIVATE_TAB',
      tabId
    }).then(() => {
      // Close popup after selection
      window.close();
    });
  };

  const handleCloseTab = (tabId: string) => {
    // Send message to background to close tab
    browser.runtime.sendMessage({
      type: 'CLOSE_TAB',
      tabId
    }).then(() => {
      // Update local state
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
    });
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    setSelectedIndex(prev => {
      const newIndex = direction === 'next'
        ? (prev + 1) % tabs.length
        : prev === 0 ? tabs.length - 1 : prev - 1;

      return newIndex;
    });
  };

  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message: { type: string; direction?: 'next' | 'prev' }) => {
      if (message.type === 'ADVANCE_SELECTION') {
        handleNavigate(message.direction || 'next');
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [handleNavigate]); // Depend on handleNavigate

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts);
    // Save to storage
    browser.storage.local.set({ shortcuts: newShortcuts });
  };

  const handleOpenSettingsPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    window.close();
  };

  const handleOpenTabManagementPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/tabs.html') });
    window.close();
  };

  return (
    <div className="w-[360px] h-[480px] bg-background">
      <TabSwitcher
        tabs={tabs}
        isVisible={true}
        selectedIndex={selectedIndex}
        onSelectTab={handleSelectTab}
        onClose={() => window.close()}
        onNavigate={handleNavigate}
        onCloseTab={handleCloseTab}
        shortcuts={shortcuts}
        onShortcutsChange={handleShortcutsChange}
        settingsThemeToggle={<ThemeToggle />}
        variant="popup"
        onOpenSettingsPage={handleOpenSettingsPage}
        onOpenTabManagementPage={handleOpenTabManagementPage}
      />
    </div>
  );
}

export default App;
