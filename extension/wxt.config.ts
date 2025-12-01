import { defineConfig } from "wxt"
import path from "path"

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    version: "1.0.7",
    homepage_url: "https://tabappswitcher.com",
    author: "Tab Application Switcher",
    permissions: ["tabs", "storage"],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "/icon/16.png",
      32: "/icon/32.png",
      48: "/icon/48.png",
      96: "/icon/96.png",
      128: "/icon/128.png",
    },
    action: {
      default_title: "Tab Application Switcher",
      default_icon: {
        16: "/icon/16.png",
        32: "/icon/32.png",
      },
    },
    // Commands - Firefox doesn't support Alt+Tab as it's an OS-reserved shortcut
    commands:
      browser === "firefox"
        ? {
            tas_activate: {
              description: "Activate Tab Application Switcher",
            },
          }
        : {
            tas_activate: {
              suggested_key: {
                default: "Alt+Tab",
              },
              description: "Activate Tab Application Switcher",
            },
          },
    // Only include chrome_url_overrides for Chrome/Edge (not supported in Firefox/Safari)
    ...(browser !== "firefox" && browser !== "safari"
      ? {
          chrome_url_overrides: {
            newtab: "/tabs.html",
          },
        }
      : {}),
    // Firefox-specific settings
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "tab-application-switcher@tabappswitcher.com",
              strict_min_version: "109.0",
            },
          },
        }
      : {}),
  }),
  vite: () => ({
    resolve: {
      alias: {
        "@tas": path.resolve(__dirname, "../tas"),
        "@": path.resolve(__dirname, "."),
      },
      dedupe: ["react", "react-dom"],
    },
  }),
})
