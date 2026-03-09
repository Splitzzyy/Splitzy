import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatRelativeTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";
import type { RecentActivityDTO } from "@/types/api.types";

interface ActivityItemProps {
  activity: RecentActivityDTO;
}

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

export function ActivityItem({ activity }: ActivityItemProps) {
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

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: icon.bgColor }]}>
        <MaterialCommunityIcons
          name={icon.name}
          size={22}
          color={icon.iconColor}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.description} numberOfLines={1}>
            <Text style={styles.actor}>{activity.actor}</Text> {activity.action}{" "}
            {activity.expenseName}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(activity.createdAt)}
          </Text>
        </View>
        <Text style={styles.groupName} numberOfLines={1}>
          {activity.groupName}
        </Text>
      </View>

      {activity.impact.amount > 0 && (
        <View style={styles.amountCol}>
          <Text style={styles.amount}>
            {formatCurrency(activity.impact.amount)}
          </Text>
          {impactLabel ? (
            <Text style={[styles.impactLabel, { color: impactColor }]}>
              {impactLabel}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  description: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
    flex: 1,
  },
  actor: {
    color: colors.primary,
  },
  time: {
    color: "#64748b",
    fontSize: 10,
    fontFamily: "Inter-Medium",
  },
  groupName: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Inter",
  },
  amountCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    color: "#ffffff",
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
