import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        overlay: {
          bg: "rgba(17, 17, 17, 0.92)",
          surface: "rgba(30, 30, 30, 0.95)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        speaker: {
          self: "#60a5fa",
          other: "#a78bfa",
          third: "#34d399",
        },
        pi: {
          accent: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.08)",
          border: "rgba(245, 158, 11, 0.2)",
        },
      },
      animation: {
        "slide-in": "slideIn 0.25s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
