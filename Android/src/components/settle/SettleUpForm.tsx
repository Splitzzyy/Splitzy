import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerSelection } from "@/utils/haptics";
import { Avatar } from "../ui/Avatar";
import { useTheme } from "@/theme";
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
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Amount input */}
      <View style={styles.amountSection}>
        <Text style={[styles.currencySymbol, { color: colors.text.tertiary }]}>₹</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text.primary }]}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.text.hint}
        />
      </View>

      {/* Payer selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Who is paying?</Text>
        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = member.memberId === paidByUserId;
            const isDisabled = member.memberId === paidToUserId;
            return (
              <TouchableOpacity
                key={member.memberId}
                style={[
                  styles.memberRow,
                  {
                    backgroundColor: colors.glass.panel,
                    borderColor: colors.divider,
                  },
                  isSelected && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                  isDisabled && styles.memberRowDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    triggerSelection();
                    onPaidByChange(member.memberId);
                  }
                }}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Avatar name={member.memberName} size={36} />
                <Text
                  style={[
                    styles.memberName,
                    { color: colors.text.primary },
                    isDisabled && { color: colors.text.tertiary },
                  ]}
                  numberOfLines={1}
                >
                  {member.memberName}
                  {member.memberId === currentUserId && (
                    <Text style={[styles.youTag, { color: colors.primary }]}> (you)</Text>
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
        <View style={[styles.arrowLine, { backgroundColor: colors.glass.border }]} />
        <View style={[styles.arrowCircle, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons
            name="arrow-down"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={[styles.arrowLine, { backgroundColor: colors.glass.border }]} />
      </View>

      {/* Payee selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Who is receiving?</Text>
        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = member.memberId === paidToUserId;
            const isDisabled = member.memberId === paidByUserId;
            return (
              <TouchableOpacity
                key={member.memberId}
                style={[
                  styles.memberRow,
                  {
                    backgroundColor: colors.glass.panel,
                    borderColor: colors.divider,
                  },
                  isSelected && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                  isDisabled && styles.memberRowDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    triggerSelection();
                    onPaidToChange(member.memberId);
                  }
                }}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Avatar name={member.memberName} size={36} />
                <Text
                  style={[
                    styles.memberName,
                    { color: colors.text.primary },
                    isDisabled && { color: colors.text.tertiary },
                  ]}
                  numberOfLines={1}
                >
                  {member.memberName}
                  {member.memberId === currentUserId && (
                    <Text style={[styles.youTag, { color: colors.primary }]}> (you)</Text>
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
    fontSize: 36,
    fontFamily: "Inter-Bold",
  },
  amountInput: {
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  memberRowDisabled: {
    opacity: 0.35,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  youTag: {
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
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
});
