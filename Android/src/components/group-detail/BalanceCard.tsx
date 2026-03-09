import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

interface BalanceCardProps {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
}

export function BalanceCard({ totalBalance, youOwe, youAreOwed }: BalanceCardProps) {
  return (
    <GlassCard variant="panel" style={styles.card}>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>Total Balance</Text>
            <Text
              style={[
                styles.value,
                {
                  color:
                    totalBalance >= 0
                      ? colors.semantic.positive
                      : colors.semantic.negative,
                },
              ]}
            >
              {totalBalance >= 0 ? "+" : "-"}
              {formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>You Owe</Text>
            <Text style={[styles.value, { color: colors.semantic.negative }]}>
              {formatCurrency(youOwe)}
            </Text>
          </View>
          <View style={styles.item}>
            <Text style={[styles.label, { textAlign: "right" }]}>
              You Are Owed
            </Text>
            <Text
              style={[
                styles.value,
                { color: colors.semantic.positive, textAlign: "right" },
              ]}
            >
              {formatCurrency(youAreOwed)}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    gap: 4,
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
