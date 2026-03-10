import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImpactFeedbackStyle } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { BalanceSummary } from "@/components/dashboard/BalanceSummary";
import { RecentGroupItem } from "@/components/dashboard/RecentGroupItem";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useAuthStore } from "@/stores/auth.store";
import { useTheme } from "@/theme";
import { triggerHaptic } from "@/utils/haptics";

export default function DashboardScreen() {
  const { dashboard, isLoading, error, fetchDashboard } = useDashboardStore();
  const { userId } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(async () => {
    triggerHaptic();
    await fetchDashboard();
  }, [fetchDashboard]);

  const handleAddExpense = () => {
    triggerHaptic(ImpactFeedbackStyle.Medium);
    router.push("/expense/add");
  };

  const handleGroupPress = (groupId: number) => {
    router.push(`/group/${groupId}`);
  };

  const handleSeeAllGroups = () => {
    triggerHaptic();
    router.push("/(tabs)/groups");
  };

  if (isLoading && !dashboard) {
    return (
      <ScreenWrapper>
        <Header title="Dashboard" />
        <LoadingSpinner message="Loading dashboard..." />
      </ScreenWrapper>
    );
  }

  if (error && !dashboard) {
    return (
      <ScreenWrapper>
        <Header title="Dashboard" />
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          description={error}
          actionLabel="Try Again"
          onAction={fetchDashboard}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Dashboard"
        showAvatar
        avatarName={dashboard?.userName ?? ""}
        onAvatarPress={() => router.push("/(tabs)/profile")}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background.main}
          />
        }
      >
        {/* Balance Summary */}
        <BalanceSummary
          totalBalance={dashboard?.totalBalance ?? 0}
          youAreOwed={dashboard?.youAreOwed ?? 0}
          youOwe={dashboard?.youOwe ?? 0}
          owedFrom={dashboard?.owedFrom ?? []}
          oweTo={dashboard?.oweTo ?? []}
        />

        {/* Add Expense CTA */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleAddExpense}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={22} color={colors.text.inverse} />
          <Text style={[styles.addButtonText, { color: colors.text.inverse }]}>Add Expense</Text>
        </TouchableOpacity>

        {/* Recent Groups */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Groups</Text>
          <TouchableOpacity onPress={handleSeeAllGroups}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {dashboard?.groupWiseSummary && dashboard.groupWiseSummary.length > 0 ? (
          <View style={styles.groupsList}>
            {dashboard.groupWiseSummary.slice(0, 5).map((group) => (
              <RecentGroupItem
                key={group.groupId}
                groupId={group.groupId}
                groupName={group.groupName}
                netBalance={group.netBalance}
                onPress={handleGroupPress}
              />
            ))}
          </View>
        ) : (
          <GlassCard style={styles.emptyGroups}>
            <EmptyState
              icon="account-group-outline"
              title="No groups yet"
              description="Create a group to start splitting expenses"
            />
          </GlassCard>
        )}

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
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
    paddingBottom: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    height: 56,
    marginTop: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
  groupsList: {
    gap: 12,
  },
  emptyGroups: {
    borderRadius: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
