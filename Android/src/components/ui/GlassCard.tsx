import { View, ViewProps, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { isIOS, useTheme } from "@/theme";

interface GlassCardProps extends ViewProps {
  /** Use stronger glass effect (panel vs card) */
  variant?: "card" | "panel";
  children: React.ReactNode;
}

export function GlassCard({
  variant = "card",
  style,
  className,
  children,
  ...props
}: GlassCardProps) {
  const { colors, isDark } = useTheme();
  const bgColor = variant === "panel" ? colors.glass.panel : colors.glass.card;
  const blurIntensity = variant === "panel" ? 20 : 12;

  if (isIOS) {
    return (
      <View
        className={className}
        style={[styles.wrapper, style]}
        {...props}
      >
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.border, { borderColor: colors.glass.border }]}>{children}</View>
      </View>
    );
  }

  return (
    <View
      className={className}
      style={[
        styles.wrapper,
        { backgroundColor: bgColor, borderColor: colors.glass.border, borderWidth: 1 },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderRadius: 16,
  },
  border: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
  },
});
