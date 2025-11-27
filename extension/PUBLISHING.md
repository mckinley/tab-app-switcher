# Publishing the Chrome Extension

This guide explains how to publish the Tab Application Switcher extension to the Chrome Web Store.

## Option 1: Manual Publishing (Recommended for First Time)

### Step 1: Build and Create ZIP

```bash
npm run build
npm run zip
```

This creates: `.output/tab-application-switcher-1.0.0-chrome.zip`

### Step 2: Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click on your extension: **Tab Application Switcher**
3. Click **"Package"** tab
4. Click **"Upload new package"**
5. Upload the ZIP file
6. Click **"Submit for review"**

---

## Option 2: Automated Publishing (Advanced)

### Prerequisites

You need to set up Chrome Web Store API access. This is a one-time setup.

### Step 1: Enable Chrome Web Store API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Search for "Chrome Web Store API" and enable it

### Step 2: Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **"External"** and click **"Create"**
3. Fill in required fields:
   - App name: "Tab Application Switcher Publisher"
   - User support email: your email
   - Developer contact email: your email
4. Click **"Save and Continue"**
5. Skip scopes, click **"Save and Continue"**
6. Add your email as a test user
7. Click **"Save and Continue"**

### Step 3: Create OAuth Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Desktop app"** as application type
4. Name it "Chrome Extension Publisher"
5. Click **"Create"**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Get Refresh Token

1. Replace `$CLIENT_ID` with your Client ID in this URL and open it in your browser:

   ```
   https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=$CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob
   ```

2. Authorize the app and copy the authorization code

3. Exchange the code for a refresh token (replace `$CLIENT_ID`, `$CLIENT_SECRET`, and `$CODE`):

   ```bash
   curl "https://accounts.google.com/o/oauth2/token" -d \
   "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob"
   ```

4. Copy the `refresh_token` from the response

### Step 5: Create .env File

```bash
cd extension
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
CHROME_CLIENT_ID=your_client_id_here
CHROME_CLIENT_SECRET=your_client_secret_here
CHROME_REFRESH_TOKEN=your_refresh_token_here
CHROME_EXTENSION_ID=mfcjanplaceclfoipcengelejgfngcan
```

### Step 6: Publish

```bash
npm run publish
```

This will:

1. Build the extension
2. Create the ZIP file
3. Upload to Chrome Web Store
4. Submit for review

---

## Version Management

Before publishing a new version:

1. Update version in `wxt.config.ts`:

   ```typescript
   version: "1.0.1",
   ```

2. Update version in `package.json`:

   ```json
   "version": "1.0.1",
   ```

3. Commit the changes:

   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git push
   ```

4. Publish using either method above

---

## Troubleshooting

### "Invalid refresh token"

- Your refresh token may have expired
- Re-run Step 4 to get a new refresh token

### "Extension not found"

- Check that `CHROME_EXTENSION_ID` in `.env` matches your extension ID
- Extension ID: `mfcjanplaceclfoipcengelejgfngcan`

### "Unauthorized"

- Make sure you're using the Google account that owns the extension
- Check that the Chrome Web Store API is enabled in your Google Cloud project

---

## Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Publish API Documentation](https://developer.chrome.com/docs/webstore/using-api)
- [WXT Documentation](https://wxt.dev/guide/submit.html)
