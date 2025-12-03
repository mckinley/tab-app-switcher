import type { Config } from "tailwindcss"
import sharedPreset from "../tas/tailwind.preset"

const config = {
  darkMode: ["class"],
  presets: [sharedPreset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./App.tsx",
    "./main.tsx",
    "../tas/**/*.{ts,tsx}",
    "../packages/ui/src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
  },
} satisfies Config

export default config
