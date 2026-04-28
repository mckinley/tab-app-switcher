import { defineConfig } from "astro/config"
import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"

// pjmgmt: dev-port — load PORT from .env.development before Astro's own env loader runs
import { readFileSync as __readDevEnv } from 'node:fs'
const __devPort = (() => {
  try {
    const m = __readDevEnv('.env.development', 'utf8').match(/^PORT=(\d+)/m)
    return m ? Number(m[1]) : undefined
  } catch {
    return undefined
  }
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
