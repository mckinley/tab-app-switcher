import type { Config } from "tailwindcss"
import tasPreset from "../tas/tailwind.preset"

export default {
  presets: [tasPreset],
  content: ["./src/renderer/**/*.{ts,tsx,html}", "../tas/**/*.{ts,tsx}"],
} satisfies Config

