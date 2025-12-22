import { defineConfig } from "wxt"
import path from "path"

// See https://wxt.dev/api/config.html
export default defineConfig({
  dev: {
    server: {
      port: 3005,
    },
  },
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    version: "1.2.0",
    homepage_url: "https://tabappswitcher.com",
    author: "Tab Application Switcher",
    permissions: ["tabs", "storage", "identity", "sessions"],
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
    // Make tabs.html accessible to other extensions (e.g., new tab redirectors)
    web_accessible_resources:
      browser === "firefox" || browser === "safari"
        ? ["tabs.html"]
        : [{ resources: ["tabs.html"], matches: ["<all_urls>"] }],
    // Commands - Firefox and Safari don't support Alt+Tab (OS-reserved), use Alt+1 instead
    commands: {
      tas_activate: {
        suggested_key: {
          default: browser === "firefox" || browser === "safari" ? "Alt+1" : "Alt+Tab",
        },
        description: "Activate Tab Application Switcher",
      },
    },
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
