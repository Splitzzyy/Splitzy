import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../ui/Avatar";
import { colors } from "@/theme";
import type { GroupMember } from "@/types/api.types";

interface SettleUpFormProps {
  members: GroupMember[];
  currentUserId: number;
  paidByUserId: number | null;
  paidToUserId: number | null;
  amount: string;
  onPaidByChange: (userId: number) => void;
  onPaidToChange: (userId: number) => void;
  onAmountChange: (amount: string) => void;
}

export function SettleUpForm({
  members,
  currentUserId,
  paidByUserId,
  paidToUserId,
  amount,
  onPaidByChange,
  onPaidToChange,
  onAmountChange,
}: SettleUpFormProps) {
  return (
    <View style={styles.container}>
      {/* Amount input */}
      <View style={styles.amountSection}>
        <Text style={styles.currencySymbol}>₹</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#475569"
        />
      </View>

      {/* Payer selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Who is paying?</Text>
        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = member.memberId === paidByUserId;
            const isDisabled = member.memberId === paidToUserId;
            return (
              <TouchableOpacity
                key={member.memberId}
                style={[
                  styles.memberRow,
                  isSelected && styles.memberRowSelected,
                  isDisabled && styles.memberRowDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    Haptics.selectionAsync();
                    onPaidByChange(member.memberId);
                  }
                }}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Avatar name={member.memberName} size={36} />
                <Text
                  style={[
                    styles.memberName,
                    isDisabled && styles.memberNameDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {member.memberName}
                  {member.memberId === currentUserId && (
                    <Text style={styles.youTag}> (you)</Text>
                  )}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Arrow separator */}
      <View style={styles.arrowContainer}>
        <View style={styles.arrowLine} />
        <View style={styles.arrowCircle}>
          <MaterialCommunityIcons
            name="arrow-down"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.arrowLine} />
      </View>

      {/* Payee selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Who is receiving?</Text>
        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = member.memberId === paidToUserId;
            const isDisabled = member.memberId === paidByUserId;
            return (
              <TouchableOpacity
                key={member.memberId}
                style={[
                  styles.memberRow,
                  isSelected && styles.memberRowSelected,
                  isDisabled && styles.memberRowDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    Haptics.selectionAsync();
                    onPaidToChange(member.memberId);
                  }
                }}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Avatar name={member.memberName} size={36} />
                <Text
                  style={[
                    styles.memberName,
                    isDisabled && styles.memberNameDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {member.memberName}
                  {member.memberId === currentUserId && (
                    <Text style={styles.youTag}> (you)</Text>
                  )}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={22}
                    color={colors.semantic.positive}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  amountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 4,
  },
  currencySymbol: {
    color: colors.text.tertiary,
    fontSize: 36,
    fontFamily: "Inter-Bold",
  },
  amountInput: {
    color: "#ffffff",
    fontSize: 48,
    fontFamily: "Inter-Bold",
    minWidth: 80,
    textAlign: "center",
    paddingVertical: 0,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  membersList: {
    gap: 6,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  memberRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(37, 106, 244, 0.08)",
  },
  memberRowDisabled: {
    opacity: 0.35,
  },
  memberName: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  memberNameDisabled: {
    color: colors.text.tertiary,
  },
  youTag: {
    color: colors.primary,
    fontSize: 12,
  },
  arrowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(37, 106, 244, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
});
