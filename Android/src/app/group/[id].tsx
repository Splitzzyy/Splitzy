import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupHero } from "@/components/group-detail/GroupHero";
import { ExpenseListItem } from "@/components/group-detail/ExpenseListItem";
import { MemberListItem } from "@/components/group-detail/MemberListItem";
import { BalanceCard } from "@/components/group-detail/BalanceCard";
import { SpendingChart } from "@/components/group-detail/SpendingChart";
import { useGroupsStore } from "@/stores/groups.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useUIStore } from "@/stores/ui.store";
import { formatDateGroup } from "@/utils/formatDate";
import { colors } from "@/theme";
import type { GroupExpense } from "@/types/api.types";

type Tab = "expenses" | "chart" | "balances" | "members";

interface ExpenseSection {
  title: string;
  data: GroupExpense[];
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id!, 10);
  const { currentGroup, isLoading, fetchGroupOverview, clearCurrentGroup } =
    useGroupsStore();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchGroupOverview(groupId);
    return () => clearCurrentGroup();
  }, [groupId]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchGroupOverview(groupId);
  }, [groupId, fetchGroupOverview]);

  // Group expenses by date
  const expenseSections: ExpenseSection[] = useMemo(() => {
    if (!currentGroup?.expenses) return [];
    const grouped: Record<string, GroupExpense[]> = {};
    for (const exp of currentGroup.expenses) {
      const key = formatDateGroup(exp.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(exp);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [currentGroup?.expenses]);

  const handleExpensePress = (expenseId: number) => {
    router.push(`/expense/${expenseId}`);
  };

  const handleSettleUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/settle-up?groupId=${groupId}`);
  };

  const handleBalances = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab("balances");
  };

  const handleAddExpense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/expense/add?groupId=${groupId}`);
  };

  const { showToast } = useUIStore();
  const { deleteGroup, fetchGroups } = useGroupsStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();

  const handleDeleteGroup = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      await deleteGroup(groupId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Group deleted", "success");
      setShowDeleteModal(false);
      await fetchGroups();
      fetchDashboard();
      fetchRecentActivity();
      router.back();
    } catch (e: any) {
      showToast(e.message || "Failed to delete group", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !currentGroup) {
    return (
      <ScreenWrapper>
        <Header title="" showBack />
        <LoadingSpinner message="Loading group..." />
      </ScreenWrapper>
    );
  }

  if (!currentGroup) {
    return (
      <ScreenWrapper>
        <Header title="" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Group not found"
          description="This group may have been deleted"
        />
      </ScreenWrapper>
    );
  }

  // Build the balance map for members
  const memberBalanceMap: Record<number, number> = {};
  currentGroup.userSummaries?.forEach((s) => {
    memberBalanceMap[s.userId] = s.balance;
  });

  return (
    <ScreenWrapper>
      <Header
        title={currentGroup.name}
        showBack
        rightAction={
          <TouchableOpacity style={styles.moreBtn} onPress={handleDeleteGroup}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color="#fb7185"
            />
          </TouchableOpacity>
        }
      />

      <SectionList
        sections={activeTab === "expenses" ? expenseSections : []}
        keyExtractor={(item, index) =>
          activeTab === "expenses"
            ? (item as GroupExpense).expenseId.toString()
            : index.toString()
        }
        ListHeaderComponent={
          <>
            <GroupHero
              name={currentGroup.name}
              groupBalance={currentGroup.groupBalance}
              membersCount={currentGroup.membersCount}
              onSettleUp={handleSettleUp}
              onBalances={handleBalances}
            />

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
              style={styles.tabs}
            >
              {(["expenses", "chart", "balances", "members"] as Tab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionDate}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <ExpenseListItem
              expenseId={(item as GroupExpense).expenseId}
              name={(item as GroupExpense).name}
              amount={(item as GroupExpense).amount}
              paidBy={(item as GroupExpense).paidBy}
              youOwe={(item as GroupExpense).youOwe}
              youLent={(item as GroupExpense).youLent}
              onPress={handleExpensePress}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background.dark}
          />
        }
        ListFooterComponent={
          activeTab === "members" ? (
            <View style={styles.membersList}>
              {currentGroup.members.map((m) => (
                <MemberListItem
                  key={m.memberId}
                  name={m.memberName}
                  email={m.memberEmail}
                  balance={memberBalanceMap[m.memberId]}
                />
              ))}
              {currentGroup.members.length === 0 && (
                <EmptyState
                  icon="account-group-outline"
                  title="No members"
                  description="Add members to this group"
                />
              )}
            </View>
          ) : activeTab === "chart" ? (
            <SpendingChart expenses={currentGroup.expenses ?? []} />
          ) : activeTab === "balances" && currentGroup.balances ? (
            <View style={styles.balancesSection}>
              <BalanceCard
                totalBalance={currentGroup.balances.totalBalance}
                youOwe={currentGroup.balances.youOwe}
                youAreOwed={currentGroup.balances.youAreOwed}
              />
            </View>
          ) : activeTab === "expenses" && expenseSections.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No expenses yet"
              description="Add the first expense for this group"
              actionLabel="Add Expense"
              onAction={handleAddExpense}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddExpense}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={styles.deleteOverlay}
          activeOpacity={1}
          onPress={() => !isDeleting && setShowDeleteModal(false)}
        >
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconWrap}>
              <MaterialCommunityIcons name="delete-alert-outline" size={40} color="#fb7185" />
            </View>
            <Text style={styles.deleteTitle}>Delete Group</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{currentGroup?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, isDeleting && { opacity: 0.5 }]}
                onPress={confirmDeleteGroup}
                disabled={isDeleting}
              >
                <Text style={styles.deleteConfirmText}>
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
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    flexDirection: "row",
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  sectionDate: {
    color: "#64748b",
    fontSize: 12,
    fontFamily: "Inter-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 120,
  },
  expenseItem: {
    paddingHorizontal: 24,
  },
  separator: {
    height: 8,
  },
  membersList: {
    paddingHorizontal: 24,
    gap: 8,
  },
  balancesSection: {
    paddingHorizontal: 24,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  deleteCard: {
    width: "100%",
    backgroundColor: "#0f1729",
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
  deleteTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  deleteMessage: {
    color: "#94a3b8",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  deleteCancelText: {
    color: "#94a3b8",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fb7185",
  },
  deleteConfirmText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
});
