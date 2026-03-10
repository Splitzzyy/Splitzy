import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerHaptic } from "@/utils/haptics";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { categorizeExpense } from "@/utils/categorizeExpense";

interface ExpenseListItemProps {
  expenseId: number;
  name: string;
  amount: number;
  paidBy: string;
  youOwe: number;
  youLent: number;
  onPress: (expenseId: number) => void;
}

export function ExpenseListItem({
  expenseId,
  name,
  amount,
  paidBy,
  youOwe,
  youLent,
  onPress,
}: ExpenseListItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    triggerHaptic();
    onPress(expenseId);
  };

  // Determine status text and color
  const isOwed = youLent > 0;
  const isOwe = youOwe > 0;
  const statusText = isOwed
    ? `You are owed ${formatCurrency(youLent)}`
    : isOwe
      ? `You owe ${formatCurrency(youOwe)}`
      : "No split";
  const statusColor = isOwed
    ? colors.semantic.positive
    : isOwe
      ? colors.semantic.negative
      : colors.text.tertiary;

  const cat = CATEGORY_CONFIG[categorizeExpense(name)];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.card,
          borderColor: colors.glass.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: cat.color + "33" }]}>
        <MaterialCommunityIcons
          name={cat.icon as any}
          size={22}
          color={cat.color}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.paidBy, { color: colors.text.secondary }]}>
          Paid by <Text style={[styles.paidByName, { color: colors.text.secondary }]}>{paidBy}</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text.primary }]}>{formatCurrency(amount)}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
      </View>
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
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
  },
  paidBy: {
    fontSize: 12,
    fontFamily: "Inter",
  },
  paidByName: {},
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
  },
  status: {
    fontSize: 11,
    fontFamily: "Inter",
  },
});
