import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#060D0A",
          secondary: "#0C1A14",
          card: "#101E17",
          border: "#1A2E24",
        },
        mint: {
          DEFAULT: "#5EBAA0",
          dim: "#3D8A74",
          bright: "#7ECFB5",
          muted: "#2A5C4D",
        },
        status: {
          healthy: "#2ECC71",
          warning: "#F39C12",
          critical: "#E74C3C",
          unknown: "#6B7280",
        },
        text: {
          primary: "#E8F5F1",
          secondary: "#8BA89A",
          muted: "#4A6358",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
