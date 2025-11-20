/**
 * Utility for converting key names to KeyboardEvent.code values
 * 
 * This handles the macOS Option key issue where modifier keys produce special characters.
 * For example, Option+F produces ƒ instead of F, so we need to use e.code instead of e.key.
 * 
 * @example
 * getKeyCode('F') // returns 'KeyF'
 * getKeyCode('`') // returns 'Backquote'
 * getKeyCode('Tab') // returns 'Tab'
 */

/**
 * Converts a key name to its corresponding KeyboardEvent.code value
 * 
 * @param keyName - The key name to convert (e.g., 'F', '`', 'Tab')
 * @returns The KeyboardEvent.code value (e.g., 'KeyF', 'Backquote', 'Tab')
 */
export function getKeyCode(keyName: string): string {
  // Normalize to uppercase for letter keys
  const normalizedKey = keyName.toUpperCase();

  const keyMap: Record<string, string> = {
    // Special keys
    'TAB': 'Tab',
    'ENTER': 'Enter',
    'ESCAPE': 'Escape',
    'SPACE': 'Space',
    'BACKSPACE': 'Backspace',
    'DELETE': 'Delete',
    'ARROWUP': 'ArrowUp',
    'ARROWDOWN': 'ArrowDown',
    'ARROWLEFT': 'ArrowLeft',
    'ARROWRIGHT': 'ArrowRight',

    // Symbols
    '`': 'Backquote',
    '~': 'Backquote', // Shift+`
    '-': 'Minus',
    '_': 'Minus', // Shift+-
    '=': 'Equal',
    '+': 'Equal', // Shift+=
    '[': 'BracketLeft',
    '{': 'BracketLeft', // Shift+[
    ']': 'BracketRight',
    '}': 'BracketRight', // Shift+]
    '\\': 'Backslash',
    '|': 'Backslash', // Shift+\
    ';': 'Semicolon',
    ':': 'Semicolon', // Shift+;
    "'": 'Quote',
    '"': 'Quote', // Shift+'
    ',': 'Comma',
    '<': 'Comma', // Shift+,
    '.': 'Period',
    '>': 'Period', // Shift+.
    '/': 'Slash',
    '?': 'Slash', // Shift+/
  };

  // Check if it's in the symbol map first
  if (keyMap[keyName]) {
    return keyMap[keyName];
  }

  // Check if it's in the normalized map
  if (keyMap[normalizedKey]) {
    return keyMap[normalizedKey];
  }

  // Letters A-Z
  if (/^[A-Z]$/.test(normalizedKey)) {
    return `Key${normalizedKey}`;
  }

  // Numbers 0-9
  if (/^[0-9]$/.test(keyName)) {
    return `Digit${keyName}`;
  }

  // If no mapping found, return the original key
  // This handles cases like 'Tab', 'Enter' that might already be in code format
  return keyName;
}

