import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — update these to match your DESIGN.md brand colors.
// After changing hex values here, your entire app updates automatically.
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0f6b70",      // teal
        "primary-hover": "#1a8a8f",
        dark: "#14272a",         // ink
        "ink-2": "#3a4a4d",
        "ink-3": "#6b7a7d",
        accent: "#a3320b",       // rust
        "accent-hover": "#c44a18",
        purple: "#4e0f70",
        "purple-hover": "#6e2090",
        olive: "#5c700f",
        gold: "#efa00b",
        navy: "#1a3a5a",
        "pin-red": "#d92b2b",
        light: "#faf7f1",        // cream
        paper: "#ffffff",
        border: "#e3dccf",       // line
        "border-2": "#c9bfac",
        "teal-tint": "#e5f0f0",
        "rust-tint": "#f6e4dc",
        "purple-tint": "#ece2f1",
        "olive-tint": "#eaedd9",
        "gold-tint": "#fcecc6",
        muted: "#6b7a7d",
      },
      fontFamily: {
        display: ["League Spartan", "system-ui", "sans-serif"],
        sans: ["Montserrat", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        pill: "0",
      },
      boxShadow: {
        1: "0 1px 2px rgba(20, 39, 42, 0.06)",
        2: "0 4px 14px rgba(20, 39, 42, 0.08)",
        3: "0 10px 30px rgba(20, 39, 42, 0.10)",
        press: "inset 0 2px 4px rgba(20, 39, 42, 0.12)",
      },
      transitionTimingFunction: {
        ml: "cubic-bezier(.2, .7, .2, 1)",
        "ml-out": "cubic-bezier(.16, 1, .3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
