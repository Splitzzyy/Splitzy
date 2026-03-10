import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/GlassCard";
import { Avatar } from "../ui/Avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";
import { UserSummaryItem } from "@/types/api.types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface BalanceCardProps {
  userSummaries: UserSummaryItem[];
}

function getBalanceInfo(balance: number, colors: any) {
  if (balance > 0) {
    return { label: "Gets Back", color: colors.semantic.positive };
  }
  if (balance < 0) {
    return { label: "Owes", color: colors.semantic.negative };
  }
  return { label: "Settled", color: colors.text.tertiary };
}

export function BalanceCard({ userSummaries }: Readonly<BalanceCardProps>) {
  const { colors } = useTheme();

  if (!userSummaries || userSummaries.length === 0) {
    return (
      <View style={styles.container}>
        <GlassCard variant="panel" style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="party-popper"
              size={48}
              color={colors.semantic.positive}
            />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              All settled up!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              Everyone's balance is zero. Perfect harmony!
            </Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userSummaries.map((member) => {
        const { label, color } = getBalanceInfo(member.balance, colors);

        return (
          <GlassCard key={member.userId} variant="panel" style={styles.card}>
            <View style={styles.row}>
              <Avatar name={member.name} size={48} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text.primary }]}>
                  {member.name}
                </Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                  Overall balance
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={[styles.amount, { color }]}>
                  {member.balance < 0 ? "-" : ""}
                  {formatCurrency(member.balance)}
                </Text>
                <View style={[styles.badge, { backgroundColor: color + "18" }]}>
                  <Text style={[styles.badgeText, { color }]}>{label}</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    gap: 10,
  },
  card: {
    borderRadius: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    letterSpacing: 0.3,
  },
  amountContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter-SemiBold",
    letterSpacing: 0.3,
  },
  emptyCard: {
    borderRadius: 16,
  },
  emptyContent: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    textAlign: "center",
    lineHeight: 18,
  },
});
