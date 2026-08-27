/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Playfair Display is the one font — everywhere.
        sans: ['"Playfair Display"', "Georgia", "serif"],
        display: ['"Playfair Display"', "Georgia", "serif"],
      },
      colors: {
        wandor: {
          dark: "#0a0a0a",
          text: "#1a1a1a",
          muted: "#767676",
          prompt: "#905831",
          paper: "#f7f5f1",
          line: "#e5e1d8",
          // cinematic editorial theme (below the fold)
          accent: "#e63b2e",
          night: "#050505",
        },
      },
    },
  },
  plugins: [],
};
