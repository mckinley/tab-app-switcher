import { defineConfig } from "wxt"
import path from "path"

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Tab Application Switcher",
    description: "Switch between browser tabs like you switch between applications",
    version: "1.0.6",
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
    commands: {
      tas_activate: {
        suggested_key: {
          default: "Alt+Tab",
        },
        description: "Activate Tab Application Switcher",
      },
    },
    chrome_url_overrides: {
      newtab: "/tabs.html",
    },
  },
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
