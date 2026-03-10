/** Shared colors that don't change between themes */
export const palette = {
  primary: "#256af4",
  primaryLight: "rgba(37, 106, 244, 0.1)",
  primaryGlow: "rgba(37, 106, 244, 0.4)",

  semantic: {
    positive: "#34d399",
    negative: "#fb7185",
    warning: "#fbbf24",
    info: "#60a5fa",
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

/** Theme-dependent colors */
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryGlow: string;

  background: {
    main: string;
    secondary: string;
    card: string;
    gradient: readonly [string, string];
  };

  glass: {
    panel: string;
    card: string;
    border: string;
    borderLight: string;
  };

  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    hint: string;
  };

  semantic: {
    positive: string;
    negative: string;
    warning: string;
    info: string;
  };

  category: typeof palette.category;

  overlay: string;
  divider: string;
  tabBar: string;
  modalBackground: string;
  inputBackground: string;
  inputBackgroundFocused: string;
  inputBorder: string;
  error: string;
  sheetHandle: string;

  toast: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };

  toastText: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };

  switchTrack: { on: string; off: string };
  switchThumb: { on: string; off: string };
}

export const darkTheme: ThemeColors = {
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryGlow: palette.primaryGlow,

  background: {
    main: "#0a0f18",
    secondary: "#1a233a",
    card: "#0f1729",
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
    hint: "#475569",
  },

  semantic: palette.semantic,
  category: palette.category,

  overlay: "rgba(0, 0, 0, 0.7)",
  divider: "rgba(255, 255, 255, 0.05)",
  tabBar: "rgba(10, 15, 24, 0.95)",
  modalBackground: "#0f1729",
  inputBackground: "rgba(255, 255, 255, 0.05)",
  inputBackgroundFocused: "rgba(37, 106, 244, 0.05)",
  inputBorder: "rgba(255, 255, 255, 0.08)",
  error: "#ef4444",
  sheetHandle: "rgba(255, 255, 255, 0.2)",

  toast: {
    success: "#0d2818",
    error: "#2a0f13",
    warning: "#2a2008",
    info: "#0c1a30",
  },

  toastText: {
    success: "#34d399",
    error: "#fb7185",
    warning: "#fbbf24",
    info: "#60a5fa",
  },

  switchTrack: { on: "rgba(37, 106, 244, 0.4)", off: "rgba(255, 255, 255, 0.1)" },
  switchThumb: { on: palette.primary, off: "#64748b" },
};

export const lightTheme: ThemeColors = {
  primary: palette.primary,
  primaryLight: "rgba(37, 106, 244, 0.08)",
  primaryGlow: "rgba(37, 106, 244, 0.25)",

  background: {
    main: "#f8fafc",
    secondary: "#f1f5f9",
    card: "#ffffff",
    gradient: ["#f1f5f9", "#f8fafc"] as const,
  },

  glass: {
    panel: "rgba(0, 0, 0, 0.02)",
    card: "rgba(0, 0, 0, 0.03)",
    border: "rgba(0, 0, 0, 0.08)",
    borderLight: "rgba(0, 0, 0, 0.12)",
  },

  text: {
    primary: "#0f172a",
    secondary: "#475569",
    tertiary: "#94a3b8",
    inverse: "#ffffff",
    hint: "#94a3b8",
  },

  semantic: {
    positive: "#059669",
    negative: "#e11d48",
    warning: "#d97706",
    info: "#2563eb",
  },

  category: palette.category,

  overlay: "rgba(0, 0, 0, 0.4)",
  divider: "rgba(0, 0, 0, 0.06)",
  tabBar: "rgba(255, 255, 255, 0.95)",
  modalBackground: "#ffffff",
  inputBackground: "rgba(0, 0, 0, 0.03)",
  inputBackgroundFocused: "rgba(37, 106, 244, 0.04)",
  inputBorder: "rgba(0, 0, 0, 0.1)",
  error: "#dc2626",
  sheetHandle: "rgba(0, 0, 0, 0.15)",

  toast: {
    success: "#d1fae5",
    error: "#ffe4e6",
    warning: "#fef3c7",
    info: "#dbeafe",
  },

  toastText: {
    success: "#059669",
    error: "#e11d48",
    warning: "#d97706",
    info: "#2563eb",
  },

  switchTrack: { on: "rgba(37, 106, 244, 0.4)", off: "rgba(0, 0, 0, 0.1)" },
  switchThumb: { on: palette.primary, off: "#94a3b8" },
};

/**
 * @deprecated Use useTheme() hook instead for theme-aware colors.
 * Kept for backward compatibility during migration.
 */
export const colors = {
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryGlow: palette.primaryGlow,
  background: {
    dark: darkTheme.background.main,
    darkSecondary: darkTheme.background.secondary,
    gradient: darkTheme.background.gradient,
  },
  glass: darkTheme.glass,
  text: { ...darkTheme.text },
  semantic: palette.semantic,
  category: palette.category,
} as const;
