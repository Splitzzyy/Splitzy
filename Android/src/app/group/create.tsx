import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NotificationFeedbackType } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { useGroupsStore } from "@/stores/groups.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { useUIStore } from "@/stores/ui.store";
import { useTheme } from "@/theme";
import { triggerHaptic, triggerNotification } from "@/utils/haptics";

export default function CreateGroupScreen() {
  const { createGroup, fetchGroups } = useGroupsStore();
  const { fetchDashboard } = useDashboardStore();
  const { showToast } = useUIStore();
  const { colors } = useTheme();
  const [groupName, setGroupName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast("Invalid email address", "error");
      return;
    }
    if (emails.includes(trimmed)) {
      showToast("Email already added", "warning");
      return;
    }
    triggerHaptic();
    setEmails([...emails, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    triggerHaptic();
    setEmails(emails.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showToast("Please enter a group name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await createGroup({
        groupName: groupName.trim(),
        userEmails: emails,
      });
      triggerNotification(NotificationFeedbackType.Success);
      showToast("Group created!", "success");
      await fetchGroups();
      fetchDashboard();
      router.back();
    } catch (error: any) {
      triggerNotification(NotificationFeedbackType.Error);
      showToast(error.message || "Failed to create group", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Create Group" showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Group Name"
          placeholder="e.g., Weekend Trip"
          value={groupName}
          onChangeText={setGroupName}
          autoFocus
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Add Members (optional)</Text>
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

          {emails.length > 0 && (
            <View style={styles.emailChips}>
              {emails.map((email) => (
                <GlassCard key={email} style={styles.emailChip}>
                  <View style={styles.emailChipContent}>
                    <Text style={[styles.emailChipText, { color: colors.text.secondary }]} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity onPress={() => removeEmail(email)}>
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={18}
                        color={colors.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>

        <Button
          title="Create Group"
          onPress={handleCreate}
          loading={isSubmitting}
          disabled={!groupName.trim()}
          size="lg"
          style={styles.createBtn}
        />
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
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
    borderRadius: 20,
  },
  emailChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emailChipText: {
    fontSize: 13,
    fontFamily: "Inter",
    maxWidth: 200,
  },
  createBtn: {
    marginTop: 8,
  },
});
