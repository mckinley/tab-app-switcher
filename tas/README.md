# TAS - Tab Application Switcher Library

Core component library for the Tab Application Switcher product. This is a self-contained React component library used by the website, browser extension, and future native app.

## Architecture

TAS is designed as an independent, publishable npm package with its own UI components and design system. Each consumer (site, extension, native) imports TAS but provides its own application shell.

### Directory Structure

```
tas/
├── components/         # TAS React components
│   ├── ui/            # Internal shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── TabSwitcher.tsx    # Main tab switcher interface
│   ├── TabItem.tsx        # Individual tab item component
│   ├── TabManagement.tsx  # Tab management interface
│   ├── TasSettings.tsx    # Settings dialog
│   ├── SettingsContent.tsx # Settings content
│   └── KeyButton.tsx      # Keyboard shortcut button
├── types/             # TypeScript type definitions
│   └── tabs.ts        # Tab and KeyboardShortcuts types
├── hooks/             # React hooks
│   └── use-toast.ts   # Toast notification hook
├── lib/               # Utilities
│   └── utils.ts       # cn() utility for className merging
├── styles/            # CSS
│   └── tokens.css     # CSS custom properties
├── tailwind.preset.ts # Shared Tailwind config
└── package.json       # Package configuration
```

## Usage

### In the Website

```typescript
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { Tab, KeyboardShortcuts, DEFAULT_SHORTCUTS } from "@tas/types/tabs"
```

### In the Extension

```typescript
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { Tab, DEFAULT_SHORTCUTS } from "@tas/types/tabs"
```

## Key Components

### TabSwitcher

The main tab switcher interface that displays tabs in MRU (Most Recently Used) order.

**Props:**

- `tabs: Tab[]` - Array of tabs to display
- `isVisible: boolean` - Whether the switcher is visible
- `selectedIndex: number` - Currently selected tab index
- `onSelectTab: (tabId: string) => void` - Callback when a tab is selected
- `onClose: () => void` - Callback to close the switcher
- `onNavigate: (direction: 'next' | 'prev') => void` - Navigate between tabs
- `onCloseTab: (tabId: string) => void` - Close a tab
- `shortcuts: KeyboardShortcuts` - Keyboard shortcuts configuration
- `onShortcutsChange: (shortcuts: KeyboardShortcuts) => void` - Update shortcuts
- `variant?: 'overlay' | 'popup'` - Display mode (default: 'overlay')

### TasSettings

Settings dialog for customizing keyboard shortcuts.

**Props:**

- `shortcuts: KeyboardShortcuts` - Current shortcuts
- `onShortcutsChange: (shortcuts: KeyboardShortcuts) => void` - Update shortcuts
- `onOpenChange?: (open: boolean) => void` - Dialog open state callback
- `themeToggle?: ReactNode` - Optional theme toggle component

### TabManagement

Advanced tab management interface with search, sorting, and bulk actions.

## Types

### Tab

```typescript
interface Tab {
  id: string
  title: string
  url: string
  favicon: string
}
```

### KeyboardShortcuts

```typescript
interface KeyboardShortcuts {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}
```

## Development

### Adding New Shared Components

1. Create the component in `shared/components/`
2. Use relative imports for shared utilities: `../lib/utils`
3. Use relative imports for shared types: `../types/tabs`
4. Export the component in `shared/components/index.ts`
5. Test in both website and extension

### Modifying Shared Components

When modifying shared components, ensure changes work in both contexts:

1. **Website**: Run `npm run dev` in the root directory
2. **Extension**: Run `npm run dev` in the `extension/` directory
3. Test both builds: `npm run build` in both directories

## Module Resolution

Both projects are configured to resolve `@shared/*` imports:

- **Website**: `vite.config.ts` and `tsconfig.json`
- **Extension**: `wxt.config.ts` and `extension/tsconfig.json`

## Dependencies

Shared components depend on:

- React
- Tailwind CSS
- shadcn/ui components (Radix UI)
- lucide-react icons
- @dnd-kit (for drag and drop)

These dependencies must be installed in both the website and extension projects.
