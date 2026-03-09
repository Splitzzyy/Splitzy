/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#256af4",
        "background-dark": "#0a0f18",
        "background-dark-secondary": "#1a233a",
        "glass-panel": "rgba(255, 255, 255, 0.03)",
        "glass-card": "rgba(255, 255, 255, 0.05)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
        "glass-border-light": "rgba(255, 255, 255, 0.1)",
      },
      fontFamily: {
        display: ["Inter"],
        "display-light": ["Inter-Light"],
        "display-medium": ["Inter-Medium"],
        "display-semibold": ["Inter-SemiBold"],
        "display-bold": ["Inter-Bold"],
      },
    },
  },
  plugins: [],
};
