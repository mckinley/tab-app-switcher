import type { Config } from "tailwindcss"

const sharedPreset = {
  darkMode: ["class"],
  theme: {
    extend: {
      zIndex: {
        // Portal-rendered components (dropdowns, tooltips, selects, popovers)
        // These must be higher than any overlay to ensure they appear on top
        portal: "100",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        switcher: {
          bg: "hsl(var(--switcher-bg))",
          item: "hsl(var(--switcher-item))",
          "item-hover": "hsl(var(--switcher-item-hover))",
          "item-selected": "hsl(var(--switcher-item-selected))",
          shadow: "hsl(var(--switcher-shadow))",
        },
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        smooth: "var(--transition-smooth)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", filter: "blur(4px)" },
          "100%": { opacity: "1", filter: "blur(0px)" },
        },
        "fade-out": {
          "0%": { opacity: "1", filter: "blur(0px)" },
          "100%": { opacity: "0", filter: "blur(4px)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.8s ease-out forwards",
        "fade-out": "fade-out 0.3s ease-out forwards",
        "bounce-gentle": "bounce-gentle 3s ease-in-out infinite",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Partial<Config>

export default sharedPreset
