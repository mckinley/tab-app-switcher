import { execFileSync } from "node:child_process"

/**
 * Real key presses through the X server (xdotool), so the browser and the native app see the
 * same events a person's keyboard would produce. Tests that use these need an X display
 * (run them under `xvfb-run`).
 */
export function xdotool(...args: string[]): string {
  return execFileSync("xdotool", args, { encoding: "utf8" }).trim()
}

export function hasXdotool(): boolean {
  if (!process.env.DISPLAY) return false
  try {
    xdotool("version")
    return true
  } catch {
    return false
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Focus the X window whose title starts with `titlePrefix` (Chromium titles are "<page> - Chromium"). */
export async function focusWindow(titlePrefix: string): Promise<void> {
  const escaped = titlePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  let id = ""
  for (let i = 0; i < 20 && !id; i++) {
    try {
      id = xdotool("search", "--onlyvisible", "--name", `^${escaped}`).split("\n")[0]
    } catch {
      await sleep(150)
    }
  }
  if (!id) throw new Error(`No X window titled "${titlePrefix}…"`)
  xdotool("windowfocus", "--sync", id)
  await sleep(300)
}

export function focusedWindowTitle(): string {
  try {
    return xdotool("getwindowfocus", "getwindowname")
  } catch {
    return ""
  }
}

/**
 * Hold `modifier`, press each key in turn, then release the modifier, like a person doing
 * Alt+Tab, Tab, Tab. `pauseMs` is the gap between presses.
 */
export async function chord(modifier: string, keys: string[], pauseMs = 250): Promise<void> {
  xdotool("keydown", modifier)
  try {
    for (const key of keys) {
      await sleep(pauseMs)
      xdotool("key", key)
    }
    await sleep(pauseMs)
  } finally {
    xdotool("keyup", modifier)
  }
}
