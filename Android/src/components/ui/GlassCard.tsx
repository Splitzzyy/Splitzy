import { View, ViewProps, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { isIOS, glassConfig } from "@/theme";

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
  const bgColor =
    variant === "panel" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.05)";
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
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.border}>{children}</View>
      </View>
    );
  }

  return (
    <View
      className={className}
      style={[
        styles.wrapper,
        { backgroundColor: bgColor, borderColor: glassConfig.borderColor, borderWidth: 1 },
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
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
  },
});
