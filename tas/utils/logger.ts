/**
 * Shared logging utility for TAS components
 *
 * This logger works in both website and extension contexts:
 * - In the website: logs directly to console
 * - In the extension popup: sends logs to background script for easier debugging
 *
 * ## Usage:
 * ```typescript
 * import { createLogger } from '../utils/logger';
 *
 * // Create a logger with a specific source name
 * const logger = createLogger('MyComponent');
 *
 * logger.log('Message');
 * logger.info('Info', data);
 * logger.warn('Warning');
 * logger.error('Error', error);
 * logger.debug('Debug', object);
 * ```
 */

// Type for browser runtime API
interface BrowserRuntime {
  id?: string
  sendMessage?: (message: unknown) => Promise<unknown> | void
}

// Type helper to access browser APIs safely
type GlobalWithBrowser = typeof globalThis & {
  chrome?: { runtime?: BrowserRuntime }
  browser?: { runtime?: BrowserRuntime }
}

type LogLevel = "log" | "info" | "warn" | "error" | "debug"

/**
 * Type for log messages sent between contexts
 */
export interface LogMessage {
  type: "LOG"
  level: LogLevel
  message: string
  timestamp: string
  source: string
}

/**
 * Check if we're running in an extension context (not a regular webpage)
 */
function isExtensionContext(): boolean {
  const global = globalThis as GlobalWithBrowser
  // Check if we have a valid extension ID
  // In a real extension, chrome.runtime.id will be set
  // In a webpage, it will be undefined even if chrome.runtime exists
  if (typeof global.chrome !== "undefined" && global.chrome.runtime?.id) {
    return true
  }
  if (typeof global.browser !== "undefined" && global.browser.runtime?.id) {
    return true
  }
  return false
}

/**
 * Get the browser runtime API (works with both browser and chrome namespaces)
 * Only returns runtime if we're actually in an extension context
 */
function getBrowserRuntime(): BrowserRuntime | null {
  if (!isExtensionContext()) {
    return null
  }

  const global = globalThis as GlobalWithBrowser
  if (typeof global.browser !== "undefined" && global.browser.runtime) {
    return global.browser.runtime
  }
  if (typeof global.chrome !== "undefined" && global.chrome.runtime) {
    return global.chrome.runtime
  }
  return null
}

/**
 * Send a log message to the background script (extension only)
 * @param source - The source/component name for the log
 * @param level - The log level
 * @param args - Arguments to log
 */
function sendLogToBackground(source: string, level: LogLevel, ...args: unknown[]) {
  const runtime = getBrowserRuntime()

  if (!runtime) {
    // Not in extension context, skip sending to background
    return
  }

  try {
    // Convert arguments to strings for message passing
    const message = args
      .map((arg) => {
        if (typeof arg === "string") return arg
        if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      })
      .join(" ")

    // Send to background script
    const result = runtime.sendMessage?.({
      type: "LOG",
      level,
      message,
      timestamp: new Date().toISOString(),
      source,
    })

    // Handle promise if sendMessage returns one
    if (result && typeof result === "object" && "catch" in result) {
      result.catch((error: unknown) => {
        // Log error to console for debugging
        console.error(`[${source}] Failed to send log to background:`, error)
      })
    }
  } catch (error: unknown) {
    // Log error to console for debugging
    console.error(`[${source}] Error in sendLogToBackground:`, error)
  }
}

/**
 * Create a logger with a specific source name
 * @param source - The source/component name (e.g., 'use-keyboard-shortcuts', 'TabSwitcher')
 * @returns Logger object with methods for different log levels
 */
export function createLogger(source: string) {
  return {
    log: (...args: unknown[]) => {
      console.log(...args)
      sendLogToBackground(source, "log", ...args)
    },
    info: (...args: unknown[]) => {
      console.info(...args)
      sendLogToBackground(source, "info", ...args)
    },
    warn: (...args: unknown[]) => {
      console.warn(...args)
      sendLogToBackground(source, "warn", ...args)
    },
    error: (...args: unknown[]) => {
      console.error(...args)
      sendLogToBackground(source, "error", ...args)
    },
    debug: (...args: unknown[]) => {
      console.debug(...args)
      sendLogToBackground(source, "debug", ...args)
    },
  }
}

/**
 * Handle log messages received from other contexts (e.g., popup sending to background)
 * Call this in your message listener to handle LOG type messages
 *
 * @param message - The message object received from browser.runtime.onMessage
 * @returns true if the message was a LOG message and was handled, false otherwise
 *
 * @example
 * ```typescript
 * // In background script
 * import { handleLogMessage } from '@tas/utils/logger';
 *
 * browser.runtime.onMessage.addListener((message) => {
 *   if (handleLogMessage(message)) {
 *     return false; // Message was handled
 *   }
 *   // Handle other message types...
 * });
 * ```
 */
export function handleLogMessage(message: unknown): boolean {
  // Type guard to check if message is a LogMessage
  if (typeof message !== "object" || message === null || !("type" in message) || message.type !== "LOG") {
    return false
  }

  const logMessage = message as LogMessage
  const { level, message: logText, timestamp, source } = logMessage
  const prefix = `[${source}] [${timestamp}]`

  switch (level) {
    case "error":
      console.error(prefix, logText)
      break
    case "warn":
      console.warn(prefix, logText)
      break
    case "info":
      console.info(prefix, logText)
      break
    case "debug":
      console.debug(prefix, logText)
      break
    default:
      console.log(prefix, logText)
  }

  return true
}

/**
 * Default logger for backward compatibility
 * @deprecated Use createLogger('your-source-name') instead
 */
export const logger = createLogger("tas")
