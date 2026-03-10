import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettingsStore, type ThemeMode } from "@/stores/settings.store";
import { darkTheme, lightTheme, type ThemeColors } from "./colors";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkTheme,
  isDark: true,
  mode: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const value = useMemo(() => {
    let isDark: boolean;
    if (theme === "system") {
      isDark = systemScheme !== "light";
    } else {
      isDark = theme === "dark";
    }
    return {
      colors: isDark ? darkTheme : lightTheme,
      isDark,
      mode: theme,
    };
  }, [theme, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
