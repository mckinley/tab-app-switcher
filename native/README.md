# Tab Application Switcher - Native App

macOS menu bar app for switching browser tabs with Alt+Tab. Built with Electron.

## Features

- Menu bar app (no dock icon)
- Global Alt+Tab keyboard shortcut (works even when Chrome doesn't have focus)
- Connects to browser extension via WebSocket
- Displays tabs in MRU (Most Recently Used) order
- Automatic updates via GitHub Releases

## Development

```bash
npm run dev    # Start in development mode
npm run build  # Build for production
npm start      # Run built app
```

## Architecture

- **Main Process**: Menu bar, WebSocket server (port 48125), global shortcuts
- **Renderer**: Tab switcher overlay, Settings, Tab Management panels
- **Extension Communication**: WebSocket protocol for tab data sync

## Publishing

### One-Time Setup

1. **Create GitHub Token**
   - Go to https://github.com/settings/tokens/new
   - Name: "Tab App Switcher Releases"
   - Scope: `repo`
   - Copy the token

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   GH_TOKEN=your_github_token_here
   ```

### Publishing a Release

```bash
npm run publish:mac   # Build and publish to GitHub Releases
```

Or use the monorepo release command:

```bash
npm run release patch   # From root directory
```

This builds the app, uploads to GitHub Releases, and enables auto-updates for users.

## Auto-Updates

- Checks for updates 10 seconds after startup, then hourly
- Downloads silently in background
- Installs when app is restarted

## Installation (for users)

Since the app is not code-signed, macOS will block it. Users need to:

```bash
# After downloading the ZIP from GitHub Releases
xattr -cr ~/Downloads/Tab\ Application\ Switcher.app
mv ~/Downloads/Tab\ Application\ Switcher.app /Applications/
open /Applications/Tab\ Application\ Switcher.app
```

## Troubleshooting

- **"GH_TOKEN not found"**: Ensure `.env` exists with a valid token
- **Build fails with signing errors**: Run `export CSC_IDENTITY_AUTO_DISCOVERY=false` before building
- **Auto-update not working**: Ensure the release is published (not draft) on GitHub
