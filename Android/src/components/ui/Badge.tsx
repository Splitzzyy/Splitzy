import { View, Text, StyleSheet } from "react-native";

type BadgeVariant = "new" | "settled" | "pending" | "info";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  new: { bg: "rgba(37, 106, 244, 0.15)", text: "#60a5fa" },
  settled: { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399" },
  pending: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24" },
  info: { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8" },
};

export function Badge({ label, variant = "info" }: BadgeProps) {
  const { bg, text } = VARIANT_STYLES[variant];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontFamily: "Inter-SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
