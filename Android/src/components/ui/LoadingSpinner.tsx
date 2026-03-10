import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
}

export function LoadingSpinner({
  message,
  size = "large",
}: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={[styles.text, { color: colors.text.secondary }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter",
  },
});
