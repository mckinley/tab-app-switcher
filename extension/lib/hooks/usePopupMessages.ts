import { useEffect } from "react"
import { createLogger } from "@tas/utils/logger"

const logger = createLogger("popup-messages")

interface PopupMessageHandlers {
  /** Move the selection and return the new selected index. */
  onAdvanceSelection: (direction: "next" | "prev") => number
}

type PopupMessage = { type: string; direction?: "next" | "prev" }

/**
 * Hook for handling runtime messages from background script to popup.
 *
 * Listens for:
 * - ADVANCE_SELECTION: Navigate to next/prev tab via the keyboard shortcut; replies with the
 *   new selected index
 * - CLOSE_POPUP: Close so the background can reopen the popup (see its command handler)
 *
 * @example
 * usePopupMessages({
 *   onAdvanceSelection: navigate
 * })
 */
export function usePopupMessages(handlers: PopupMessageHandlers): void {
  useEffect(() => {
    const messageListener = (message: PopupMessage, _sender: unknown, sendResponse: (response: unknown) => void) => {
      logger.log("Received message in popup:", message)
      if (message.type === "ADVANCE_SELECTION") {
        sendResponse({ selectedIndex: handlers.onAdvanceSelection(message.direction || "next") })
      } else if (message.type === "CLOSE_POPUP") {
        sendResponse({ closing: true })
        setTimeout(() => window.close(), 0)
      }
    }

    browser.runtime.onMessage.addListener(messageListener)
    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  }, [handlers])
}
