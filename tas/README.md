# TAS - Tab Application Switcher Library

Shared component library for Tab Application Switcher. Used by the site, extension, and native app.

## Usage

```typescript
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { KeyboardSettings } from "@tas/components/settings"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab, KeyboardSettings, DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
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
  keyboard={keyboard}
/>
```

### KeyboardSettings

Keyboard configuration panel.

```typescript
<KeyboardSettings
  keyboard={keyboard}
  onKeyboardChange={(keyboard) => {}}
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

interface KeyboardSettings {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}
```

## Development

Changes to TAS affect all consuming projects. Test in multiple contexts:

```bash
npm run dev:site       # Test in website
npm run dev:extension  # Test in extension
npm run dev:native     # Test in native app
```
