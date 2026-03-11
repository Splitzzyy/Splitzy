import { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { AnimatedListItem } from "@/components/ui/AnimatedListItem";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useDashboardStore } from "@/stores/dashboard.store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDateGroup } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTheme } from "@/theme";
import { triggerHaptic, triggerSelection } from "@/utils/haptics";
import { format } from "date-fns";
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
  const { colors } = useTheme();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedActivity, setSelectedActivity] = useState<RecentActivityDTO | null>(null);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const onRefresh = useCallback(async () => {
    triggerHaptic();
    await fetchRecentActivity();
  }, [fetchRecentActivity]);

  // Filter then group activities by date
  const sections: ActivitySection[] = useMemo(() => {
    let filtered = recentActivity;
    if (filter === "groups") {
      filtered = recentActivity.filter((item) => item.groupName && item.groupName.trim() !== "");
    } else if (filter === "friends") {
      filtered = recentActivity.filter((item) => {
        const action = (item.action ?? "").toLowerCase();
        return action.includes("settle") || action.includes("paid");
      });
    }

    const grouped: Record<string, RecentActivityDTO[]> = {};
    for (const item of filtered) {
      const key = formatDateGroup(item.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [recentActivity, filter]);

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
        <View style={[styles.filterRow, { backgroundColor: colors.glass.panel, borderColor: colors.glass.borderLight }]}>
          {FILTERS.map((f) => {
            const isActive = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, isActive && [styles.filterTabActive, { backgroundColor: colors.primary, shadowColor: colors.primary }]]}
                onPress={() => {
                  triggerSelection();
                  setFilter(f.key);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    { color: colors.text.secondary, fontSize: 13, fontFamily: "Inter-SemiBold" },
                    isActive && { color: colors.text.inverse },
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
          <Text style={[styles.sectionDate, { color: colors.text.tertiary }]}>{title}</Text>
        )}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <View style={styles.itemWrapper}>
              <ActivityItem activity={item} onPress={() => { triggerSelection(); setSelectedActivity(item); }} />
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
            progressBackgroundColor={colors.background.main}
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

      {/* Activity Detail Modal */}
      <Modal
        visible={!!selectedActivity}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedActivity(null)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setSelectedActivity(null)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.sheetHandle }]} />
            {selectedActivity && (() => {
              const a = selectedActivity.action.toLowerCase();
              let iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = "information-outline";
              let iconBg = "rgba(37, 106, 244, 0.1)";
              let iconColor = colors.primary;
              if (a.includes("settle") || a.includes("paid")) {
                iconName = "cash-check"; iconBg = "rgba(52, 211, 153, 0.1)"; iconColor = colors.semantic.positive;
              } else if (a.includes("added") || a.includes("created")) {
                iconName = "plus-circle-outline"; iconBg = "rgba(37, 106, 244, 0.1)"; iconColor = colors.primary;
              } else if (a.includes("updated") || a.includes("edited")) {
                iconName = "pencil-outline"; iconBg = "rgba(251, 191, 36, 0.1)"; iconColor = colors.semantic.warning;
              } else if (a.includes("deleted") || a.includes("removed")) {
                iconName = "trash-can-outline"; iconBg = "rgba(251, 113, 133, 0.1)"; iconColor = colors.semantic.negative;
              }
              const impactColor = selectedActivity.impact.type === "get_back"
                ? colors.semantic.positive
                : selectedActivity.impact.type === "owe"
                  ? colors.semantic.negative
                  : colors.text.tertiary;
              const impactLabel = selectedActivity.impact.type === "get_back"
                ? "GET BACK"
                : selectedActivity.impact.type === "owe"
                  ? "YOU OWE"
                  : "";

              return (
                <View style={styles.detailContent}>
                  <View style={[styles.detailIconBox, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
                  </View>
                  <Text style={[styles.detailDescription, { color: colors.text.primary }]}>
                    <Text style={{ color: colors.primary, fontFamily: "Inter-Bold" }}>{selectedActivity.actor}</Text>
                    {" "}{selectedActivity.action} {selectedActivity.expenseName}
                  </Text>
                  {selectedActivity.groupName ? (
                    <Text style={[styles.detailGroup, { color: colors.text.secondary }]}>
                      {selectedActivity.groupName}
                    </Text>
                  ) : null}
                  <Text style={[styles.detailTime, { color: colors.text.tertiary }]}>
                    {format(new Date(selectedActivity.createdAt + 'Z'), "MMMM d, yyyy 'at' h:mm a")}
                  </Text>
                  {selectedActivity.impact.amount > 0 && (
                    <View style={styles.detailAmountRow}>
                      <Text style={[styles.detailAmount, { color: colors.text.primary }]}>
                        {formatCurrency(selectedActivity.impact.amount)}
                      </Text>
                      {impactLabel ? (
                        <View style={[styles.detailBadge, { backgroundColor: impactColor + "18" }]}>
                          <Text style={[styles.detailBadgeText, { color: impactColor }]}>{impactLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  filterTabActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionDate: {
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  detailContent: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  detailIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
    lineHeight: 22,
  },
  detailGroup: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  detailTime: {
    fontSize: 13,
    fontFamily: "Inter",
  },
  detailAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  detailAmount: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
  },
  detailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailBadgeText: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
});
