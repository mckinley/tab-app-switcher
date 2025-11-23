import { useState, useEffect, useCallback } from 'react';
import { TabSwitcher } from '@tas/components/TabSwitcher';
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs';
import { ThemeToggle } from '../../components/ThemeToggle';
import { createLogger } from '@tas/utils/logger';
import './globals.css';

const logger = createLogger('popup-app');

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

  const handleNavigate = useCallback((direction: 'next' | 'prev') => {
    setSelectedIndex(prev => {
      const newIndex = direction === 'next'
        ? (prev + 1) % tabs.length
        : prev === 0 ? tabs.length - 1 : prev - 1;

      return newIndex;
    });
  }, [tabs.length]);

  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message: { type: string; direction?: 'next' | 'prev' }) => {
      logger.log('Received message in popup:', message);
      if (message.type === 'ADVANCE_SELECTION') {
        handleNavigate(message.direction || 'next');
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [handleNavigate]); // Depend on handleNavigate

  // Focus management: ensure popup has focus and close if it loses focus
  useEffect(() => {
    // Focus the window when popup opens
    window.focus();

    // Close popup if window loses focus
    const handleBlur = () => {
      // DEV: leave open for inspector while in development
      // window.close();
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts);
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
        onOpenSettings={handleOpenSettingsPage}
        onOpenTabManagement={handleOpenTabManagementPage}
      />
    </div>
  );
}

export default App;
