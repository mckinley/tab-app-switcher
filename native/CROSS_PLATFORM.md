# Cross-Platform Development

The native app is built with Electron and can be compiled for macOS, Windows, and Linux. This document covers development and publishing for platforms other than macOS.

## Overview

| Platform | Build Command         | Output              | Distribution    |
| -------- | --------------------- | ------------------- | --------------- |
| macOS    | `npm run build`       | `.dmg`, `.zip`      | GitHub Releases |
| Windows  | `npm run build:win`   | `.exe`, `.msi`      | GitHub Releases |
| Linux    | `npm run build:linux` | `.AppImage`, `.deb` | GitHub Releases |

## Current Status

⚠️ **Windows and Linux support is not yet implemented.** The sections below outline what would be needed.

The native app currently uses macOS-specific features:

- **AppleScript** for browser activation
- **Menu bar** tray icon behavior
- **macOS keyboard shortcuts** via Electron globalShortcut

---

## Windows

### Platform-Specific Changes Needed

1. **Browser Activation**: Replace AppleScript with Windows automation
   - Use `child_process` with PowerShell or
   - Use a Node.js package like `node-window-manager`

2. **Keyboard Shortcuts**: Alt+Tab conflicts with Windows' built-in switcher
   - Consider using a different shortcut (e.g., Ctrl+Tab)
   - Or use a low-level keyboard hook

3. **System Tray**: Electron's tray API works cross-platform, but icons need Windows format (.ico)

4. **Auto-Launch**: Use Electron's `app.setLoginItemSettings()` (already cross-platform)

### Build Commands (once implemented)

```bash
npm run build:win       # Build for Windows
npm run publish:win     # Build and publish to GitHub Releases
```

### Publishing

Windows builds would be published to GitHub Releases alongside macOS builds. Users can download the `.exe` installer.

For broader distribution, consider:

- **Microsoft Store**: Requires MSIX packaging and Microsoft Partner Center account
- **Windows Package Manager (winget)**: Community-maintained repository

---

## Linux

### Platform-Specific Changes Needed

1. **Browser Activation**: Replace AppleScript with Linux commands
   - Use `wmctrl` or `xdotool` for X11
   - Wayland support may require different approaches

2. **Keyboard Shortcuts**: Alt+Tab may conflict with window managers
   - Consider configurable shortcuts
   - May need to integrate with desktop environment settings

3. **System Tray**: Electron's tray API works, but behavior varies by desktop environment
   - GNOME requires extensions for tray icons
   - KDE, XFCE work natively

4. **Auto-Launch**: Desktop entry files in `~/.config/autostart/`

### Build Commands (once implemented)

```bash
npm run build:linux     # Build for Linux
npm run publish:linux   # Build and publish to GitHub Releases
```

### Publishing

Linux builds would be published to GitHub Releases. Common formats:

- **AppImage**: Universal, no installation required
- **deb**: For Debian/Ubuntu
- **rpm**: For Fedora/RHEL
- **snap**: Ubuntu Snap Store
- **flatpak**: Flathub

---

## Implementation Roadmap

To add Windows/Linux support:

### 1. Abstract Platform-Specific Code

Create a platform abstraction layer:

```typescript
// src/main/platform/index.ts
export interface PlatformAdapter {
  activateBrowser(browserName: string): Promise<void>
  registerGlobalShortcut(shortcut: string, callback: () => void): void
}

// src/main/platform/macos.ts
// src/main/platform/windows.ts
// src/main/platform/linux.ts
```

### 2. Update electron-builder Configuration

Add Windows and Linux targets to `electron-builder.json5`:

```json5
{
  win: {
    target: ['nsis', 'portable'],
    icon: 'resources/icon.ico'
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'resources/icon.png',
    category: 'Utility'
  }
}
```

### 3. Add Platform Icons

- Windows: `resources/icon.ico` (256x256)
- Linux: `resources/icon.png` (512x512)

### 4. Update Package Scripts

```json
{
  "build:win": "electron-builder --win",
  "build:linux": "electron-builder --linux",
  "publish:win": "electron-builder --win --publish always",
  "publish:linux": "electron-builder --linux --publish always"
}
```

### 5. CI/CD Updates

GitHub Actions would need:

- Windows runner for Windows builds
- Ubuntu runner for Linux builds
- Cross-compilation or separate build jobs per platform

---

## Contributing

If you'd like to help add Windows or Linux support:

1. Start with the platform abstraction layer
2. Implement browser activation for your platform
3. Test keyboard shortcuts don't conflict with OS defaults
4. Submit a PR with your changes

Platform-specific code should be isolated in `src/main/platform/` to keep the codebase maintainable.
