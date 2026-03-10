import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  SectionList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";
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
import { useTheme } from "@/theme";
import { triggerHaptic, triggerNotification, triggerSelection } from "@/utils/haptics";
import type { GroupExpense } from "@/types/api.types";

type Tab = "expenses" | "chart" | "balances" | "members";

interface ExpenseSection {
  title: string;
  data: GroupExpense[];
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id!, 10);
  const { colors } = useTheme();
  const { currentGroup, isLoading, fetchGroupOverview, clearCurrentGroup } =
    useGroupsStore();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  useEffect(() => {
    fetchGroupOverview(groupId);
    return () => clearCurrentGroup();
  }, [groupId]);

  const onRefresh = useCallback(async () => {
    triggerHaptic();
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
    triggerHaptic(ImpactFeedbackStyle.Medium);
    router.push(`/settle-up?groupId=${groupId}`);
  };

  const handleBalances = () => {
    triggerHaptic();
    setActiveTab("balances");
  };

  const handleAddExpense = () => {
    triggerHaptic(ImpactFeedbackStyle.Medium);
    router.push(`/expense/add?groupId=${groupId}`);
  };

  const { showToast } = useUIStore();
  const { deleteGroup, addUsersToGroup, fetchGroups } = useGroupsStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast("Invalid email address", "error");
      return;
    }
    if (pendingEmails.includes(trimmed)) {
      showToast("Email already added", "warning");
      return;
    }
    // Check if already a member
    if (currentGroup?.members.some((m) => m.memberEmail.toLowerCase() === trimmed)) {
      showToast("Already a member", "warning");
      return;
    }
    triggerHaptic();
    setPendingEmails([...pendingEmails, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    triggerHaptic();
    setPendingEmails(pendingEmails.filter((e) => e !== email));
  };

  const handleAddMembers = async () => {
    if (pendingEmails.length === 0) return;
    setIsAddingMembers(true);
    try {
      await addUsersToGroup(groupId, { userEmails: pendingEmails });
      triggerNotification(NotificationFeedbackType.Success);
      showToast(`Added ${pendingEmails.length} member${pendingEmails.length > 1 ? "s" : ""}`, "success");
      setShowAddMemberModal(false);
      setPendingEmails([]);
      setEmailInput("");
      await fetchGroupOverview(groupId);
    } catch (e: any) {
      triggerNotification(NotificationFeedbackType.Error);
      showToast(e.message || "Failed to add members", "error");
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleDeleteGroup = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      await deleteGroup(groupId);
      triggerNotification(NotificationFeedbackType.Success);
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
              color={colors.semantic.negative}
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
              style={[styles.tabs, { borderBottomColor: colors.divider }]}
            >
              {(["expenses", "chart", "balances", "members"] as Tab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
                  onPress={() => {
                    triggerSelection();
                    setActiveTab(tab);
                  }}
                >
                  <Text
                    style={[
                      { color: colors.text.secondary, fontSize: 14, fontFamily: "Inter-Bold" },
                      activeTab === tab && { color: colors.text.primary },
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
          <Text style={[styles.sectionDate, { color: colors.text.tertiary }]}>{title}</Text>
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
            progressBackgroundColor={colors.background.main}
          />
        }
        ListFooterComponent={
          activeTab === "members" ? (
            <View style={styles.membersList}>
              <TouchableOpacity
                style={[styles.addMemberBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}
                onPress={() => {
                  triggerHaptic();
                  setShowAddMemberModal(true);
                }}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.primary} />
                <Text style={[styles.addMemberBtnText, { color: colors.primary }]}>Add Members</Text>
              </TouchableOpacity>
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
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleAddExpense}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.text.inverse} />
      </TouchableOpacity>

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
            <Text style={[styles.deleteTitle, { color: colors.text.primary }]}>Delete Group</Text>
            <Text style={[styles.deleteMessage, { color: colors.text.secondary }]}>
              Are you sure you want to delete "{currentGroup?.name}"? This action cannot be undone.
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
                onPress={confirmDeleteGroup}
                disabled={isDeleting}
              >
                <Text style={[styles.deleteConfirmText, { color: colors.text.inverse }]}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Add Members Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isAddingMembers && setShowAddMemberModal(false)}
      >
        <TouchableOpacity
          style={[styles.deleteOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => !isAddingMembers && setShowAddMemberModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.addMemberCard, { backgroundColor: colors.modalBackground }]}>
            <Text style={[styles.addMemberTitle, { color: colors.text.primary }]}>Add Members</Text>
            <Text style={[styles.addMemberSubtitle, { color: colors.text.secondary }]}>
              Enter email addresses of people to add
            </Text>

            <View style={styles.emailRow}>
              <TextInput
                style={[styles.emailInput, { backgroundColor: colors.glass.card, borderColor: colors.glass.borderLight, color: colors.text.primary }]}
                placeholder="Enter email address"
                placeholderTextColor={colors.text.tertiary}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={addEmail}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addEmailBtn, { backgroundColor: colors.primary }]} onPress={addEmail}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            </View>

            {pendingEmails.length > 0 && (
              <View style={styles.emailChips}>
                {pendingEmails.map((email) => (
                  <View key={email} style={[styles.emailChip, { backgroundColor: colors.glass.card, borderColor: colors.glass.borderLight }]}>
                    <Text style={[styles.emailChipText, { color: colors.text.secondary }]} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity onPress={() => removeEmail(email)}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { backgroundColor: colors.glass.card, borderColor: colors.glass.borderLight }]}
                onPress={() => {
                  setShowAddMemberModal(false);
                  setPendingEmails([]);
                  setEmailInput("");
                }}
                disabled={isAddingMembers}
              >
                <Text style={[styles.deleteCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addMemberConfirmBtn, { backgroundColor: colors.primary }, (isAddingMembers || pendingEmails.length === 0) && { opacity: 0.5 }]}
                onPress={handleAddMembers}
                disabled={isAddingMembers || pendingEmails.length === 0}
              >
                {isAddingMembers ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={[styles.deleteConfirmText, { color: colors.text.inverse }]}>
                    Add ({pendingEmails.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  sectionDate: {
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
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
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
  deleteTitle: {
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
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  addMemberBtnText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
  addMemberCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  addMemberTitle: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  addMemberSubtitle: {
    fontSize: 14,
    fontFamily: "Inter",
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: "row",
    gap: 10,
  },
  emailInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "Inter",
  },
  addEmailBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emailChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emailChipText: {
    fontSize: 13,
    fontFamily: "Inter",
    maxWidth: 200,
  },
  addMemberConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
