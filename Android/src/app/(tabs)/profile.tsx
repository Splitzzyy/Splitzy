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
import Constants from "expo-constants";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/stores/auth.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useSettingsStore, type ThemeMode } from "@/stores/settings.store";
import { usersApi } from "@/services/api/users.api";
import { formatCurrency } from "@/utils/formatCurrency";
import { triggerHaptic } from "@/utils/haptics";
import { useTheme } from "@/theme";
import { ImpactFeedbackStyle } from "expo-haptics";
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
  const { colors } = useTheme();

  const content = (
    <View style={styles.settingsRow}>
      <View
        style={[
          styles.settingsIconBox,
          {
            backgroundColor: danger
              ? "rgba(251, 113, 133, 0.1)"
              : colors.primaryLight,
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
        <Text style={[styles.settingsLabel, { color: colors.text.primary }, danger && { color: colors.semantic.negative }]}>
          {label}
        </Text>
        {value ? <Text style={[styles.settingsValue, { color: colors.text.tertiary }]}>{value}</Text> : null}
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

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
  { value: "light", label: "Light", icon: "white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "moon-waning-crescent" },
  { value: "system", label: "System", icon: "cellphone" },
];

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const { dashboard, isLoading: dashLoading, fetchDashboard } = useDashboardStore();
  const { hapticsEnabled, setHapticsEnabled, theme, setTheme } = useSettingsStore();
  const { colors } = useTheme();
  const [userSummary, setUserSummary] = useState<UserGroupExpenseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const loadUserSummary = useCallback(async () => {
    try {
      const response = await usersApi.getUserSummary();
      setUserSummary(response.data ?? null);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (!dashboard) fetchDashboard();
    loadUserSummary();
  }, []);

  const onRefresh = useCallback(async () => {
    triggerHaptic();
    setIsLoading(true);
    await Promise.all([fetchDashboard(), loadUserSummary()]);
    setIsLoading(false);
  }, [fetchDashboard, loadUserSummary]);

  const handleLogout = () => {
    triggerHaptic(ImpactFeedbackStyle.Medium);
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
      // Give immediate feedback when re-enabling
      triggerHaptic();
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
            progressBackgroundColor={colors.background.main}
          />
        }
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <Avatar name={userName} size={72} />
          <Text style={[styles.userName, { color: colors.text.primary }]}>{userName}</Text>
          <Text style={[styles.userId, { color: colors.text.tertiary }]}>ID: {userId ?? "—"}</Text>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: colors.glass.panel, borderColor: colors.glass.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalGroups}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Groups</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glass.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {formatCurrency(totalPaid)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total Paid</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glass.border }]} />
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
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Balance</Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>PREFERENCES</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.glass.panel, borderColor: colors.glass.border }]}>
            {/* Theme Picker */}
            <SettingsRow
              icon="theme-light-dark"
              label="Theme"
              trailing={
                <View style={styles.themeToggle}>
                  {THEME_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.themeOption,
                        { backgroundColor: colors.glass.card },
                        theme === opt.value && { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setTheme(opt.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={16}
                        color={theme === opt.value ? colors.primary : colors.text.tertiary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            {/* Haptics Toggle */}
            <SettingsRow
              icon="vibrate"
              label="Haptic Feedback"
              trailing={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={handleToggleHaptics}
                  trackColor={{
                    false: colors.switchTrack.off,
                    true: colors.switchTrack.on,
                  }}
                  thumbColor={hapticsEnabled ? colors.switchThumb.on : colors.switchThumb.off}
                />
              }
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>ABOUT</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.glass.panel, borderColor: colors.glass.border }]}>
            <SettingsRow
              icon="information-outline"
              label="App Version"
              value={appVersion}
            />
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <SettingsRow
              icon="shield-check-outline"
              label="Privacy Policy"
              onPress={() =>
                Linking.openURL("https://splitzy.aarshiv.xyz/privacy")
              }
            />
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <SettingsRow
              icon="file-document-outline"
              label="Terms of Service"
              onPress={() =>
                Linking.openURL("https://splitzy.aarshiv.xyz/terms")
              }
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>ACCOUNT</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.glass.panel, borderColor: colors.glass.border }]}>
            <SettingsRow
              icon="logout"
              label="Sign Out"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.text.tertiary }]}>
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
    fontSize: 24,
    fontFamily: "Inter-Bold",
    marginTop: 4,
  },
  userId: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
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
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
  settingsValue: {
    fontSize: 13,
    fontFamily: "Inter",
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    marginLeft: 66,
  },
  themeToggle: {
    flexDirection: "row",
    gap: 6,
  },
  themeOption: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter",
    textAlign: "center",
    marginTop: 12,
    opacity: 0.6,
  },
});
