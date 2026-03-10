import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "../ui/Avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";

interface MemberListItemProps {
  name: string;
  email: string;
  balance?: number;
}

export function MemberListItem({ name, email, balance }: MemberListItemProps) {
  const { colors } = useTheme();

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.card,
          borderColor: colors.glass.border,
        },
      ]}
    >
      <Avatar name={name} size={40} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.email, { color: colors.text.tertiary }]} numberOfLines={1}>
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
    borderRadius: 16,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  email: {
    fontSize: 12,
    fontFamily: "Inter",
  },
  balance: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
});
