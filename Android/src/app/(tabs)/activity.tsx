import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { AnimatedListItem } from "@/components/ui/AnimatedListItem";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useDashboardStore } from "@/stores/dashboard.store";
import { formatDateGroup } from "@/utils/formatDate";
import { colors } from "@/theme";
import type { RecentActivityDTO } from "@/types/api.types";

type ActivityFilter = "all" | "groups" | "friends";

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "groups", label: "Groups" },
  { key: "friends", label: "Friends" },
];

interface ActivitySection {
  title: string;
  data: RecentActivityDTO[];
}

export default function ActivityScreen() {
  const { recentActivity, isLoading, fetchRecentActivity } =
    useDashboardStore();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchRecentActivity();
  }, [fetchRecentActivity]);

  // Group activities by date
  const sections: ActivitySection[] = useMemo(() => {
    const grouped: Record<string, RecentActivityDTO[]> = {};
    for (const item of recentActivity) {
      const key = formatDateGroup(item.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [recentActivity]);

  if (isLoading && recentActivity.length === 0) {
    return (
      <ScreenWrapper>
        <Header title="Activity" />
        <SkeletonList count={6} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Activity" />

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.key);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.createdAt}-${index}`}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionDate}>{title}</Text>
        )}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <View style={styles.itemWrapper}>
              <ActivityItem activity={item} />
            </View>
          </AnimatedListItem>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
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
        ListEmptyComponent={
          <EmptyState
            icon="bell-off-outline"
            title="No activity yet"
            description="Your recent expense activity will appear here"
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterText: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  sectionDate: {
    color: "#64748b",
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemWrapper: {
    paddingHorizontal: 24,
  },
  separator: {
    height: 8,
  },
  sectionSep: {
    height: 4,
  },
  listContent: {
    paddingBottom: 120,
  },
});
