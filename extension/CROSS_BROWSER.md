# Cross-Browser Development

This extension supports Chrome, Firefox, Edge, and Safari. This document covers development and publishing for browsers other than Chrome.

## Overview

| Browser | Build Command | Output Directory | Store |
|---------|---------------|------------------|-------|
| Chrome | `npm run build` | `.output/chrome-mv3` | Chrome Web Store |
| Firefox | `npm run build:firefox` | `.output/firefox-mv2` | Firefox Add-ons |
| Edge | `npm run build:edge` | `.output/edge-mv3` | Edge Add-ons |
| Safari | `npm run build:safari` | `.output/safari-mv2` | Mac App Store |

## Development Commands

```bash
# Development with hot reload
npm run dev:firefox
npm run dev:edge

# Build for production
npm run build:firefox
npm run build:edge
npm run build:safari
npm run build:all        # Build all browsers

# Create ZIPs for store upload
npm run zip:firefox
npm run zip:edge
npm run zip:safari
npm run zip:all          # ZIP all browsers

# Safari-specific
npm run convert:safari   # Convert build to Xcode project
```

## Automated Publishing

You can publish to all stores with a single command:

```bash
npm run publish:all    # Publish to Chrome, Firefox, and Edge
```

Or publish to individual stores:

```bash
npm run publish          # Chrome only
npm run publish:firefox  # Firefox only
npm run publish:edge     # Edge only
```

### Setup

Copy `.env.example` to `.env` and fill in your credentials for each store. Stores with missing credentials will be skipped.

---

## Firefox

### Loading for Development

1. Run `npm run build:firefox`
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select any file in `.output/firefox-mv2` (e.g., `manifest.json`)

**Note:** Temporary add-ons are removed when Firefox closes. For persistent testing, use Firefox Developer Edition with unsigned add-on support.

### Publishing to Firefox Add-ons

| | |
|---|---|
| **Dashboard** | https://addons.mozilla.org/developers/ |
| **Fee** | Free |
| **Review Time** | 1-2 days |

#### Setup (One-Time)

1. Create a [Mozilla Account](https://accounts.firefox.com/signup)
2. Go to [API Credentials](https://addons.mozilla.org/developers/addon/api/key/)
3. Generate an API Key and Secret
4. Add to your `.env` file:
   ```
   FIREFOX_API_KEY=your_jwt_issuer
   FIREFOX_API_SECRET=your_jwt_secret
   ```

#### Automated Publishing

```bash
npm run publish:firefox
```

#### Manual Publishing

1. Run `npm run zip:firefox`
2. Go to Developer Hub → Submit a New Add-on
3. Upload `.output/tab-application-switcher-{version}-firefox.zip`
4. When prompted, upload the sources ZIP (also in `.output/`)
5. Fill in listing details and submit for review

**Note:** Firefox requires source code upload so reviewers can rebuild your extension.

---

## Edge

### Loading for Development

1. Run `npm run build:edge`
2. Open Edge and go to `edge://extensions/`
3. Enable "Developer mode" (toggle in bottom-left)
4. Click "Load unpacked"
5. Select `.output/edge-mv3`

### Publishing to Edge Add-ons

| | |
|---|---|
| **Dashboard** | https://partner.microsoft.com/dashboard/microsoftedge/ |
| **Fee** | Free |
| **Review Time** | 1-2 days |

#### Setup (One-Time)

1. Create a [Microsoft Account](https://account.microsoft.com/)
2. Register at [Edge Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
3. Go to your extension → **Publish API**
4. Click **Enable** to switch to API v1.1 (uses API keys)
5. Click **Create API credentials**
6. Add to your `.env` file:
   ```
   EDGE_CLIENT_ID=your_client_id
   EDGE_API_KEY=your_api_key
   EDGE_PRODUCT_ID=your_product_id
   ```

Your Product ID is in the URL when viewing your extension, or in the Extension Identity section.

#### Automated Publishing

```bash
npm run publish:edge
```

#### Manual Publishing

1. Run `npm run zip:edge`
2. Go to Partner Center → Your extensions
3. Upload `.output/tab-application-switcher-{version}-edge.zip`
4. Fill in listing details and submit for review

---

## Safari

Safari extensions are distributed as macOS apps through the Mac App Store, requiring an Xcode wrapper project.

### Prerequisites

- macOS with Xcode installed
- [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- Xcode Command Line Tools: `xcode-select --install`

### Loading for Development

1. Build and convert to Xcode project:
   ```bash
   npm run build:safari
   npm run convert:safari
   ```

2. Open the Xcode project:
   ```bash
   open ../safari-extension/Tab\ Application\ Switcher/Tab\ Application\ Switcher.xcodeproj
   ```

3. In Xcode:
   - Select your Team in Signing & Capabilities
   - Click the Run button (▶) to build and launch

4. Enable in Safari:
   - Open Safari → Settings → Extensions
   - Enable "Tab Application Switcher"
   - Grant requested permissions

### Publishing to Mac App Store

| | |
|---|---|
| **Dashboard** | https://appstoreconnect.apple.com/ |
| **Fee** | $99/year (Apple Developer Program) |
| **Review Time** | 1-3 days |

#### Setup

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
2. Sign in to Xcode with your Apple ID (Xcode → Settings → Accounts)
3. Create an App ID and App Store Connect record for your app

#### Publishing

1. Build the extension and convert to Xcode:
   ```bash
   npm run build:safari
   npm run convert:safari
   ```

2. Open the Xcode project and configure:
   - Set your Team in Signing & Capabilities
   - Update Version and Build numbers in the project settings

3. Archive and upload:
   - Product → Archive
   - In the Organizer, click "Distribute App"
   - Choose "App Store Connect" → Upload

4. Submit in App Store Connect:
   - Go to https://appstoreconnect.apple.com/
   - Select your app and create a new version
   - Add the uploaded build
   - Fill in listing details and submit for review

#### Updating the Extension

When you make changes to the extension:

1. Rebuild: `npm run build:safari`
2. Either:
   - Re-run `npm run convert:safari` to regenerate the Xcode project, OR
   - Manually copy updated files from `.output/safari-mv2` to the Xcode project's Resources folder
3. Increment the build number in Xcode
4. Archive and upload

---

## Multi-Browser Considerations

### API Differences

The extension uses WebExtension APIs which are largely compatible across browsers, but some differences exist:

- **Manifest Version**: Chrome/Edge use MV3, Firefox/Safari use MV2
- **Service Workers**: Chrome/Edge use service workers; Firefox/Safari use background scripts
- **`chrome_url_overrides`**: Not supported in Firefox or Safari

WXT handles most of these differences automatically through browser-specific builds.

### Testing Checklist

Before releasing to all stores:

- [ ] Test tab switching in each browser
- [ ] Verify WebSocket connection to native app works
- [ ] Check popup opens and displays correctly
- [ ] Confirm keyboard shortcuts function
- [ ] Test with multiple windows open
