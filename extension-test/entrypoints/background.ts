export default defineBackground(() => {
  console.log('[BACKGROUND] Background script loaded');
  console.log('[BACKGROUND] Setting up message listeners');

  let popupOpened = false;

  // Listen for ALL keyboard commands and send to popup
  browser.commands.onCommand.addListener((command) => {
    const eventData = {
      type: 'COMMAND',
      command: command,
      timestamp: new Date().toISOString(),
      source: 'background',
    };

    console.log('[BACKGROUND] Command event:', eventData);

    // Open popup on first command (either toggle-popup or toggle-popup-q)
    if (!popupOpened) {
      browser.action.openPopup().then(() => {
        popupOpened = true;
        // Send the command event after popup opens
        setTimeout(() => {
          browser.runtime.sendMessage(eventData).catch(() => {});
        }, 100);
      }).catch((error) => {
        console.error('[BACKGROUND] Failed to open popup:', error);
      });
    } else {
      // Send command event to popup
      browser.runtime.sendMessage(eventData).catch(() => {});
    }
  });

  // Listen for messages from content script and forward to popup
  browser.runtime.onMessage.addListener((message, sender) => {
    console.log('[BACKGROUND] Received message:', message.type, 'from tab:', sender.tab?.id);

    // Forward content script keyboard events to popup
    if (message.type === 'CONTENT_KEYDOWN' || message.type === 'CONTENT_KEYUP') {
      console.log('[BACKGROUND] Forwarding content script event:', message.type, message.key);

      // Forward to popup (popup will handle if it's open)
      browser.runtime.sendMessage({
        ...message,
        source: 'content-script',
        tabId: sender.tab?.id,
      }).catch((error) => {
        console.log('[BACKGROUND] Failed to forward to popup:', error);
      });
    }

    return false; // Not async
  });
});
