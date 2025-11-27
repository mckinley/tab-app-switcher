# Phase 1: GitHub Releases + Auto-Updates Setup

This guide walks you through setting up automated releases and auto-updates for the Tab Application Switcher native app.

## Prerequisites

✅ **Already Configured:**

- `electron-updater` is installed
- `electron-builder.yml` is configured for GitHub releases
- Auto-update code is integrated in the main process
- Build scripts are ready in `package.json`

## Step 1: Generate GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Give it a name: **"Tab App Switcher Releases"**
3. Select scopes: **`repo`** (full control of private repositories)
4. Click **"Generate token"**
5. **Copy the token immediately** (you won't see it again!)

## Step 2: Create .env File

Create a `.env` file in the `native` directory:

```bash
cd native
cp .env.example .env
```

Then edit `.env` and add your GitHub token:

```bash
# .env file
GH_TOKEN=your_github_token_here
```

**Important:**

- The `.env` file is already in `.gitignore` - never commit it!
- Keep your token secret and secure

## Step 3: Build and Publish Your First Release

```bash
cd native

# For macOS (recommended to start with your current platform):
npm run publish:mac

# Or for all platforms (if you want):
npm run publish
```

This will:

- Build your app
- Create installers (`.dmg` for Mac, `.exe` for Windows, `.AppImage` for Linux)
- Upload them to GitHub Releases as a **draft**
- Generate `latest-mac.yml`, `latest.yml`, etc. (metadata files for auto-updates)

**Note:** The first build may take several minutes.

## Step 4: Publish the Release on GitHub

1. Go to: https://github.com/mckinley/tab-app-switcher/releases
2. You'll see a draft release (version 0.1.0)
3. Edit the draft:
   - Add release notes (e.g., "Initial release of Tab Application Switcher")
   - Give it a title (e.g., "v0.1.0 - Initial Release")
4. Click **"Publish release"**

## Step 5: Test the Release

1. Download the installer from the GitHub release page
2. Install the app
3. Run it and verify it works correctly

## Step 6: Test Auto-Updates

1. Bump the version in `package.json`:

   ```json
   "version": "0.1.1",
   ```

2. Make a small change (optional - just for testing)

3. Build and publish again:

   ```bash
   npm run publish:mac
   ```

4. Publish the new release on GitHub (same as Step 4)

5. Open your installed app (version 0.1.0)
   - Check the console logs (if running from terminal)
   - The app should detect the update within 10 seconds
   - It will download and install on next restart

## How Auto-Updates Work

- **On Startup:** Checks for updates after 10 seconds
- **Periodic:** Checks every hour
- **Silent:** Downloads in background
- **Install:** Updates install when app is quit and restarted

## Troubleshooting

### "GH_TOKEN not found" error

- Make sure you created the `.env` file in the `native` directory
- Verify the token is set correctly in `.env`
- Check that `.env` is not empty or corrupted

### Build fails with code signing errors (macOS)

- This is expected if you don't have a Developer ID certificate
- For testing, you can disable code signing:
  ```bash
  export CSC_IDENTITY_AUTO_DISCOVERY=false
  npm run publish:mac
  ```
- **Warning:** Unsigned apps will show security warnings to users

### Auto-update not working

- Make sure the app is installed (not running from dev)
- Check console logs for update messages
- Verify the release is published (not draft) on GitHub
- Ensure version number increased

## Next Steps (Optional)

### Code Signing (Recommended for Distribution)

**macOS:**

- Requires Apple Developer account ($99/year)
- Need "Developer ID Application" certificate
- Add to your `.env` file:
  ```bash
  CSC_IDENTITY_AUTO_DISCOVERY=true
  APPLE_ID=your@apple.id
  APPLE_ID_PASSWORD=app-specific-password
  ```

**Windows:**

- Need code signing certificate (~$100-400/year)
- Or use free options like SignPath for open source

### GitHub Actions (Automated Builds)

Create `.github/workflows/release.yml` to automate builds when you push a tag.

See the main README for more details on these advanced topics.
