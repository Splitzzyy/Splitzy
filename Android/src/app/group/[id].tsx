import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
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
import { useGroupsStore } from "@/stores/groups.store";
import { formatDateGroup } from "@/utils/formatDate";
import { colors } from "@/theme";
import type { GroupExpense } from "@/types/api.types";

type Tab = "expenses" | "members";

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
  const [showBalances, setShowBalances] = useState(false);

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
    setShowBalances((prev) => !prev);
  };

  const handleAddExpense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/expense/add");
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
          <TouchableOpacity style={styles.moreBtn}>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={22}
              color="#ffffff"
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

            {showBalances && currentGroup.balances && (
              <BalanceCard
                totalBalance={currentGroup.balances.totalBalance}
                youOwe={currentGroup.balances.youOwe}
                youAreOwed={currentGroup.balances.youAreOwed}
              />
            )}

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "expenses" && styles.tabActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("expenses");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "expenses" && styles.tabTextActive,
                  ]}
                >
                  Expenses
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "members" && styles.tabActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("members");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "members" && styles.tabTextActive,
                  ]}
                >
                  Members
                </Text>
              </TouchableOpacity>
            </View>
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
          ) : expenseSections.length === 0 ? (
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
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 8,
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
});
