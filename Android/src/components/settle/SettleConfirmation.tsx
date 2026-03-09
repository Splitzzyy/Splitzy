import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";

interface SettleConfirmationProps {
  payerName: string;
  payeeName: string;
  groupName: string;
  amount: number;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SettleConfirmation({
  payerName,
  payeeName,
  groupName,
  amount,
  isSubmitting,
  onConfirm,
  onCancel,
}: SettleConfirmationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="cash-check"
          size={48}
          color={colors.semantic.positive}
        />
      </View>

      <Text style={styles.title}>Confirm Settlement</Text>
      <Text style={styles.groupText}>{groupName}</Text>

      {/* Transfer visualization */}
      <View style={styles.transferRow}>
        <View style={styles.personCol}>
          <Avatar name={payerName} size={52} />
          <Text style={styles.personName} numberOfLines={1}>
            {payerName}
          </Text>
          <Text style={styles.roleLabel}>Paying</Text>
        </View>

        <View style={styles.arrowCol}>
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>{formatCurrency(amount)}</Text>
          </View>
          <MaterialCommunityIcons
            name="arrow-right"
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.personCol}>
          <Avatar name={payeeName} size={52} />
          <Text style={styles.personName} numberOfLines={1}>
            {payeeName}
          </Text>
          <Text style={[styles.roleLabel, { color: colors.semantic.positive }]}>
            Receiving
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Button
          title="Cancel"
          variant="secondary"
          size="lg"
          onPress={onCancel}
          style={styles.cancelButton}
        />
        <Button
          title={isSubmitting ? "Settling..." : "Confirm"}
          variant="primary"
          size="lg"
          onPress={onConfirm}
          disabled={isSubmitting}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "Inter-Bold",
  },
  groupText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: "Inter-Medium",
    marginBottom: 8,
  },
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 20,
    width: "100%",
  },
  personCol: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  personName: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
  },
  roleLabel: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  arrowCol: {
    alignItems: "center",
    gap: 6,
  },
  amountBadge: {
    backgroundColor: "rgba(37, 106, 244, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(37, 106, 244, 0.2)",
  },
  amountText: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
