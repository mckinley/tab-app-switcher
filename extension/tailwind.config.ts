import type { Config } from "tailwindcss"
import sharedPreset from "../tas/tailwind.preset"

const config = {
  presets: [sharedPreset],
  content: [
    "./entrypoints/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../tas/components/**/*.{ts,tsx}",
    "../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config

export default config
