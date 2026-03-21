import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#080c10",
          container: "#111820",
          bright: "#1e2a36",
          variant: "#162030",
        },
        primary: {
          DEFAULT: "#ff8c42",
          container: "#ff6b1a",
        },
        secondary: {
          DEFAULT: "#00f4fe",
          fixed: "#00e5ee",
        },
        tertiary: {
          DEFAULT: "#c97cff",
          fixed: "#d597ff",
        },
        achievement: "#ffc833",
        action: "#ff7a33",
        "on-surface": "#f0f4ff",
        "on-surface-variant": "#a7abb2",
        "on-primary": "#080c10",
        outline: "rgba(67, 72, 78, 0.15)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Space Grotesk", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      spacing: {
        tight: "0.5rem",
        section: "1.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
