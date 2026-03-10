import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  hapticsEnabled: boolean;
  isLoaded: boolean;

  setTheme: (theme: ThemeMode) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = "splitzy_settings";

async function persistSettings(theme: ThemeMode, hapticsEnabled: boolean) {
  try {
    await SecureStore.setItemAsync(
      SETTINGS_KEY,
      JSON.stringify({ theme, hapticsEnabled })
    );
  } catch {
    // Silent fail
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "dark",
  hapticsEnabled: true,
  isLoaded: false,

  setTheme: (theme) => {
    set({ theme });
    persistSettings(theme, get().hapticsEnabled);
  },

  setHapticsEnabled: (enabled) => {
    set({ hapticsEnabled: enabled });
    persistSettings(get().theme, enabled);
  },

  loadSettings: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          theme: parsed.theme ?? "dark",
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
