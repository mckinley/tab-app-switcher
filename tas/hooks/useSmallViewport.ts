import { useState, useEffect } from "react"

const SMALL_VIEWPORT_BREAKPOINT = 768

export function useSmallViewport() {
  const [isSmallViewport, setIsSmallViewport] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SMALL_VIEWPORT_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsSmallViewport(window.innerWidth < SMALL_VIEWPORT_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsSmallViewport(window.innerWidth < SMALL_VIEWPORT_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmallViewport
}
