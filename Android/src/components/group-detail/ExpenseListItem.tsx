import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";
import { CATEGORY_CONFIG, ExpenseCategory } from "@/constants/categories";

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
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // Pick a category icon by simple heuristic from expense name
  const guessCategory = (): ExpenseCategory => {
    const n = name.toLowerCase();
    if (n.includes("food") || n.includes("dinner") || n.includes("lunch") || n.includes("restaurant") || n.includes("gourmet"))
      return ExpenseCategory.Food;
    if (n.includes("travel") || n.includes("trip") || n.includes("flight") || n.includes("hotel") || n.includes("cabin"))
      return ExpenseCategory.Travel;
    if (n.includes("car") || n.includes("uber") || n.includes("gas") || n.includes("rental"))
      return ExpenseCategory.Transportation;
    if (n.includes("shop") || n.includes("buy"))
      return ExpenseCategory.Shopping;
    return ExpenseCategory.Other;
  };

  const cat = CATEGORY_CONFIG[guessCategory()];

  return (
    <TouchableOpacity
      style={styles.container}
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
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.paidBy}>
          Paid by <Text style={styles.paidByName}>{paidBy}</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Bold",
  },
  paidBy: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Inter",
  },
  paidByName: {
    color: "#cbd5e1",
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Bold",
  },
  status: {
    fontSize: 11,
    fontFamily: "Inter",
  },
});
