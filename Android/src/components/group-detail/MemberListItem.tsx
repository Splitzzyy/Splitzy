import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "../ui/Avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

interface MemberListItemProps {
  name: string;
  email: string;
  balance?: number;
}

export function MemberListItem({ name, email, balance }: MemberListItemProps) {
  const balanceColor =
    balance && balance > 0
      ? colors.semantic.positive
      : balance && balance < 0
        ? colors.semantic.negative
        : colors.text.tertiary;

  const balanceText =
    balance && balance !== 0
      ? `${balance > 0 ? "+" : "-"}${formatCurrency(balance)}`
      : "Settled";

  return (
    <View style={styles.container}>
      <Avatar name={name} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>
      </View>
      {balance !== undefined && (
        <Text style={[styles.balance, { color: balanceColor }]}>
          {balanceText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  email: {
    color: "#64748b",
    fontSize: 12,
    fontFamily: "Inter",
  },
  balance: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
});
