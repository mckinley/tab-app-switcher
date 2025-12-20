import { useEffect } from "react"
import { createLogger } from "@tas/utils/logger"

const logger = createLogger("popup-messages")

interface PopupMessageHandlers {
  onAdvanceSelection: (direction: "next" | "prev") => void
}

/**
 * Hook for handling runtime messages from background script to popup.
 *
 * Listens for:
 * - ADVANCE_SELECTION: Navigate to next/prev tab via global shortcut
 *
 * @example
 * usePopupMessages({
 *   onAdvanceSelection: navigate
 * })
 */
export function usePopupMessages(handlers: PopupMessageHandlers): void {
  useEffect(() => {
    const messageListener = (message: { type: string; direction?: "next" | "prev" }) => {
      logger.log("Received message in popup:", message)
      if (message.type === "ADVANCE_SELECTION") {
        handlers.onAdvanceSelection(message.direction || "next")
      }
    }

    browser.runtime.onMessage.addListener(messageListener)
    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  }, [handlers])
}
