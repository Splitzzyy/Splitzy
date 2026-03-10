import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerSelection } from "@/utils/haptics";
import { Avatar } from "../ui/Avatar";
import { useTheme } from "@/theme";
import type { GroupMember } from "@/types/api.types";

export type SplitMethod = "equal" | "custom";

interface SplitSelectorProps {
  members: GroupMember[];
  totalAmount: number;
  paidByUserId: number;
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  customAmounts: Record<number, number>;
  onCustomAmountChange: (userId: number, amount: number) => void;
  selectedMembers: number[];
  onSelectedMembersChange: (memberIds: number[]) => void;
}

const METHODS: { key: SplitMethod; label: string }[] = [
  { key: "equal", label: "Equal" },
  { key: "custom", label: "Custom" },
];

export function SplitSelector({
  members,
  totalAmount,
  paidByUserId,
  method,
  onMethodChange,
  customAmounts,
  onCustomAmountChange,
  selectedMembers,
  onSelectedMembersChange,
}: SplitSelectorProps) {
  const { colors } = useTheme();

  const selectedCount = selectedMembers.length;
  const equalAmount =
    selectedCount > 0 ? totalAmount / selectedCount : 0;

  const handleMethodChange = (m: SplitMethod) => {
    triggerSelection();
    onMethodChange(m);
  };

  const toggleMember = (memberId: number) => {
    triggerSelection();
    if (selectedMembers.includes(memberId)) {
      // Don't allow deselecting the last member
      if (selectedCount <= 1) return;
      onSelectedMembersChange(selectedMembers.filter((id) => id !== memberId));
    } else {
      onSelectedMembersChange([...selectedMembers, memberId]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>Split Method</Text>

      {/* Method tabs */}
      <View style={styles.methodRow}>
        {METHODS.map((m) => {
          const isActive = m.key === method;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.methodTab,
                {
                  backgroundColor: colors.glass.card,
                  borderColor: colors.glass.border,
                },
                isActive && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => handleMethodChange(m.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.methodText,
                  { color: colors.text.secondary },
                  isActive && { color: colors.text.primary },
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
          const isSelected = selectedMembers.includes(member.memberId);
          const displayAmount =
            method === "equal"
              ? isSelected
                ? equalAmount
                : 0
              : customAmounts[member.memberId] ?? 0;

          return (
            <View
              key={member.memberId}
              style={[
                styles.memberRow,
                {
                  backgroundColor: colors.glass.panel,
                  borderColor: colors.divider,
                },
                method === "equal" && !isSelected && { opacity: 0.45 },
              ]}
            >
              {/* Checkbox for equal split */}
              {method === "equal" && (
                <TouchableOpacity onPress={() => toggleMember(member.memberId)} hitSlop={8}>
                  <MaterialCommunityIcons
                    name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={22}
                    color={isSelected ? colors.primary : colors.text.tertiary}
                  />
                </TouchableOpacity>
              )}
              <Avatar name={member.memberName} size={36} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text.primary }]} numberOfLines={1}>
                  {member.memberName}
                  {member.memberId === paidByUserId && (
                    <Text style={[styles.paidTag, { color: colors.primary }]}> (paid)</Text>
                  )}
                </Text>
              </View>
              {method === "equal" ? (
                <Text style={[styles.amountText, { color: colors.text.secondary }]}>
                  ₹{displayAmount.toFixed(2)}
                </Text>
              ) : (
                <View
                  style={[
                    styles.customInputWrap,
                    {
                      backgroundColor: colors.glass.card,
                      borderColor: colors.glass.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.currencySign, { color: colors.text.tertiary }]}>₹</Text>
                  <TextInput
                    style={[styles.customInput, { color: colors.text.primary }]}
                    keyboardType="decimal-pad"
                    value={
                      customAmounts[member.memberId]?.toString() ?? ""
                    }
                    onChangeText={(text) => {
                      const num = Number.parseFloat(text) || 0;
                      onCustomAmountChange(member.memberId, num);
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.text.hint}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Remaining indicator for custom */}
      {method !== "equal" && totalAmount > 0 && (
        <RemainingIndicator
          totalAmount={totalAmount}
          customAmounts={customAmounts}
          members={members}
          colors={colors}
        />
      )}
    </View>
  );
}

function RemainingIndicator({
  totalAmount,
  customAmounts,
  members,
  colors,
}: {
  totalAmount: number;
  customAmounts: Record<number, number>;
  members: GroupMember[];
  colors: any;
}) {
  const total = members.reduce(
    (sum, m) => sum + (customAmounts[m.memberId] ?? 0),
    0
  );

  const remaining = totalAmount - total;
  const isValid = Math.abs(remaining) < 0.01;
  return (
    <Text
      style={[
        styles.remaining,
        { color: isValid ? colors.semantic.positive : colors.semantic.warning },
      ]}
    >
      {isValid ? "Fully split" : `₹${remaining.toFixed(2)} remaining`}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
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
    borderWidth: 1,
  },
  methodText: {
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  paidTag: {
    fontSize: 12,
  },
  amountText: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 90,
    borderWidth: 1,
  },
  currencySign: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  customInput: {
    flex: 1,
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
});
