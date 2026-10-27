import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TabManagement } from "./TabManagement"
import type { Tab } from "../types/tabs"

const tabs: Tab[] = [
  { id: "1", title: "Inbox", url: "https://mail.example.com/", favicon: "" },
  { id: "2", title: "Docs", url: "https://docs.example.com/", favicon: "" },
]

describe("TabManagement on a phone-sized screen", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 390)
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })),
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(null)),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("has a close button in its navigation bar", async () => {
    const onClose = vi.fn()
    render(
      <TabManagement
        tabs={tabs}
        onClose={onClose}
        onSelectTab={() => {}}
        collections={[]}
        onCollectionsChange={() => {}}
      />,
    )

    fireEvent.click(await screen.findByRole("button", { name: "Close" }))

    expect(onClose).toHaveBeenCalled()
  })
})
