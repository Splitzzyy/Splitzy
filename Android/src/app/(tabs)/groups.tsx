import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImpactFeedbackStyle } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupSearchBar } from "@/components/groups/GroupSearchBar";
import { FilterChips, type GroupFilter } from "@/components/groups/FilterChips";
import { AnimatedListItem } from "@/components/ui/AnimatedListItem";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useGroupsStore } from "@/stores/groups.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useTheme } from "@/theme";
import { triggerHaptic } from "@/utils/haptics";

export default function GroupsScreen() {
  const { groups, isLoading, fetchGroups } = useGroupsStore();
  const { dashboard, fetchDashboard } = useDashboardStore();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GroupFilter>("all");

  useEffect(() => {
    fetchGroups();
    if (!dashboard) fetchDashboard();
  }, []);

  const balanceMap = useMemo(() => {
    const map: Record<number, number> = {};
    dashboard?.groupWiseSummary?.forEach((g) => {
      map[g.groupId] = g.netBalance;
    });
    return map;
  }, [dashboard?.groupWiseSummary]);

  const filteredGroups = useMemo(() => {
    let list = groups;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.groupName.toLowerCase().includes(q));
    }

    if (filter !== "all") {
      list = list.filter((g) => {
        const bal = balanceMap[g.groupId] ?? 0;
        if (filter === "owe") return bal < 0;
        if (filter === "owed") return bal > 0;
        if (filter === "settled") return bal === 0;
        return true;
      });
    }

    return list;
  }, [groups, search, filter, balanceMap]);

  const onRefresh = useCallback(async () => {
    triggerHaptic();
    await Promise.all([fetchGroups(), fetchDashboard()]);
  }, [fetchGroups, fetchDashboard]);

  const handleGroupPress = (groupId: number) => {
    router.push(`/group/${groupId}`);
  };

  const handleCreateGroup = () => {
    triggerHaptic(ImpactFeedbackStyle.Medium);
    router.push("/group/create");
  };

  if (isLoading && groups.length === 0) {
    return (
      <ScreenWrapper>
        <Header
          title="Groups"
          rightAction={
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleCreateGroup}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          }
        />
        <SkeletonList count={6} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Groups"
        showAvatar
        avatarName={dashboard?.userName ?? ""}
        onAvatarPress={() => router.push("/(tabs)/profile")}
        rightAction={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleCreateGroup}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <GroupSearchBar value={search} onChangeText={setSearch} />
        <View style={styles.chipRow}>
          <FilterChips active={filter} onSelect={setFilter} />
        </View>
      </View>

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.groupId.toString()}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <GroupCard
              groupId={item.groupId}
              groupName={item.groupName}
              netBalance={balanceMap[item.groupId] ?? 0}
              onPress={handleGroupPress}
            />
          </AnimatedListItem>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        ListEmptyComponent={
          <EmptyState
            icon="account-group-outline"
            title={search ? "No groups found" : "No groups yet"}
            description={
              search
                ? "Try a different search term"
                : "Create a group to start splitting expenses"
            }
            actionLabel={search ? undefined : "Create Group"}
            onAction={search ? undefined : handleCreateGroup}
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  searchSection: {
    paddingTop: 8,
    gap: 12,
  },
  chipRow: {
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 120,
  },
  separator: {
    height: 12,
  },
});
