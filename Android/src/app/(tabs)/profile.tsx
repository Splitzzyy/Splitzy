import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/stores/auth.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { usersApi } from "@/services/api/users.api";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";
import type { UserGroupExpenseDTO } from "@/types/api.types";

interface SettingsRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  trailing,
  danger,
}: SettingsRowProps) {
  const content = (
    <View style={styles.settingsRow}>
      <View
        style={[
          styles.settingsIconBox,
          {
            backgroundColor: danger
              ? "rgba(251, 113, 133, 0.1)"
              : "rgba(37, 106, 244, 0.1)",
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={iconColor ?? (danger ? colors.semantic.negative : colors.primary)}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, danger && styles.dangerText]}>
          {label}
        </Text>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
      </View>
      {trailing ?? (
        onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.text.tertiary}
          />
        ) : null
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const { dashboard, isLoading: dashLoading, fetchDashboard } = useDashboardStore();
  const [userSummary, setUserSummary] = useState<UserGroupExpenseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const loadUserSummary = useCallback(async () => {
    try {
      const response = await usersApi.getUserSummary();
      setUserSummary(response.data.data ?? null);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (!dashboard) fetchDashboard();
    loadUserSummary();
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    await Promise.all([fetchDashboard(), loadUserSummary()]);
    setIsLoading(false);
  }, [fetchDashboard, loadUserSummary]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleToggleHaptics = (value: boolean) => {
    setHapticsEnabled(value);
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (dashLoading && !dashboard) {
    return (
      <ScreenWrapper>
        <Header title="Profile" />
        <LoadingSpinner message="Loading profile..." />
      </ScreenWrapper>
    );
  }

  const userName = dashboard?.userName ?? "User";
  const totalGroups = userSummary?.groups?.length ?? 0;
  const totalPaid = userSummary?.totalPaid ?? 0;

  return (
    <ScreenWrapper>
      <Header title="Profile" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background.dark}
          />
        }
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <Avatar name={userName} size={72} />
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userId}>ID: {userId ?? "—"}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalGroups}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(totalPaid)}
            </Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    (dashboard?.totalBalance ?? 0) >= 0
                      ? colors.semantic.positive
                      : colors.semantic.negative,
                },
              ]}
            >
              {formatCurrency(Math.abs(dashboard?.totalBalance ?? 0))}
            </Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
        </View>

        {/* Settings sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="vibrate"
              label="Haptic Feedback"
              trailing={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={handleToggleHaptics}
                  trackColor={{
                    false: "rgba(255, 255, 255, 0.1)",
                    true: "rgba(37, 106, 244, 0.4)",
                  }}
                  thumbColor={hapticsEnabled ? colors.primary : "#64748b"}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="information-outline"
              label="App Version"
              value={appVersion}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="shield-check-outline"
              label="Privacy Policy"
              onPress={() =>
                Linking.openURL("https://splitzy.aarshiv.xyz/privacy")
              }
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="file-document-outline"
              label="Terms of Service"
              onPress={() =>
                Linking.openURL("https://splitzy.aarshiv.xyz/terms")
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon="logout"
              label="Sign Out"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Made with care for Splitzy
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  userName: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter-Bold",
    marginTop: 4,
  },
  userId: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontFamily: "Inter-Medium",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: "Inter-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
  settingsValue: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontFamily: "Inter",
    marginTop: 1,
  },
  dangerText: {
    color: colors.semantic.negative,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginLeft: 66,
  },
  footer: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontFamily: "Inter",
    textAlign: "center",
    marginTop: 12,
    opacity: 0.6,
  },
});
