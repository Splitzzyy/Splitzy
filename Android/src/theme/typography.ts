import { Platform } from "react-native";

export const fontFamily = {
  regular: Platform.select({ ios: "System", default: "Inter" }),
  light: Platform.select({ ios: "System", default: "Inter-Light" }),
  medium: Platform.select({ ios: "System", default: "Inter-Medium" }),
  semibold: Platform.select({ ios: "System", default: "Inter-SemiBold" }),
  bold: Platform.select({ ios: "System", default: "Inter-Bold" }),
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;
