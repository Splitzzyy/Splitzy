import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Keyboard,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryPicker } from "@/components/expense/CategoryPicker";
import {
  SplitSelector,
  type SplitMethod,
} from "@/components/expense/SplitSelector";
import { useGroupsStore } from "@/stores/groups.store";
import { useExpensesStore } from "@/stores/expenses.store";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { ExpenseCategory } from "@/constants/categories";
import { colors } from "@/theme";
import type { GroupMember, SplitDetailDto } from "@/types/api.types";

export default function AddExpenseScreen() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const { groups, fetchGroups, currentGroup, fetchGroupOverview } =
    useGroupsStore();
  const { addExpense } = useExpensesStore();
  const { userId } = useAuthStore();
  const { showToast } = useUIStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();

  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    params.groupId ? parseInt(params.groupId, 10) : null
  );
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(
    ExpenseCategory.Uncategorized
  );
  const [paidByUserId, setPaidByUserId] = useState<number>(userId ?? 0);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>(
    {}
  );
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (splitMethod !== "equal") {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [splitMethod]);

  useEffect(() => {
    if (groups.length === 0) fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupOverview(selectedGroupId);
    }
  }, [selectedGroupId]);

  const members: GroupMember[] = currentGroup?.members ?? [];

  const paidByMember = members.find((m) => m.memberId === paidByUserId);

  const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);

  const buildSplitDetails = (): SplitDetailDto[] => {
    const total = parseFloat(amount) || 0;
    if (total <= 0 || members.length === 0) return [];

    if (splitMethod === "equal") {
      const perPerson = total / members.length;
      return members.map((m) => ({
        userId: m.memberId,
        amount: parseFloat(perPerson.toFixed(2)),
      }));
    }

    if (splitMethod === "percentage") {
      return members.map((m) => ({
        userId: m.memberId,
        amount: parseFloat(
          (((customAmounts[m.memberId] ?? 0) / 100) * total).toFixed(2)
        ),
      }));
    }

    // custom
    return members.map((m) => ({
      userId: m.memberId,
      amount: customAmounts[m.memberId] ?? 0,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedGroupId) {
      showToast("Please select a group", "error");
      return;
    }
    if (!name.trim()) {
      showToast("Please enter an expense name", "error");
      return;
    }
    const total = parseFloat(amount);
    if (!total || total <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    const splitDetails = buildSplitDetails();
    const splitTotal = splitDetails.reduce((s, d) => s + d.amount, 0);

    if (splitMethod !== "equal" && Math.abs(splitTotal - total) > 0.02) {
      showToast("Split amounts must equal the total", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        groupId: selectedGroupId,
        paidByUserId,
        amount: total,
        name: name.trim(),
        category,
        splitDetails,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Expense added!", "success");

      // Refresh data in background
      fetchGroupOverview(selectedGroupId);
      fetchDashboard();
      fetchRecentActivity();

      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error.message || "Failed to add expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomAmountChange = (memberId: number, val: number) => {
    setCustomAmounts((prev) => ({ ...prev, [memberId]: val }));
  };

  return (
    <ScreenWrapper>
      <Header title="Add Expense" showBack />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Group Picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Group</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => !params.groupId && setShowGroupPicker(true)}
            activeOpacity={params.groupId ? 1 : 0.7}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={selectedGroup ? colors.primary : "#64748b"}
            />
            <Text
              style={[
                styles.pickerText,
                !selectedGroup && { color: "#475569" },
              ]}
            >
              {selectedGroup?.groupName ?? "Select a group"}
            </Text>
            {!params.groupId && (
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#64748b"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
            </View>
          </View>
        </View>

        {/* Expense Name */}
        <Input
          label="Description"
          placeholder="What's this expense for?"
          value={name}
          onChangeText={setName}
        />

        {/* Category */}
        <CategoryPicker value={category} onChange={setCategory} />

        {/* Paid By */}
        {members.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Paid by</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowPaidByPicker(true)}
              activeOpacity={0.7}
            >
              <Avatar name={paidByMember?.memberName ?? ""} size={28} />
              <Text style={styles.pickerText}>
                {paidByMember?.memberName ?? "Select who paid"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Split Selector */}
        {members.length > 0 && (
          <SplitSelector
            members={members}
            totalAmount={parseFloat(amount) || 0}
            paidByUserId={paidByUserId}
            method={splitMethod}
            onMethodChange={setSplitMethod}
            customAmounts={customAmounts}
            onCustomAmountChange={handleCustomAmountChange}
          />
        )}

        {/* Submit */}
        <Button
          title="Add Expense"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!selectedGroupId || !name.trim() || !amount}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={{ height: keyboardHeight > 0 ? keyboardHeight : 40 }} />
      </ScrollView>

      {/* Group Picker Modal */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowGroupPicker(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Group</Text>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.groupId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    item.groupId === selectedGroupId && styles.sheetItemActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedGroupId(item.groupId);
                    setShowGroupPicker(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={20}
                    color={
                      item.groupId === selectedGroupId
                        ? colors.primary
                        : "#94a3b8"
                    }
                  />
                  <Text style={styles.sheetItemText}>{item.groupName}</Text>
                  {item.groupId === selectedGroupId && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Paid By Picker Modal */}
      <Modal
        visible={showPaidByPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaidByPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPaidByPicker(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Who paid?</Text>
            <FlatList
              data={members}
              keyExtractor={(item) => item.memberId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    item.memberId === paidByUserId && styles.sheetItemActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPaidByUserId(item.memberId);
                    setShowPaidByPicker(false);
                  }}
                >
                  <Avatar name={item.memberName} size={32} />
                  <Text style={styles.sheetItemText}>{item.memberName}</Text>
                  {item.memberId === paidByUserId && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 24,
    gap: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter",
  },
  amountSection: {
    gap: 6,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencySymbol: {
    color: "#94a3b8",
    fontSize: 28,
    fontFamily: "Inter-Bold",
  },
  amountInput: {
    fontSize: 28,
    fontFamily: "Inter-Bold",
  },
  submitBtn: {
    marginTop: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0f1729",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter-Bold",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  sheetItemActive: {
    backgroundColor: "rgba(37, 106, 244, 0.08)",
  },
  sheetItemText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
});
