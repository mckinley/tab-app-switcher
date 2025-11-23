import './style.css';

const eventList = document.querySelector<HTMLDivElement>('#event-list')!;
const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn')!;
const copyBtn = document.querySelector<HTMLButtonElement>('#copy-btn')!;
const shortcutsInfo = document.querySelector<HTMLParagraphElement>('#shortcuts-info')!;

// Store all events for copying
const allEvents: Array<{ type: string; timestamp: string; data: unknown }> = [];

// Get default shortcuts from manifest
const DEFAULT_SHORTCUTS: Record<string, string> = {
  'alt-tab': 'Alt+Tab',
  'alt-q': 'Alt+Q',
  'ctrl-tab': 'Ctrl+Tab',
  'ctrl-q': 'Ctrl+Q',
};

// Load and display keyboard shortcuts
async function loadShortcuts() {
  try {
    const commands = await browser.commands.getAll();
    if (commands.length > 0) {
      const shortcutPairs = commands
        .filter(cmd => cmd.name)
        .map(cmd => {
          const defaultShortcut = DEFAULT_SHORTCUTS[cmd.name!] || '';
          const currentShortcut = cmd.shortcut || 'Not set';

          // If current matches default, just show once
          if (currentShortcut === defaultShortcut) {
            return currentShortcut;
          }

          // If different, show both
          return `${defaultShortcut} → ${currentShortcut}`;
        });

      shortcutsInfo.textContent = shortcutPairs.join(' • ') || 'No shortcuts configured';
    } else {
      shortcutsInfo.textContent = 'No shortcuts configured';
    }
  } catch (_error) {
    shortcutsInfo.textContent = 'Unable to load shortcuts';
  }
}

loadShortcuts();

// Track modifier key state
const modifierState = {
  alt: false,
  ctrl: false,
  shift: false,
  meta: false
};

// Auto-focus popup
window.addEventListener('load', () => {
  window.focus();
  logEvent('window-load', { timestamp: Date.now() });
});

// Format timestamp
function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

// Add event to display
function logEvent(type: string, data: unknown): void {
  const timestamp = formatTime();

  // Store event for copying
  allEvents.push({ type, timestamp, data });

  const eventItem = document.createElement('div');
  eventItem.className = `event-item ${type}`;

  const details = JSON.stringify(data, null, 2);

  eventItem.innerHTML = `
    <div>
      <span class="event-type ${type}">${type.toUpperCase()}</span>
      <span class="event-time">${timestamp}</span>
    </div>
    <pre class="event-data">${details}</pre>
  `;

  eventList.insertBefore(eventItem, eventList.firstChild);

  // Limit to 200 events in display
  while (eventList.children.length > 200) {
    eventList.removeChild(eventList.lastChild!);
  }

  console.log(type, data);
}

// === KEYBOARD EVENTS ===
document.addEventListener('keydown', (event: KeyboardEvent) => {
  const oldState = { ...modifierState };

  if (event.key === 'Alt') modifierState.alt = true;
  if (event.key === 'Control') modifierState.ctrl = true;
  if (event.key === 'Shift') modifierState.shift = true;
  if (event.key === 'Meta') modifierState.meta = true;

  logEvent('keydown', {
    key: event.key,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    repeat: event.repeat,
    location: event.location,
    which: event.which,
    keyCode: event.keyCode,
    modifierStateChanged: JSON.stringify(oldState) !== JSON.stringify(modifierState),
    trackedModifiers: { ...modifierState },
    eventModifiers: {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      meta: event.metaKey
    }
  });
});

document.addEventListener('keyup', (event: KeyboardEvent) => {
  const oldState = { ...modifierState };

  if (event.key === 'Alt') modifierState.alt = false;
  if (event.key === 'Control') modifierState.ctrl = false;
  if (event.key === 'Shift') modifierState.shift = false;
  if (event.key === 'Meta') modifierState.meta = false;

  logEvent('keyup', {
    key: event.key,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    location: event.location,
    which: event.which,
    keyCode: event.keyCode,
    modifierStateChanged: JSON.stringify(oldState) !== JSON.stringify(modifierState),
    trackedModifiers: { ...modifierState },
    eventModifiers: {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      meta: event.metaKey
    }
  });
});

