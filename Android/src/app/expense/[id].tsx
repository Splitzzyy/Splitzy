import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerNotification } from "@/utils/haptics";
import { NotificationFeedbackType } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useExpensesStore } from "@/stores/expenses.store";
import { useGroupsStore } from "@/stores/groups.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useUIStore } from "@/stores/ui.store";
import { formatCurrency } from "@/utils/formatCurrency";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { useTheme } from "@/theme";

export default function ExpenseDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expenseId = parseInt(id!, 10);
  const {
    currentExpense,
    isLoading,
    error,
    fetchExpenseDetails,
    deleteExpense,
    clearCurrentExpense,
  } = useExpensesStore();
  const { showToast } = useUIStore();
  const { currentGroup, fetchGroupOverview } = useGroupsStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Re-fetch on focus (e.g. returning from edit screen)
  useFocusEffect(
    useCallback(() => {
      fetchExpenseDetails(expenseId);
      return () => clearCurrentExpense();
    }, [expenseId])
  );

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expenseId);
      triggerNotification(NotificationFeedbackType.Success);
      showToast("Expense deleted", "success");
      setShowDeleteModal(false);

      if (currentGroup?.groupId) {
        fetchGroupOverview(currentGroup.groupId);
      }
      fetchDashboard();
      fetchRecentActivity();

      router.back();
    } catch (error: any) {
      triggerNotification(NotificationFeedbackType.Error);
      showToast(error.message || "Failed to delete", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !currentExpense) {
    return (
      <ScreenWrapper>
        <Header title="" showBack />
        <LoadingSpinner message="Loading expense..." />
      </ScreenWrapper>
    );
  }

  if (error && !currentExpense) {
    return (
      <ScreenWrapper>
        <Header title="" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionLabel="Try Again"
          onAction={() => fetchExpenseDetails(expenseId)}
        />
      </ScreenWrapper>
    );
  }

  if (!currentExpense) {
    return (
      <ScreenWrapper>
        <Header title="" showBack />
        <EmptyState
          icon="receipt"
          title="Expense not found"
          description="This expense may have been deleted"
        />
      </ScreenWrapper>
    );
  }

  const cat = CATEGORY_CONFIG[currentExpense.category];

  return (
    <ScreenWrapper>
      <Header
        title="Expense Details"
        showBack
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() =>
                router.push({
                  pathname: "/expense/edit",
                  params: {
                    expenseId: currentExpense.expenseId.toString(),
                    groupId: currentGroup?.groupId?.toString() ?? "",
                  },
                })
              }
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={colors.semantic.negative}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={[styles.catIcon, { backgroundColor: cat.color + "33" }]}>
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={32}
              color={cat.color}
            />
          </View>
          <Text style={[styles.expenseName, { color: colors.text.primary }]}>{currentExpense.name}</Text>
          <Text style={[styles.amount, { color: colors.text.primary }]}>
            {formatCurrency(currentExpense.amount)}
          </Text>
          <View style={[styles.catBadge, { backgroundColor: colors.glass.card }]}>
            <Text style={[styles.catBadgeText, { color: cat.color }]}>
              {cat.label}
            </Text>
          </View>
        </View>

        {/* Paid by */}
        <GlassCard variant="panel" style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Paid by</Text>
            <View style={styles.paidByRow}>
              <Avatar name={currentExpense.paidBy.userName} size={40} />
              <View style={styles.paidByInfo}>
                <Text style={[styles.paidByName, { color: colors.text.primary }]}>
                  {currentExpense.paidBy.userName}
                </Text>
                <Text style={[styles.paidByAmount, { color: colors.semantic.positive }]}>
                  {formatCurrency(currentExpense.amount)}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Splits */}
        <GlassCard variant="panel" style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Split Details</Text>
            <View style={styles.splitsList}>
              {currentExpense.splits.map((split) => (
                <View key={split.userId} style={styles.splitRow}>
                  <Avatar name={split.userName} size={36} />
                  <Text style={[styles.splitName, { color: colors.text.primary }]} numberOfLines={1}>
                    {split.userName}
                  </Text>
                  <Text style={[styles.splitAmount, { color: colors.text.secondary }]}>
                    {formatCurrency(split.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={[styles.deleteOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => !isDeleting && setShowDeleteModal(false)}
        >
          <View style={[styles.deleteCard, { backgroundColor: colors.modalBackground }]}>
            <View style={styles.deleteIconWrap}>
              <MaterialCommunityIcons name="delete-alert-outline" size={40} color={colors.semantic.negative} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text.primary }]}>Delete Expense</Text>
            <Text style={[styles.deleteMessage, { color: colors.text.secondary }]}>
              Are you sure you want to delete "{currentExpense.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { backgroundColor: colors.glass.card, borderColor: colors.glass.borderLight }]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={[styles.deleteCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.semantic.negative }, isDeleting && { opacity: 0.5 }]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                <Text style={[styles.deleteConfirmText, { color: colors.text.primary }]}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251, 113, 133, 0.1)",
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  catIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  expenseName: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  amount: {
    fontSize: 36,
    fontFamily: "Inter-Bold",
    letterSpacing: -1,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
  },
  section: {
    borderRadius: 16,
  },
  sectionContent: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  paidByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paidByInfo: {
    flex: 1,
    gap: 2,
  },
  paidByName: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  paidByAmount: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  splitsList: {
    gap: 10,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  splitName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
  splitAmount: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  deleteOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  deleteCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  deleteIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(251, 113, 133, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  deleteMessage: {
    fontSize: 14,
    fontFamily: "Inter",
    textAlign: "center",
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  deleteCancelText: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteConfirmText: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
});
