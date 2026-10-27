import { describe, it, expect, vi, afterEach, beforeAll } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TabSwitcher } from "./TabSwitcher"
import { useTabNavigation } from "../hooks/useTabNavigation"
import { DEFAULT_KEYBOARD_SETTINGS, type Tab } from "../types/tabs"

const tab = (id: string, title: string, section?: Tab["section"]): Tab => ({
  id,
  title,
  url: `https://example.com/${id}`,
  favicon: "",
  section,
})

// A recently closed tab listed before an open one, to check that rows are counted as shown
const TABS = [
  tab("1", "Inbox"),
  tab("closed", "Old docs", "recentlyClosed"),
  tab("2", "Docs"),
  tab("3", "Calendar"),
  tab("4", "Design docs"),
]

function Switcher({ onSelect }: { onSelect: (id: string) => void }) {
  const { selectedIndex, navigate, onVisibleTabsChange } = useTabNavigation(TABS)
  return (
    <TabSwitcher
      tabs={TABS}
      selectedIndex={selectedIndex}
      onSelectTab={onSelect}
      onClose={() => {}}
      onNavigate={navigate}
      onCloseTab={() => {}}
      keyboard={DEFAULT_KEYBOARD_SETTINGS}
      onOpenSettings={() => {}}
      onOpenTabManagement={() => {}}
      onVisibleTabsChange={onVisibleTabsChange}
    />
  )
}

const rows = () =>
  Array.from(document.querySelectorAll("[data-tab-id]")).map((row) => ({
    id: row.getAttribute("data-tab-id"),
    selected: row.getAttribute("data-selected") === "true",
  }))
const selectedId = () => rows().find((row) => row.selected)?.id
const key = (k: string) => act(() => void fireEvent.keyDown(window, { key: k }))

// jsdom doesn't lay out pages, so it has no scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe("TabSwitcher with useTabNavigation", () => {
  it("highlights and opens the row as shown, with sections grouped", () => {
    const onSelect = vi.fn()
    render(<Switcher onSelect={onSelect} />)

    expect(rows().map((row) => row.id)).toEqual(["1", "2", "3", "4", "closed"])
    expect(selectedId()).toBe("2")

    key("ArrowDown")
    key("ArrowDown")
    key("ArrowDown")
    expect(selectedId()).toBe("closed")
    key("Enter")
    expect(onSelect).toHaveBeenCalledWith("closed")
  })

  it("selects the first match while searching, and Enter and the arrows act on matches", () => {
    const onSelect = vi.fn()
    render(<Switcher onSelect={onSelect} />)

    const search = screen.getByPlaceholderText(/to search tabs/)
    act(() => search.focus())
    fireEvent.change(search, { target: { value: "docs" } })

    expect(rows().map((row) => row.id)).toEqual(["2", "4", "closed"])
    expect(selectedId()).toBe("2")

    key("ArrowDown")
    expect(selectedId()).toBe("4")
    key("ArrowDown")
    key("ArrowDown")
    expect(selectedId()).toBe("2") // wraps within the matches

    key("ArrowUp")
    key("Enter")
    expect(onSelect).toHaveBeenCalledWith("closed")
  })

  it("says there are no tabs only once they've loaded", () => {
    const props = {
      tabs: [],
      selectedIndex: 0,
      onSelectTab: () => {},
      onClose: () => {},
      onNavigate: () => {},
      onCloseTab: () => {},
      keyboard: DEFAULT_KEYBOARD_SETTINGS,
      onOpenSettings: () => {},
      onOpenTabManagement: () => {},
    }
    const { rerender } = render(<TabSwitcher {...props} isLoading />)
    expect(screen.queryByText("No tabs open")).toBeNull()
    rerender(<TabSwitcher {...props} />)
    expect(screen.getByText("No tabs open")).toBeTruthy()
  })

  it("moves back with Shift and the modifier held, and forward without Shift", () => {
    render(<Switcher onSelect={() => {}} />)
    const altTab = (shiftKey: boolean) =>
      act(() => void fireEvent.keyDown(window, { key: "Tab", code: "Tab", altKey: true, shiftKey }))

    altTab(false)
    expect(selectedId()).toBe("3")
    altTab(true)
    expect(selectedId()).toBe("2")
    altTab(true)
    expect(selectedId()).toBe("1")
  })

  it("says when nothing matches", () => {
    render(<Switcher onSelect={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/to search tabs/), { target: { value: "zzz" } })
    expect(screen.getByText('No tabs match "zzz"')).toBeTruthy()
  })
})
