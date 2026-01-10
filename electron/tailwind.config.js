/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        foreground: "#f8fafc",
        primary: "#38bdf8",
        "primary-foreground": "#0f172a",
        secondary: "#1e293b",
        "secondary-foreground": "#f8fafc",
        muted: "#334155",
        "muted-foreground": "#94a3b8",
        accent: "#818cf8",
        "accent-foreground": "#f8fafc",
        border: "rgba(255,255,255,0.1)",
        success: "#22c55e",
        destructive: "#ef4444",
      },
    },
  },
  plugins: [],
}
