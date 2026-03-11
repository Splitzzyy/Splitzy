import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatRelativeTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";
import type { RecentActivityDTO } from "@/types/api.types";

/** Shorten "Harsh Kumar" → "Harsh K." */
function formatName(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface ActivityItemProps {
  activity: RecentActivityDTO;
  onPress?: () => void;
}

export function ActivityItem({ activity, onPress }: ActivityItemProps) {
  const { colors } = useTheme();

  function getActivityIcon(action: string): {
    name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    bgColor: string;
    iconColor: string;
  } {
    const a = action.toLowerCase();
    if (a.includes("settle") || a.includes("paid"))
      return {
        name: "cash-check",
        bgColor: "rgba(52, 211, 153, 0.1)",
        iconColor: colors.semantic.positive,
      };
    if (a.includes("added") || a.includes("created"))
      return {
        name: "plus-circle-outline",
        bgColor: "rgba(37, 106, 244, 0.1)",
        iconColor: colors.primary,
      };
    if (a.includes("updated") || a.includes("edited"))
      return {
        name: "pencil-outline",
        bgColor: "rgba(251, 191, 36, 0.1)",
        iconColor: colors.semantic.warning,
      };
    if (a.includes("deleted") || a.includes("removed"))
      return {
        name: "trash-can-outline",
        bgColor: "rgba(251, 113, 133, 0.1)",
        iconColor: colors.semantic.negative,
      };
    return {
      name: "information-outline",
      bgColor: "rgba(37, 106, 244, 0.1)",
      iconColor: colors.primary,
    };
  }

  const icon = getActivityIcon(activity.action);

  const impactColor =
    activity.impact.type === "get_back"
      ? colors.semantic.positive
      : activity.impact.type === "owe"
        ? colors.semantic.negative
        : colors.text.tertiary;

  const impactLabel =
    activity.impact.type === "get_back"
      ? "get back"
      : activity.impact.type === "owe"
        ? "you owe"
        : "";

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.panel,
          borderColor: colors.glass.borderLight,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: icon.bgColor }]}>
        <MaterialCommunityIcons
          name={icon.name}
          size={22}
          color={icon.iconColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text.primary }]} numberOfLines={1}>
          <Text style={[styles.actor, { color: colors.primary }]}>{formatName(activity.actor)}</Text> {activity.action}{" "}
          {activity.expenseName}
        </Text>
        <Text style={[styles.groupName, { color: colors.text.secondary }]} numberOfLines={1}>
          {activity.groupName}
        </Text>
        <Text style={[styles.time, { color: colors.text.tertiary }]}>
          {formatRelativeTime(activity.createdAt)}
        </Text>
      </View>

      {activity.impact.amount > 0 && (
        <View style={styles.amountCol}>
          <Text style={[styles.amount, { color: colors.text.primary }]}>
            {formatCurrency(activity.impact.amount)}
          </Text>
          {impactLabel ? (
            <Text style={[styles.impactLabel, { color: impactColor }]}>
              {impactLabel}
            </Text>
          ) : null}
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  actor: {},
  time: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    marginTop: 1,
  },
  groupName: {
    fontSize: 12,
    fontFamily: "Inter",
  },
  amountCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
  impactLabel: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    letterSpacing: -0.3,
  },
});
