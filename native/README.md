# Tab Application Switcher - Native App

macOS menu bar app for switching browser tabs with Alt+Tab. Built with Electron, React, and TypeScript.

## Features

- Menu bar app (no dock icon)
- Global Alt+Tab keyboard shortcut
- Connects to browser extension via WebSocket (port 48125)
- Displays tabs in MRU (Most Recently Used) order
- Settings and tab management windows

## Development

```bash
npm run dev    # Start in development mode
npm run build  # Build for production
npm start      # Run built app
```

## Architecture

- **Main Process**: Menu bar app, WebSocket server, global shortcuts
- **Renderer**: TAS overlay, Settings, Tab Management windows
- **Communication**: WebSocket server on localhost:48125 for extension connection
