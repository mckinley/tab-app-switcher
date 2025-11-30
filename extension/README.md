# Tab Application Switcher - Browser Extension

Chrome extension that brings system-level application switching (Alt+Tab) to browser tabs.

## Features

- MRU (Most Recently Used) tab tracking
- Keyboard shortcuts for quick tab switching
- Connects to native app for OS-level shortcuts

## Development

```bash
npm run dev     # Start with hot reload
npm run build   # Build for production
npm run zip     # Create Chrome Web Store ZIP
```

### Loading in Chrome

1. Run `npm run build`
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `.output/chrome-mv3`

## Architecture

- **Background Service Worker**: Tab tracking, native app communication via WebSocket
- **Popup**: Tab switcher UI using shared `tas/` components
- **Content Scripts**: Keyboard event handling

## Publishing

### Manual Publishing

1. Run `npm run zip`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the ZIP file from `.output/`
4. Submit for review

### Automated Publishing

#### One-Time Setup

1. **Enable the Chrome Web Store API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Search for "Chrome Web Store API" and enable it

2. **Configure OAuth Consent Screen**
   - Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
   - Select "External" and click Create
   - Fill in App name, support email, and developer email
   - Add yourself as a test user

3. **Create OAuth Credentials**
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click Create Credentials → OAuth client ID
   - Choose "Web application"
   - Add `https://developers.google.com/oauthplayground` to Authorized redirect URIs
   - Save your Client ID and Client Secret

4. **Get Refresh Token**
   - Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
   - Click the gear icon, check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In "Input your own scopes", enter: `https://www.googleapis.com/auth/chromewebstore`
   - Click Authorize APIs, sign in, then Exchange authorization code for tokens
   - Copy the Refresh token

5. **Get Publisher ID**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Find your Publisher ID in the Account section

6. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   CHROME_CLIENT_ID=your_client_id
   CHROME_CLIENT_SECRET=your_client_secret
   CHROME_REFRESH_TOKEN=your_refresh_token
   CHROME_EXTENSION_ID=mfcjanplaceclfoipcengelejgfngcan
   CHROME_PUBLISHER_ID=your_publisher_id
   ```

#### Publishing

```bash
npm run publish   # Build, upload, and submit for review
```

Or use the monorepo release command:

```bash
npm run release patch   # From root directory
```

### Troubleshooting

- **Invalid refresh token**: Re-run the OAuth Playground steps to get a new token
- **Extension not found**: Verify `CHROME_EXTENSION_ID` matches your extension
- **Unauthorized**: Ensure you're using the Google account that owns the extension
