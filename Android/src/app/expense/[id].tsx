import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useExpensesStore } from "@/stores/expenses.store";
import { useUIStore } from "@/stores/ui.store";
import { formatCurrency } from "@/utils/formatCurrency";
import { CATEGORY_CONFIG } from "@/constants/categories";
import { colors } from "@/theme";

export default function ExpenseDetailScreen() {
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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchExpenseDetails(expenseId);
    return () => clearCurrentExpense();
  }, [expenseId]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteExpense(expenseId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              showToast("Expense deleted", "success");
              router.back();
            } catch (error: any) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              showToast(error.message || "Failed to delete", "error");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color="#fb7185"
            />
          </TouchableOpacity>
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
          <Text style={styles.expenseName}>{currentExpense.name}</Text>
          <Text style={styles.amount}>
            {formatCurrency(currentExpense.amount)}
          </Text>
          <View style={styles.catBadge}>
            <Text style={[styles.catBadgeText, { color: cat.color }]}>
              {cat.label}
            </Text>
          </View>
        </View>

        {/* Paid by */}
        <GlassCard variant="panel" style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Paid by</Text>
            <View style={styles.paidByRow}>
              <Avatar name={currentExpense.paidBy.userName} size={40} />
              <View style={styles.paidByInfo}>
                <Text style={styles.paidByName}>
                  {currentExpense.paidBy.userName}
                </Text>
                <Text style={styles.paidByAmount}>
                  {formatCurrency(currentExpense.amount)}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Splits */}
        <GlassCard variant="panel" style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Split Details</Text>
            <View style={styles.splitsList}>
              {currentExpense.splits.map((split) => (
                <View key={split.userId} style={styles.splitRow}>
                  <Avatar name={split.userName} size={36} />
                  <Text style={styles.splitName} numberOfLines={1}>
                    {split.userName}
                  </Text>
                  <Text style={styles.splitAmount}>
                    {formatCurrency(split.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>
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
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  amount: {
    color: "#ffffff",
    fontSize: 36,
    fontFamily: "Inter-Bold",
    letterSpacing: -1,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    color: "#94a3b8",
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
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  paidByAmount: {
    color: colors.semantic.positive,
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
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
  splitAmount: {
    color: "#94a3b8",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
});
