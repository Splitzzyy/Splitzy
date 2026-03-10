import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.glass.panel }]}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.text.hint} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.text.tertiary }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
