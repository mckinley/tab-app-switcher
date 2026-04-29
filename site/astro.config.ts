import { defineConfig } from "astro/config"
import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"

// pjmgmt: dev-port — load PORT from .env.development before Astro's own env loader runs
import { loadEnv as __loadDevEnv } from 'vite'
const __devPort = (() => {
  const env = __loadDevEnv('development', '.', '')
  const n = Number(env.PORT)
  return Number.isFinite(n) ? n : undefined
})()


const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: { port: __devPort },
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [react()],
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
