import { useState, useEffect } from 'react';
import { SettingsContent } from '@tas/components/SettingsContent';
import { DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs';
import { ThemeToggle } from '../../components/ThemeToggle';
import './globals.css';

function App() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS);

  useEffect(() => {
    // Load shortcuts from storage
    browser.storage.local.get('shortcuts').then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts);
      }
    });
  }, []);

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts);
    // Save to storage - auto-save on every change
    browser.storage.local.set({ shortcuts: newShortcuts });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tab Application Switcher</h1>
          <p className="text-muted-foreground">Configure your extension settings</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <SettingsContent
            shortcuts={shortcuts}
            onShortcutsChange={handleShortcutsChange}
            themeToggle={<ThemeToggle />}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

