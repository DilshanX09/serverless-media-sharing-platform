import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand-yellow)",
          foreground: "var(--brand-foreground)",
          dim: "rgba(232,255,71,0.08)",
          border: "rgba(232,255,71,0.2)",
        },
        surface: {
          DEFAULT: "var(--bg-surface)",
          2: "var(--bg-surface-2)",
          3: "var(--bg-surface-3)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          2: "var(--text-secondary)",
          3: "var(--text-tertiary)",
        },
        base: {
          DEFAULT: "var(--bg-base)",
        },
        border: {
          soft: "var(--border-soft)",
          mid: "var(--border-mid)",
          strong: "var(--border-strong)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        modalPop: {
          "0%": { opacity: "0", transform: "scale(0.93)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease both",
        "fade-up-1": "fadeUp 0.35s 0.05s ease both",
        "fade-up-2": "fadeUp 0.35s 0.12s ease both",
        "fade-up-3": "fadeUp 0.35s 0.19s ease both",
        "modal-pop": "modalPop 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
