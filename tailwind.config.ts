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
        // Primary — buttons, active nav, key accents
        // Change to your brand's primary color from DESIGN.md
        primary: "#6366f1",

        // Dark — sidebar, headings, strong text
        dark: "#1e1b4b",

        // Accent — secondary highlights, badges, success states
        accent: "#10b981",

        // Gold — warnings, star ratings, attention-drawing elements
        gold: "#f59e0b",

        // Light — page background, card backgrounds, canvas
        light: "#f8f9ff",

        // Border — dividers, input outlines, subtle separators
        border: "#e2e8f0",

        // Muted — secondary text, metadata, timestamps
        muted: "#64748b",
      },
      fontFamily: {
        // Heading font — change to your preferred serif or display font
        serif: ["Playfair Display", "Georgia", "serif"],
        // Body font — clean sans-serif recommended for readability
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
