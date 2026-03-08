import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

interface GroupHeroProps {
  name: string;
  groupBalance: number;
  membersCount: number;
  onSettleUp: () => void;
  onBalances: () => void;
}

export function GroupHero({
  name,
  groupBalance,
  membersCount,
  onSettleUp,
  onBalances,
}: GroupHeroProps) {
  const balanceColor =
    groupBalance > 0
      ? colors.semantic.positive
      : groupBalance < 0
        ? colors.semantic.negative
        : colors.text.secondary;

  return (
    <View style={styles.container}>
      {/* Group icon */}
      <GlassCard variant="panel" style={styles.iconCard}>
        <View style={styles.iconInner}>
          <MaterialCommunityIcons
            name="account-group"
            size={48}
            color={colors.primary}
          />
        </View>
      </GlassCard>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.subtitle}>
        {membersCount} member{membersCount !== 1 ? "s" : ""} ·{" "}
        <Text style={{ color: balanceColor }}>
          {formatCurrency(groupBalance)}
        </Text>
      </Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          title="Settle Up"
          variant="secondary"
          size="md"
          onPress={onSettleUp}
          icon={
            <MaterialCommunityIcons
              name="wallet-outline"
              size={18}
              color="#ffffff"
            />
          }
          style={styles.actionBtn}
        />
        <Button
          title="Balances"
          variant="primary"
          size="md"
          onPress={onBalances}
          icon={
            <MaterialCommunityIcons
              name="chart-bar"
              size={18}
              color="#ffffff"
            />
          }
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  iconCard: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 16,
  },
  iconInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#ffffff",
    fontSize: 28,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    fontFamily: "Inter-Medium",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
});
