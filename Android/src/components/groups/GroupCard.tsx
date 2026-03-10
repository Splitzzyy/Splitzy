import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { triggerHaptic } from "@/utils/haptics";
import { useTheme } from "@/theme";
import { formatCurrency } from "@/utils/formatCurrency";

const GROUP_GRADIENTS: [string, string][] = [
  ["rgba(59,130,246,0.2)", "rgba(99,102,241,0.2)"],
  ["rgba(249,115,22,0.2)", "rgba(234,179,8,0.2)"],
  ["rgba(168,85,247,0.2)", "rgba(236,72,153,0.2)"],
  ["rgba(6,182,212,0.2)", "rgba(20,184,166,0.2)"],
  ["rgba(16,185,129,0.2)", "rgba(5,150,105,0.2)"],
  ["rgba(244,63,94,0.2)", "rgba(249,115,22,0.2)"],
];

const GROUP_ICON_COLORS = [
  "#60a5fa",
  "#f97316",
  "#c084fc",
  "#22d3ee",
  "#34d399",
  "#fb7185",
];

const GROUP_ICONS: React.ComponentProps<typeof MaterialCommunityIcons>["name"][] = [
  "home-variant",
  "airplane",
  "silverware-fork-knife",
  "car",
  "lightning-bolt",
  "account-group",
];

interface GroupCardProps {
  groupId: number;
  groupName: string;
  netBalance?: number;
  onPress: (groupId: number) => void;
}

export function GroupCard({
  groupId,
  groupName,
  netBalance = 0,
  onPress,
}: GroupCardProps) {
  const { colors } = useTheme();
  const idx = groupId % GROUP_GRADIENTS.length;

  const handlePress = () => {
    triggerHaptic();
    onPress(groupId);
  };

  const balanceColor =
    netBalance > 0
      ? colors.semantic.positive
      : netBalance < 0
        ? colors.semantic.negative
        : colors.text.tertiary;

  const balanceIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    netBalance > 0
      ? "arrow-up"
      : netBalance < 0
        ? "arrow-down"
        : "check-circle-outline";

  const balanceText =
    netBalance > 0
      ? `You are owed ${formatCurrency(netBalance)}`
      : netBalance < 0
        ? `You owe ${formatCurrency(netBalance)}`
        : "Settled up";

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.panel,
          borderColor: colors.glass.borderLight,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={GROUP_GRADIENTS[idx]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <MaterialCommunityIcons
          name={GROUP_ICONS[idx]}
          size={28}
          color={GROUP_ICON_COLORS[idx]}
        />
      </LinearGradient>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
          {groupName}
        </Text>
        <View style={styles.balanceRow}>
          <MaterialCommunityIcons
            name={balanceIcon}
            size={14}
            color={balanceColor}
          />
          <Text style={[styles.balanceText, { color: balanceColor }]}>
            {balanceText}
          </Text>
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={colors.text.hint}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  balanceText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
  },
});
