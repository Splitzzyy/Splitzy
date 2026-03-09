import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../ui/GlassCard";
import { Avatar } from "../ui/Avatar";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";
import type { PersonAmount } from "@/types/api.types";

interface BalanceSummaryProps {
  totalBalance: number;
  youAreOwed: number;
  youOwe: number;
  owedFrom?: PersonAmount[];
  oweTo?: PersonAmount[];
}

export function BalanceSummary({
  totalBalance,
  youAreOwed,
  youOwe,
  owedFrom = [],
  oweTo = [],
}: BalanceSummaryProps) {
  const [showModal, setShowModal] = useState<"owed" | "owe" | null>(null);
  const isPositive = totalBalance >= 0;
  const owedPercent =
    youAreOwed + youOwe > 0
      ? Math.round((youAreOwed / (youAreOwed + youOwe)) * 100)
      : 0;
  const owePercent =
    youAreOwed + youOwe > 0
      ? Math.round((youOwe / (youAreOwed + youOwe)) * 100)
      : 0;

  const modalData = showModal === "owed" ? owedFrom : oweTo;
  const modalTitle = showModal === "owed" ? "People Who Owe You" : "People You Owe";
  const modalColor = showModal === "owed" ? colors.semantic.positive : colors.semantic.negative;

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
        <TouchableOpacity
          style={styles.splitCardTouch}
          activeOpacity={0.7}
          onPress={() => youAreOwed > 0 && setShowModal("owed")}
        >
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
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.splitCardTouch}
          activeOpacity={0.7}
          onPress={() => youOwe > 0 && setShowModal("owe")}
        >
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
        </TouchableOpacity>
      </View>

      {/* Balance Detail Modal */}
      <Modal
        visible={showModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowModal(null)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            {modalData.length > 0 ? (
              <FlatList
                data={modalData}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={modalData.length > 6}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <View style={styles.personRow}>
                    <Avatar name={item.name} size={40} />
                    <Text style={styles.personName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.personAmount, { color: modalColor }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.emptyText}>No balances</Text>
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowModal(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  splitCardTouch: {
    flex: 1,
  },
  splitCard: {
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0f1729",
    borderRadius: 20,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    maxHeight: "60%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter-Bold",
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 300,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  personName: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
  personAmount: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "Inter",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalCloseBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  modalCloseBtnText: {
    color: "#94a3b8",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
});
