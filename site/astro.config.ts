import { defineConfig } from "astro/config"
import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"

// pjmgmt: dev-port — load PORT from .env.development before Astro's own env loader runs
import { loadEnv as __loadDevEnv } from "vite"
const __devPort = (() => {
  const env = __loadDevEnv("development", ".", "")
  const n = Number(env.PORT)
  return Number.isFinite(n) ? n : undefined
})()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: { port: __devPort },
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  // No trailing slash (pjmgmt's url-format standard): /about is about.html, served as it is,
  // and public/_redirects sends /about/ there with a 301.
  trailingSlash: "never",
  build: { format: "file" },
  // src/middleware.ts makes the same check, except for Sign in with Apple's callback, which
  // appleid.apple.com posts to
  security: { checkOrigin: false },
  integrations: [
    react(),
    // Signed-in pages are left out (they are noindex)
    sitemap({ filter: (page) => !/\/(account|collections|login)$/.test(new URL(page).pathname) }),
  ],
  vite: {
    // @ts-expect-error - tailwind v4 vite plugin type incompatibility with astro's bundled vite
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@tas": path.resolve(__dirname, "../tas"),
      },
      dedupe: ["react", "react-dom"],
    },
  },
  site: "https://tabappswitcher.com",
})
