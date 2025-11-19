import type { Config } from "tailwindcss";
import sharedPreset from "./tas/tailwind.preset";

const config = {
  presets: [sharedPreset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./site/**/*.{ts,tsx}",
    "./tas/**/*.{ts,tsx}",
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
} satisfies Config;

export default config;
