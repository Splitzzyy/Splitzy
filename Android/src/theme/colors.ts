export const colors = {
  primary: "#256af4",
  primaryLight: "rgba(37, 106, 244, 0.1)",
  primaryGlow: "rgba(37, 106, 244, 0.4)",

  background: {
    dark: "#0a0f18",
    darkSecondary: "#1a233a",
    gradient: ["#1a233a", "#0a0f18"] as const,
  },

  glass: {
    panel: "rgba(255, 255, 255, 0.03)",
    card: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.1)",
  },

  text: {
    primary: "#ffffff",
    secondary: "#94a3b8",
    tertiary: "#64748b",
    inverse: "#0a0f18",
  },

  semantic: {
    positive: "#34d399", // emerald-400
    negative: "#fb7185", // rose-400
    warning: "#fbbf24", // amber-400
    info: "#60a5fa", // blue-400
  },

  category: {
    food: "#f97316",
    travel: "#3b82f6",
    utilities: "#eab308",
    entertainment: "#a855f7",
    housing: "#06b6d4",
    healthcare: "#ef4444",
    shopping: "#ec4899",
    transportation: "#14b8a6",
    education: "#8b5cf6",
    personal: "#f43f5e",
    other: "#6b7280",
  },
} as const;
