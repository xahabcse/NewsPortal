/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-bg) / <alpha-value>)",
        foreground: "rgb(var(--color-fg) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        glass: "var(--color-glass)",
        "glass-border": "var(--color-glass-border)",
        "glass-surface": "var(--color-glass-surface)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
