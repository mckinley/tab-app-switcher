# TAS - Tab Application Switcher Library

Shared component library for Tab Application Switcher. Used by the site, extension, and native app.

## Usage

```typescript
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { Settings } from "@tas/components/Settings"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab, KeyboardShortcuts, DEFAULT_SHORTCUTS } from "@tas/types/tabs"
```

## Components

### TabSwitcher

Main tab switcher interface displaying tabs in MRU order.

```typescript
<TabSwitcher
  tabs={tabs}
  selectedIndex={0}
  onSelectTab={(id) => {}}
  onNavigate={(direction) => {}}
  onCloseTab={(id) => {}}
  shortcuts={shortcuts}
/>
```

### Settings

Keyboard shortcut configuration panel.

```typescript
<Settings
  shortcuts={shortcuts}
  onShortcutsChange={(shortcuts) => {}}
/>
```

### TabManagement

Advanced tab management with search, sorting, and bulk actions.

```typescript
<TabManagement
  tabs={tabs}
  onCloseTab={(id) => {}}
  onCloseTabs={(ids) => {}}
  onSelectTab={(id) => {}}
/>
```

## Types

```typescript
interface Tab {
  id: string
  title: string
  url: string
  favicon: string
}

interface KeyboardShortcuts {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}
```

## Structure

```
tas/
├── components/         # React components
│   ├── ui/            # shadcn/ui primitives
│   ├── TabSwitcher.tsx
│   ├── Settings.tsx
│   └── TabManagement.tsx
├── types/tabs.ts      # TypeScript types
├── lib/utils.ts       # Utilities (cn helper)
├── styles/tokens.css  # CSS custom properties
└── tailwind.preset.ts # Shared Tailwind config
```

## Development

Changes to TAS affect all consuming projects. Test in multiple contexts:

```bash
npm run dev:site       # Test in website
npm run dev:extension  # Test in extension
npm run dev:native     # Test in native app
```
