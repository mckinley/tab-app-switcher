import type { Tab } from '@tas/types/tabs';

/**
 * Background service worker for Tab Application Switcher
 * Tracks tabs in MRU (Most Recently Used) order
 */

// Store MRU order of tab IDs
let mruTabOrder: number[] = [];

// Mock tab data for development
const MOCK_TABS: Tab[] = [
  {
    id: '1',
    title: 'GitHub - Tab Application Switcher',
    url: 'https://github.com/user/tab-app-switcher',
    favicon: 'https://github.com/favicon.ico',
  },
  {
    id: '2',
    title: 'WXT Documentation',
    url: 'https://wxt.dev/guide/introduction.html',
    favicon: 'https://wxt.dev/favicon.ico',
  },
  {
    id: '3',
    title: 'React Documentation',
    url: 'https://react.dev',
    favicon: 'https://react.dev/favicon.ico',
  },
  {
    id: '4',
    title: 'TypeScript Handbook',
    url: 'https://www.typescriptlang.org/docs/',
    favicon: 'https://www.typescriptlang.org/favicon.ico',
  },
  {
    id: '5',
    title: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    favicon: 'https://tailwindcss.com/favicon.ico',
  },
];

export default defineBackground(() => {
  console.log('Tab Application Switcher background service started', { id: browser.runtime.id });

  // Initialize MRU order with mock data
  mruTabOrder = MOCK_TABS.map((_, index) => index + 1);

  // TODO: Real implementation will track actual browser tabs
  // Listen for tab activation
  // browser.tabs.onActivated.addListener((activeInfo) => {
  //   updateMruOrder(activeInfo.tabId);
  // });

  // Listen for tab updates
  // browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  //   if (changeInfo.status === 'complete') {
  //     // Tab finished loading, update our records
  //   }
  // });

  // Listen for tab removal
  // browser.tabs.onRemoved.addListener((tabId) => {
  //   removeFromMruOrder(tabId);
  // });

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_TABS') {
      // For now, return mock data in MRU order
      const tabsInMruOrder = mruTabOrder.map(id =>
        MOCK_TABS.find(tab => tab.id === String(id))
      ).filter((tab): tab is Tab => tab !== undefined);

      sendResponse({ tabs: tabsInMruOrder });
      return true;
    }

    if (message.type === 'ACTIVATE_TAB') {
      // TODO: Activate the actual tab
      // browser.tabs.update(message.tabId, { active: true });
      console.log('Activating tab:', message.tabId);
      updateMruOrder(Number(message.tabId));
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'CLOSE_TAB') {
      // TODO: Close the actual tab
      // browser.tabs.remove(message.tabId);
      console.log('Closing tab:', message.tabId);
      removeFromMruOrder(Number(message.tabId));
      sendResponse({ success: true });
      return true;
    }

    return false;
  });
});

/**
 * Update MRU order when a tab is activated
 */
function updateMruOrder(tabId: number) {
  // Remove tab from current position
  mruTabOrder = mruTabOrder.filter(id => id !== tabId);
  // Add to front (most recently used)
  mruTabOrder.unshift(tabId);
}

/**
 * Remove tab from MRU order when closed
 */
function removeFromMruOrder(tabId: number) {
  mruTabOrder = mruTabOrder.filter(id => id !== tabId);
}
