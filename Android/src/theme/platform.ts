import { Platform } from "react-native";

export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";

/** Glass effect config per platform */
export const glassConfig = {
  /** iOS uses real blur, Android uses semi-transparent background */
  useBlur: isIOS,
  /** Blur intensity for iOS BlurView */
  blurIntensity: 20,
  /** Blur tint for iOS */
  blurTint: "dark" as const,
  /** Fallback background for Android (no blur) */
  androidBackground: "rgba(255, 255, 255, 0.05)",
  /** Border style for glass elements */
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderWidth: 1,
};

/** Platform-specific shadow styles */
export const shadowConfig = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: { elevation: 8 },
  }),
  glow: Platform.select({
    ios: {
      shadowColor: "#256af4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
  }),
};
