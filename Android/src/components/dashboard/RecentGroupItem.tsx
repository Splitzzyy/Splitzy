import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { formatSignedCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

// Gradient presets for group icons
const GROUP_GRADIENTS: [string, string][] = [
  ["#6366f1", "#a855f7"], // indigo → purple
  ["#f97316", "#f43f5e"], // orange → rose
  ["#06b6d4", "#3b82f6"], // cyan → blue
  ["#10b981", "#059669"], // emerald → green
  ["#eab308", "#f97316"], // yellow → orange
  ["#ec4899", "#a855f7"], // pink → purple
];

const GROUP_ICONS: React.ComponentProps<typeof MaterialCommunityIcons>["name"][] = [
  "home-variant",
  "airplane",
  "silverware-fork-knife",
  "cart",
  "lightning-bolt",
  "account-group",
];

interface RecentGroupItemProps {
  groupId: number;
  groupName: string;
  netBalance: number;
  onPress: (groupId: number) => void;
}

export function RecentGroupItem({
  groupId,
  groupName,
  netBalance,
  onPress,
}: RecentGroupItemProps) {
  const gradientIndex = groupId % GROUP_GRADIENTS.length;
  const iconIndex = groupId % GROUP_ICONS.length;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(groupId);
  };

  const balanceColor =
    netBalance > 0
      ? colors.semantic.positive
      : netBalance < 0
        ? colors.semantic.negative
        : colors.text.tertiary;

  const balanceText =
    netBalance === 0 ? "Settled" : formatSignedCurrency(netBalance);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={GROUP_GRADIENTS[gradientIndex]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <MaterialCommunityIcons
          name={GROUP_ICONS[iconIndex]}
          size={22}
          color="#ffffff"
        />
      </LinearGradient>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {groupName}
        </Text>
      </View>

      <Text style={[styles.balance, { color: balanceColor }]}>
        {balanceText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
  info: {
    flex: 1,
  },
  name: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  balance: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
});
