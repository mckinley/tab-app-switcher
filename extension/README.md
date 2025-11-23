# Tab Application Switcher - Browser Extension

A browser extension that brings system-level application switching (like Alt+Tab) to browser tabs.

## Features

- **MRU Tab Tracking**: Tracks tabs in Most Recently Used order
- **Keyboard Shortcuts**: Quick tab switching with customizable shortcuts
- **Shared UI**: Uses identical components as the website demo
- **Mock Data**: Currently uses placeholder data for development

## Development

### Prerequisites

- Node.js 18+ and npm
- Chrome browser (for testing)

### Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Build and zip for Chrome Web Store
npm run zip
```

### Loading the Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3` directory

## Architecture

### Shared Components

The extension imports shared components from `../shared/`:

```typescript
import { TabSwitcher } from "@shared/components/TabSwitcher"
import { Tab, DEFAULT_SHORTCUTS } from "@shared/types/tabs"
```

See `../shared/README.md` for more information.

### Background Service Worker

Handles tab tracking and message passing (currently uses mock data).

### Popup UI

Displays tabs using the shared TabSwitcher component.

## Resources

- [WXT Documentation](https://wxt.dev/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
- [Shared Components](../shared/README.md)