document.addEventListener('keypress', (event: KeyboardEvent) => {
  logEvent('keypress', {
    key: event.key,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  });
});

// === FOCUS EVENTS ===
window.addEventListener('focus', () => {
  logEvent('window-focus', {
    timestamp: Date.now(),
    hasFocus: document.hasFocus(),
    activeElement: document.activeElement?.tagName
  });
});

window.addEventListener('blur', () => {
  logEvent('window-blur', {
    timestamp: Date.now(),
    keysStillPressed: { ...modifierState }
  });
});

document.addEventListener('focusin', (event) => {
  logEvent('focusin', {
    target: (event.target as HTMLElement)?.tagName,
    id: (event.target as HTMLElement)?.id
  });
});

document.addEventListener('focusout', (event) => {
  logEvent('focusout', {
    target: (event.target as HTMLElement)?.tagName,
    id: (event.target as HTMLElement)?.id
  });
});

// === VISIBILITY EVENTS ===
document.addEventListener('visibilitychange', () => {
  logEvent('visibilitychange', {
    hidden: document.hidden,
    visibilityState: document.visibilityState,
    hasFocus: document.hasFocus()
  });
});

// === PAGE LIFECYCLE EVENTS ===
window.addEventListener('pagehide', () => {
  logEvent('pagehide', { timestamp: Date.now() });
});

window.addEventListener('pageshow', () => {
  logEvent('pageshow', { timestamp: Date.now() });
});

window.addEventListener('beforeunload', () => {
  logEvent('beforeunload', { timestamp: Date.now() });
});

window.addEventListener('unload', () => {
  logEvent('unload', { timestamp: Date.now() });
});

// === MOUSE EVENTS ===
window.addEventListener('mouseenter', () => {
  logEvent('mouseenter', { timestamp: Date.now() });
});

window.addEventListener('mouseleave', () => {
  logEvent('mouseleave', { timestamp: Date.now() });
});

// === POINTER EVENTS ===
window.addEventListener('pointerenter', () => {
  logEvent('pointerenter', { timestamp: Date.now() });
});

window.addEventListener('pointerleave', () => {
  logEvent('pointerleave', { timestamp: Date.now() });
});

// === COMPOSITION EVENTS ===
document.addEventListener('compositionstart', (event) => {
  logEvent('compositionstart', { data: event.data });
});

document.addEventListener('compositionupdate', (event) => {
  logEvent('compositionupdate', { data: event.data });
});

document.addEventListener('compositionend', (event) => {
  logEvent('compositionend', { data: event.data });
});

// === INPUT EVENTS ===
document.addEventListener('input', (event) => {
  logEvent('input', {
    target: (event.target as HTMLElement)?.tagName
  });
});

document.addEventListener('change', (event) => {
  logEvent('change', {
    target: (event.target as HTMLElement)?.tagName
  });
});

// === EXTENSION MESSAGES ===
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as { type?: string; source?: string; command?: string };

  // Handle content script keyboard events specially
  if (msg.type === 'CONTENT_KEYDOWN') {
    logEvent('content-keydown', message);
  } else if (msg.type === 'CONTENT_KEYUP') {
    logEvent('content-keyup', message);
  } else if (msg.type === 'COMMAND') {
    // Use command name as event type for color coding
    logEvent(msg.command || 'command', message);
  } else {
    logEvent('runtime-message', message);
  }
});

// === BUTTON HANDLERS ===
clearBtn.addEventListener('click', () => {
  eventList.innerHTML = '';
  allEvents.length = 0;
  logEvent('log-cleared', { timestamp: Date.now() });
});

copyBtn.addEventListener('click', async () => {
  const logsText = JSON.stringify(allEvents, null, 2);

  try {
    await navigator.clipboard.writeText(logsText);
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');

    setTimeout(() => {
      copyBtn.textContent = 'Copy All Logs';
      copyBtn.classList.remove('copied');
    }, 2000);

    logEvent('logs-copied', {
      eventCount: allEvents.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logEvent('copy-failed', {
      error: String(error),
      timestamp: Date.now()
    });
  }
});
