export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  main() {
    console.log('[CONTENT SCRIPT] Loaded on:', window.location.href);
    console.log('[CONTENT SCRIPT] Ready to capture keyboard events');

    // Capture ALL keyboard events in capture phase (before page can prevent them)
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      console.log('[CONTENT SCRIPT] keydown:', event.key, event.code);

      const message = {
        type: 'CONTENT_KEYDOWN',
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        repeat: event.repeat,
        timestamp: Date.now(),
      };

      console.log('[CONTENT SCRIPT] Sending message:', message);

      // Send all keydown events to background
      browser.runtime.sendMessage(message)
        .then(() => {
          console.log('[CONTENT SCRIPT] Message sent successfully');
        })
        .catch((error) => {
          console.error('[CONTENT SCRIPT] Failed to send keydown:', error);
        });
    }, true); // Use capture phase

    document.addEventListener('keyup', (event: KeyboardEvent) => {
      console.log('[CONTENT SCRIPT] keyup:', event.key, event.code);

      const message = {
        type: 'CONTENT_KEYUP',
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        timestamp: Date.now(),
      };

      console.log('[CONTENT SCRIPT] Sending message:', message);

      // Send all keyup events to background
      browser.runtime.sendMessage(message)
        .then(() => {
          console.log('[CONTENT SCRIPT] Message sent successfully');
        })
        .catch((error) => {
          console.error('[CONTENT SCRIPT] Failed to send keyup:', error);
        });
    }, true); // Use capture phase
  },
});

