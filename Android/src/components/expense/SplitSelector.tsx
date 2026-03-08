import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Avatar } from "../ui/Avatar";
import { colors } from "@/theme";
import type { GroupMember } from "@/types/api.types";

export type SplitMethod = "equal" | "custom" | "percentage";

interface SplitSelectorProps {
  members: GroupMember[];
  totalAmount: number;
  paidByUserId: number;
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  customAmounts: Record<number, number>;
  onCustomAmountChange: (userId: number, amount: number) => void;
}

const METHODS: { key: SplitMethod; label: string }[] = [
  { key: "equal", label: "Equal" },
  { key: "custom", label: "Custom" },
  { key: "percentage", label: "%" },
];

export function SplitSelector({
  members,
  totalAmount,
  paidByUserId,
  method,
  onMethodChange,
  customAmounts,
  onCustomAmountChange,
}: SplitSelectorProps) {
  const equalAmount =
    members.length > 0 ? totalAmount / members.length : 0;

  const handleMethodChange = (m: SplitMethod) => {
    Haptics.selectionAsync();
    onMethodChange(m);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Split Method</Text>

      {/* Method tabs */}
      <View style={styles.methodRow}>
        {METHODS.map((m) => {
          const isActive = m.key === method;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodTab, isActive && styles.methodTabActive]}
              onPress={() => handleMethodChange(m.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.methodText,
                  isActive && styles.methodTextActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Member split list */}
      <View style={styles.membersList}>
        {members.map((member) => {
          const displayAmount =
            method === "equal"
              ? equalAmount
              : customAmounts[member.memberId] ?? 0;

          return (
            <View key={member.memberId} style={styles.memberRow}>
              <Avatar name={member.memberName} size={36} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.memberName}
                  {member.memberId === paidByUserId && (
                    <Text style={styles.paidTag}> (paid)</Text>
                  )}
                </Text>
              </View>
              {method === "equal" ? (
                <Text style={styles.amountText}>
                  ${displayAmount.toFixed(2)}
                </Text>
              ) : (
                <View style={styles.customInputWrap}>
                  {method === "percentage" && (
                    <Text style={styles.percentSign}>%</Text>
                  )}
                  {method === "custom" && (
                    <Text style={styles.dollarSign}>$</Text>
                  )}
                  <TextInput
                    style={styles.customInput}
                    keyboardType="decimal-pad"
                    value={
                      customAmounts[member.memberId]?.toString() ?? ""
                    }
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      onCustomAmountChange(member.memberId, num);
                    }}
                    placeholder="0"
                    placeholderTextColor="#475569"
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Remaining indicator for custom/percentage */}
      {method !== "equal" && totalAmount > 0 && (
        <RemainingIndicator
          method={method}
          totalAmount={totalAmount}
          customAmounts={customAmounts}
          members={members}
        />
      )}
    </View>
  );
}

function RemainingIndicator({
  method,
  totalAmount,
  customAmounts,
  members,
}: {
  method: SplitMethod;
  totalAmount: number;
  customAmounts: Record<number, number>;
  members: GroupMember[];
}) {
  const total = members.reduce(
    (sum, m) => sum + (customAmounts[m.memberId] ?? 0),
    0
  );

  if (method === "percentage") {
    const remaining = 100 - total;
    const isValid = Math.abs(remaining) < 0.01;
    return (
      <Text style={[styles.remaining, isValid ? styles.valid : styles.invalid]}>
        {isValid ? "100% allocated" : `${remaining.toFixed(1)}% remaining`}
      </Text>
    );
  }

  const remaining = totalAmount - total;
  const isValid = Math.abs(remaining) < 0.01;
  return (
    <Text style={[styles.remaining, isValid ? styles.valid : styles.invalid]}>
      {isValid ? "Fully split" : `$${remaining.toFixed(2)} remaining`}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  methodTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodText: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  methodTextActive: {
    color: "#ffffff",
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  paidTag: {
    color: colors.primary,
    fontSize: 12,
  },
  amountText: {
    color: "#94a3b8",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 90,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dollarSign: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  percentSign: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  customInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter",
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlign: "right",
  },
  remaining: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    textAlign: "center",
    paddingVertical: 4,
  },
  valid: {
    color: colors.semantic.positive,
  },
  invalid: {
    color: colors.semantic.warning,
  },
});
