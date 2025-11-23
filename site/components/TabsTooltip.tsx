import { useState, useEffect } from "react"
import { X, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const TOOLTIP_ACTIVE_KEY = "tas-tooltip-active"

interface TabsTooltipProps {
  hideTooltip?: boolean
}

export const TabsTooltip = ({ hideTooltip = false }: TabsTooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [isTooltipActive, setIsTooltipActive] = useState(() => {
    // Check localStorage on mount - default to true (active) for first-time visitors
    const saved = localStorage.getItem(TOOLTIP_ACTIVE_KEY)
    return saved === null ? true : saved === "true"
  })

  // Show tooltip after 2 seconds if active
  useEffect(() => {
    if (isTooltipActive) {
      const timer = setTimeout(() => {
        setShowTooltip(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isTooltipActive])

  // Hide tooltip when switcher is visible
  useEffect(() => {
    if (hideTooltip && showTooltip) {
      setFadingOut(true)
      const timer = setTimeout(() => {
        setShowTooltip(false)
        setFadingOut(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [hideTooltip, showTooltip])

  const handleDismiss = () => {
    setFadingOut(true)
    setTimeout(() => {
      setShowTooltip(false)
      setFadingOut(false)
      setIsTooltipActive(false)
      localStorage.setItem(TOOLTIP_ACTIVE_KEY, "false")
    }, 300) // Match animation duration
  }

  const handleToggleTooltip = () => {
    if (showTooltip) {
      // Hide tooltip and mark as inactive
      setFadingOut(true)
      setTimeout(() => {
        setShowTooltip(false)
        setFadingOut(false)
        setIsTooltipActive(false)
        localStorage.setItem(TOOLTIP_ACTIVE_KEY, "false")
      }, 300)
    } else {
      // Show tooltip and mark as active
      setShowTooltip(true)
      setFadingOut(false)
      setIsTooltipActive(true)
      localStorage.setItem(TOOLTIP_ACTIVE_KEY, "true")
    }
  }

  return (
    <>
      {/* Help Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleTooltip}
        className={`transition-all duration-300 ${
          showTooltip
            ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        title={showTooltip ? "Hide help" : "Show help"}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Tooltip */}
      {showTooltip && !hideTooltip && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[85vw] sm:w-auto ${fadingOut ? "animate-fade-out" : "animate-fade-in"}`}
        >
          <div className="relative bg-primary text-primary-foreground rounded-lg shadow-xl max-w-md animate-bounce-gentle">
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />

            <div className="relative flex items-start">
              <p className="text-sm font-medium leading-relaxed px-6 py-4 pr-4">
                Click some tabs above, then press{" "}
                <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Alt</kbd> +{" "}
                <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Tab</kbd> to see the
                MRU ordered tabs!
              </p>

              {/* Vertical divider */}
              <div className="w-px bg-primary-foreground/20 self-stretch my-3" />

              <div className="flex items-center px-3 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-primary-foreground/20 shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
