import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerHaptic } from "@/utils/haptics";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";
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

  // Pick a category icon by simple heuristic from expense name
  const guessCategory = (): ExpenseCategory => {
    const n = name.toLowerCase();
    const has = (...words: string[]) => words.some((w) => n.includes(w));
    if (has("food", "dinner", "lunch", "breakfast", "restaurant", "gourmet", "coffee", "grocery", "groceries", "pizza", "snack", "meal", "cafe", "brunch", "tea", "swiggy", "zomato"))
      return ExpenseCategory.Food;
    if (has("travel", "trip", "flight", "hotel", "cabin", "vacation", "airbnb"))
      return ExpenseCategory.Travel;
    if (has("electric", "electricity", "water", "internet", "wifi", "phone", "bill", "recharge", "utility", "utilities"))
      return ExpenseCategory.Utilities;
    if (has("movie", "netflix", "spotify", "game", "concert", "party", "bar", "drink", "pub", "entertainment"))
      return ExpenseCategory.Entertainment;
    if (has("rent", "mortgage", "apartment", "maintenance", "house", "housing"))
      return ExpenseCategory.Housing;
    if (has("doctor", "medicine", "pharmacy", "hospital", "medical", "gym", "fitness", "health"))
      return ExpenseCategory.Healthcare;
    if (has("car", "uber", "taxi", "bus", "train", "metro", "fuel", "parking", "toll", "ola", "rapido", "gas", "rental", "transport"))
      return ExpenseCategory.Transportation;
    if (has("book", "course", "tuition", "class", "school", "college", "education"))
      return ExpenseCategory.Education;
    if (has("haircut", "salon", "spa", "laundry", "clothing", "personal"))
      return ExpenseCategory.Personal;
    if (has("shop", "buy", "amazon", "flipkart", "online", "clothes", "electronics", "myntra", "shopping"))
      return ExpenseCategory.Shopping;
    return ExpenseCategory.Other;
  };

  const cat = CATEGORY_CONFIG[guessCategory()];

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
