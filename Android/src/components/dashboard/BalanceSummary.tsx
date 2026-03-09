import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

interface BalanceSummaryProps {
  totalBalance: number;
  youAreOwed: number;
  youOwe: number;
}

export function BalanceSummary({
  totalBalance,
  youAreOwed,
  youOwe,
}: BalanceSummaryProps) {
  const isPositive = totalBalance >= 0;
  const owedPercent =
    youAreOwed + youOwe > 0
      ? Math.round((youAreOwed / (youAreOwed + youOwe)) * 100)
      : 0;
  const owePercent =
    youAreOwed + youOwe > 0
      ? Math.round((youOwe / (youAreOwed + youOwe)) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* Total Balance Card */}
      <GlassCard variant="panel" style={styles.totalCard}>
        <View style={styles.totalContent}>
          <View style={styles.glowOrb} />
          <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalAmount}>
              {isPositive ? "+" : "-"}
              {formatCurrency(totalBalance)}
            </Text>
            {totalBalance !== 0 && (
              <View style={styles.trendBadge}>
                <MaterialCommunityIcons
                  name={isPositive ? "trending-up" : "trending-down"}
                  size={14}
                  color={
                    isPositive
                      ? colors.semantic.positive
                      : colors.semantic.negative
                  }
                />
              </View>
            )}
          </View>
        </View>
      </GlassCard>

      {/* Owed / Owe cards */}
      <View style={styles.splitRow}>
        <GlassCard style={styles.splitCard}>
          <View style={styles.splitContent}>
            <Text style={styles.splitLabel}>YOU ARE OWED</Text>
            <Text style={[styles.splitAmount, { color: colors.semantic.positive }]}>
              {formatCurrency(youAreOwed)}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${owedPercent}%`,
                    backgroundColor: colors.semantic.positive,
                  },
                ]}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.splitCard}>
          <View style={styles.splitContent}>
            <Text style={styles.splitLabel}>YOU OWE</Text>
            <Text style={[styles.splitAmount, { color: colors.semantic.negative }]}>
              {formatCurrency(youOwe)}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${owePercent}%`,
                    backgroundColor: colors.semantic.negative,
                  },
                ]}
              />
            </View>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  totalCard: {
    borderRadius: 16,
  },
  totalContent: {
    padding: 24,
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  glowOrb: {
    position: "absolute",
    right: -16,
    top: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(37, 106, 244, 0.2)",
  },
  totalLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    letterSpacing: 2,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  totalAmount: {
    color: "#ffffff",
    fontSize: 36,
    fontFamily: "Inter-Bold",
    letterSpacing: -1,
  },
  trendBadge: {
    marginTop: 4,
  },
  splitRow: {
    flexDirection: "row",
    gap: 16,
  },
  splitCard: {
    flex: 1,
    borderRadius: 16,
  },
  splitContent: {
    padding: 20,
    gap: 8,
  },
  splitLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontFamily: "Inter-Medium",
    letterSpacing: 1.5,
  },
  splitAmount: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  progressTrack: {
    marginTop: 4,
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
