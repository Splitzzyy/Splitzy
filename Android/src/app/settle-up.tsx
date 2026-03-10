import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { triggerHaptic, triggerNotification, triggerSelection } from "@/utils/haptics";
import { NotificationFeedbackType, ImpactFeedbackStyle } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SettleUpForm } from "@/components/settle/SettleUpForm";
import { SettleConfirmation } from "@/components/settle/SettleConfirmation";
import { useGroupsStore } from "@/stores/groups.store";
import { useAuthStore } from "@/stores/auth.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { settleApi } from "@/services/api/settle.api";
import { useUIStore } from "@/stores/ui.store";
import { useTheme } from "@/theme";

type Step = "form" | "confirm";

export default function SettleUpScreen() {
  const { colors } = useTheme();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string }>();
  const groupId = groupIdParam ? parseInt(groupIdParam, 10) : null;

  const { currentGroup, fetchGroupOverview } = useGroupsStore();
  const { userId } = useAuthStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState<Step>("form");
  const [paidByUserId, setPaidByUserId] = useState<number | null>(userId);
  const [paidToUserId, setPaidToUserId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);

  // Load group if not already loaded or if different group
  useEffect(() => {
    if (groupId && (!currentGroup || currentGroup.groupId !== groupId)) {
      setIsLoadingGroup(true);
      fetchGroupOverview(groupId).finally(() => setIsLoadingGroup(false));
    }
  }, [groupId]);

  const parsedAmount = parseFloat(amount) || 0;
  const members = currentGroup?.members ?? [];

  const payerName =
    members.find((m) => m.memberId === paidByUserId)?.memberName ?? "";
  const payeeName =
    members.find((m) => m.memberId === paidToUserId)?.memberName ?? "";

  const canProceed =
    paidByUserId !== null &&
    paidToUserId !== null &&
    parsedAmount > 0 &&
    paidByUserId !== paidToUserId;

  const handleReview = useCallback(() => {
    if (!canProceed) {
      triggerNotification(NotificationFeedbackType.Warning);
      showToast("Please fill all fields", "error");
      return;
    }
    triggerHaptic(ImpactFeedbackStyle.Medium);
    setStep("confirm");
  }, [canProceed, showToast]);

  const handleConfirm = useCallback(async () => {
    if (!groupId || !paidByUserId || !paidToUserId) return;

    setIsSubmitting(true);
    try {
      await settleApi.settleUp({
        groupId,
        paidByUserId,
        paidToUserId,
        amount: parsedAmount,
      });

      triggerNotification(NotificationFeedbackType.Success);
      showToast("Settlement recorded!", "success");

      // Refresh data in background
      fetchGroupOverview(groupId);
      fetchDashboard();
      fetchRecentActivity();

      router.back();
    } catch (error: any) {
      triggerNotification(NotificationFeedbackType.Error);
      const message =
        error.response?.data?.message || "Failed to record settlement";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [groupId, paidByUserId, paidToUserId, parsedAmount, showToast, fetchGroupOverview, fetchDashboard, fetchRecentActivity]);

  const handleCancel = useCallback(() => {
    triggerSelection();
    setStep("form");
  }, []);

  if (!groupId) {
    return (
      <ScreenWrapper>
        <Header title="Settle Up" showBack />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>No group selected</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (isLoadingGroup && !currentGroup) {
    return (
      <ScreenWrapper>
        <Header title="Settle Up" showBack />
        <LoadingSpinner message="Loading group..." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Settle Up"
        showBack
        rightAction={
          step === "form" ? (
            <Text
              style={[styles.reviewBtn, { color: colors.primary }, !canProceed && styles.reviewBtnDisabled]}
              onPress={handleReview}
            >
              Review
            </Text>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group name badge */}
          <View style={[styles.groupBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryGlow }]}>
            <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
              {currentGroup?.name ?? "Group"}
            </Text>
          </View>

          {step === "form" ? (
            <SettleUpForm
              members={members}
              currentUserId={userId ?? 0}
              paidByUserId={paidByUserId}
              paidToUserId={paidToUserId}
              amount={amount}
              onPaidByChange={setPaidByUserId}
              onPaidToChange={setPaidToUserId}
              onAmountChange={setAmount}
            />
          ) : (
            <SettleConfirmation
              payerName={payerName}
              payeeName={payeeName}
              groupName={currentGroup?.name ?? ""}
              amount={parsedAmount}
              isSubmitting={isSubmitting}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter-Medium",
  },
  groupBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupBadgeText: {
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  reviewBtn: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  reviewBtnDisabled: {
    opacity: 0.4,
  },
});
