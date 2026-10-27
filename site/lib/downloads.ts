import nativePackage from "../../native/package.json"

const GITHUB_REPO = "mckinley/tab-app-switcher"

/**
 * The Mac app version the site links to: the latest published GitHub release, which the deploy
 * workflow passes in. native/package.json is ahead of it while a release is still building.
 */
export const NATIVE_VERSION: string = import.meta.env.PUBLIC_MAC_APP_VERSION || nativePackage.version

// GitHub release URL - direct download of the macOS zip
export const MACOS_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${NATIVE_VERSION}/Tab-Application-Switcher-${NATIVE_VERSION}-arm64-mac.zip`

// Extension Store URLs
const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"
export const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}`
export const FIREFOX_STORE_URL = "https://addons.mozilla.org/firefox/addon/tab-application-switcher/"
const EDGE_EXTENSION_ID = "epfinbjjhhlpbfcdmdhnddbjebmbkjck"
export const EDGE_STORE_URL = `https://microsoftedge.microsoft.com/addons/detail/${EDGE_EXTENSION_ID}`
export const SAFARI_STORE_URL = "https://apps.apple.com/app/tab-application-switcher/id6756280616"
