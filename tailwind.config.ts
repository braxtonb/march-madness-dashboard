import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0f14",
          container: "#141a20",
          bright: "#252d35",
          variant: "#1c2430",
        },
        primary: {
          DEFAULT: "#ff9159",
          container: "#ff7a2f",
        },
        secondary: {
          DEFAULT: "#2dd4bf",
          fixed: "#5eead4",
        },
        tertiary: {
          DEFAULT: "#a78bfa",
          fixed: "#c4b5fd",
        },
        achievement: "#fbbf24",
        action: "#fb923c",
        "on-surface": "#e7ebf3",
        "on-surface-variant": "#8b95a5",
        "on-primary": "#0a0f14",
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
