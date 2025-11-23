# Chrome Extension Keyboard Event Test

This test extension demonstrates a critical behavior in Chrome's keyboard command handling system that affects modifier key (Alt, Ctrl) keyup events.

## The Problem

When using Chrome extension keyboard shortcuts with the default "In Chrome" scope:

**✅ Modifier keyup IS captured when:**

- The command key is pressed only once, then the modifier is released
- The command key is pressed multiple times, then another key is pressed, then the modifier is released

**❌ Modifier keyup is NOT captured when:**

- The command key is pressed multiple times, then the modifier is immediately released (no other keys pressed)

### Example with Alt+Tab

1. **Single press (works):**
   - Hold Alt → Press Tab → Release Tab → Release Alt
   - ✅ Alt keyup event is captured

2. **Double press (fails):**
   - Hold Alt → Press Tab → Release Tab → Press Tab again → Release Tab → Release Alt
   - ❌ Alt keyup event is NOT captured

3. **Double press + other key (works):**
   - Hold Alt → Press Tab → Release Tab → Press Tab again → Release Tab → Press Q → Release Alt
   - ✅ Alt keyup event is captured

## The Solution

**Change keyboard shortcut scope from "In Chrome" to "Global":**

1. Go to `chrome://extensions/`
2. Click "Keyboard shortcuts" (top right)
3. Find your extension's shortcuts
4. Change the dropdown from "In Chrome" to "Global"
5. Test again - modifier keyup events now fire correctly!

**Trade-off:** With "Global" scope, the shortcut fires even when Chrome doesn't have focus. This can be worked around in your extension logic.

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build and run the extension:**

   ```bash
   npm run dev
   ```

   The extension will automatically load in Chrome.

3. **Navigate to any regular web page** (not `chrome://` pages)

4. **Press any configured shortcut** (Alt+Tab, Alt+Q, Ctrl+Tab, or Ctrl+Q) to open the popup

5. **Try the test cases below** and observe the logs

## Testing This Behavior

### Setup

### Available Test Commands

The extension supports up to 4 keyboard shortcuts at a time (Chrome's limit).

**The popup will automatically display your currently configured shortcuts.**

Default shortcuts (can be modified in `wxt.config.ts`):

- Alt+Tab
- Alt+Q
- Ctrl+Tab
- Ctrl+Q

All commands exhibit the same behavior regardless of which keys are used.

### How to Test

1. **Navigate to any regular web page** (not `chrome://` pages)

2. **Test Case 1: Single Press**
   - Hold the modifier key (Alt or Ctrl)
   - Press the command key (Tab or Q) once
   - Release the command key
   - Release the modifier key
   - **Expected:** You should see a keyup event for the modifier in the logs

3. **Test Case 2: Double Press**
   - Hold the modifier key
   - Press the command key once, release it
   - Press the command key again, release it
   - Release the modifier key
   - **Expected:** You will NOT see a keyup event for the modifier

4. **Test Case 3: Double Press + Other Key**
   - Hold the modifier key
   - Press the command key once, release it
   - Press the command key again, release it
   - Press any other key (like Q)
   - Release the modifier key
   - **Expected:** You should see a keyup event for the modifier

5. **Test with Global Scope**
   - Go to `chrome://extensions/`
   - Click "Keyboard shortcuts"
   - Change any shortcut from "In Chrome" to "Global"
   - Repeat Test Case 2
   - **Expected:** Modifier keyup now fires correctly!

### Reading the Logs

The popup displays all keyboard events:

**Command Events:**

- Dark border - Command triggered by your shortcut

**Popup Events:**

- Medium gray border - Keydown events
- Light gray border - Keyup events

**Content Script Events:**

- Gray background - Events captured from the page (before popup opens)

**What to Look For:**

- After a double-press test, check if you see a **KEYUP** event for the modifier key (Alt or Ctrl)
- If missing, the issue is reproduced
- If present, the modifier keyup was captured successfully

Click **"Copy"** to copy the full event log as JSON for detailed analysis.

## Technical Details

### Why This Happens

This appears to be a sequence-based state machine issue in Chrome's command handling system:

1. When a command fires (first key press)
2. And the same command fires again while the modifier is held (second key press)
3. And the modifier is released immediately after (no other keys pressed)
4. Chrome's command system consumes the modifier keyup event

This behavior is consistent across:

- All modifier keys (Alt, Ctrl)
- All command keys (Tab, Q, and others)
- All combinations tested

### Scope Behavior

- **"In Chrome" scope:** Commands only fire when Chrome has focus, but modifier keyup events are consumed in the double-press scenario
- **"Global" scope:** Commands fire even when Chrome doesn't have focus, but modifier keyup events are always captured correctly

## Project Structure

```
extension-test/
├── entrypoints/
│   ├── background.ts       # Background service worker (handles commands)
│   ├── content.ts          # Content script (captures page events)
│   └── popup/
│       ├── index.html      # Popup UI
│       ├── main.ts         # Event logging logic
│       └── style.css       # Popup styling
├── wxt.config.ts           # Extension configuration (keyboard shortcuts)
└── package.json
```

## Findings Summary

1. **The issue is NOT specific to:**
   - The Tab key (happens with Q and other keys)
   - The Alt modifier (happens with Ctrl too)
   - Timing or race conditions (it's sequence-based)

2. **The issue IS:**
   - A state machine behavior in Chrome's command system
   - Consistent and reproducible
   - Solvable by using "Global" scope instead of "In Chrome" scope

3. **Content scripts cannot solve this:**
   - Content scripts only receive events when the page has focus
   - When the popup opens, it steals focus from the page
   - Content scripts stop receiving events after the popup opens
