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
import { triggerHaptic, triggerNotification } from "@/utils/haptics";
import { NotificationFeedbackType } from "expo-haptics";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CategoryPicker } from "@/components/expense/CategoryPicker";
import {
  SplitSelector,
  type SplitMethod,
} from "@/components/expense/SplitSelector";
import { useGroupsStore } from "@/stores/groups.store";
import { useExpensesStore } from "@/stores/expenses.store";
import { useUIStore } from "@/stores/ui.store";
import { useDashboardStore } from "@/stores/dashboard.store";
import { ExpenseCategory } from "@/constants/categories";
import { useTheme } from "@/theme";
import type { GroupMember, SplitDetailDto } from "@/types/api.types";

export default function EditExpenseScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    expenseId: string;
    groupId: string;
  }>();
  const expenseId = parseInt(params.expenseId!, 10);
  const groupId = parseInt(params.groupId!, 10);

  const { currentGroup, fetchGroupOverview } = useGroupsStore();
  const { currentExpense, fetchExpenseDetails, updateExpense, clearCurrentExpense } =
    useExpensesStore();
  const { showToast } = useUIStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();

  const scrollViewRef = useRef<ScrollView>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(
    ExpenseCategory.Uncategorized
  );
  const [paidByUserId, setPaidByUserId] = useState<number>(0);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>(
    {}
  );
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExpense, setIsLoadingExpense] = useState(true);
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

  // Load group and expense data
  useEffect(() => {
    if (groupId && (!currentGroup || currentGroup.groupId !== groupId)) {
      fetchGroupOverview(groupId);
    }
  }, [groupId]);

  useEffect(() => {
    fetchExpenseDetails(expenseId).finally(() => setIsLoadingExpense(false));
    return () => clearCurrentExpense();
  }, [expenseId]);

  // Populate form when expense data loads
  useEffect(() => {
    if (currentExpense) {
      setName(currentExpense.name);
      setAmount(currentExpense.amount.toString());
      setCategory(currentExpense.category);
      setPaidByUserId(currentExpense.paidBy.userId);

      // Determine split method
      const members = currentGroup?.members ?? [];
      if (members.length > 0) {
        const equalAmount = currentExpense.amount / members.length;
        const isEqual = currentExpense.splits.every(
          (s) => Math.abs(s.amount - equalAmount) < 0.02
        );

        if (isEqual) {
          setSplitMethod("equal");
        } else {
          setSplitMethod("custom");
          const amounts: Record<number, number> = {};
          currentExpense.splits.forEach((s) => {
            amounts[s.userId] = s.amount;
          });
          setCustomAmounts(amounts);
        }
      }
    }
  }, [currentExpense, currentGroup]);

  const members: GroupMember[] = currentGroup?.members ?? [];
  const paidByMember = members.find((m) => m.memberId === paidByUserId);

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
      await updateExpense({
        expenseId,
        groupId,
        paidByUserId,
        amount: total,
        name: name.trim(),
        category,
        splitDetails,
      });
      triggerNotification(NotificationFeedbackType.Success);
      showToast("Expense updated!", "success");

      // Refresh data in background
      fetchGroupOverview(groupId);
      fetchDashboard();
      fetchRecentActivity();

      router.back();
    } catch (error: any) {
      triggerNotification(NotificationFeedbackType.Error);
      showToast(error.message || "Failed to update expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomAmountChange = (memberId: number, val: number) => {
    setCustomAmounts((prev) => ({ ...prev, [memberId]: val }));
  };

  if (isLoadingExpense) {
    return (
      <ScreenWrapper>
        <Header title="Edit Expense" showBack />
        <LoadingSpinner message="Loading expense..." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Edit Expense" showBack />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Group (read-only) */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Group</Text>
          <View
            style={[styles.picker, { backgroundColor: colors.glass.card, borderColor: colors.glass.border, opacity: 0.7 }]}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.pickerText, { color: colors.text.primary }]}>
              {currentGroup?.name ?? "Group"}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.text.secondary }]}>₹</Text>
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
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Paid by</Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.glass.card, borderColor: colors.glass.border }]}
              onPress={() => setShowPaidByPicker(true)}
              activeOpacity={0.7}
            >
              <Avatar name={paidByMember?.memberName ?? ""} size={28} />
              <Text style={[styles.pickerText, { color: colors.text.primary }]}>
                {paidByMember?.memberName ?? "Select who paid"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={colors.text.tertiary}
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
          title="Update Expense"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!name.trim() || !amount}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={{ height: keyboardHeight > 0 ? keyboardHeight : 40 }} />
      </ScrollView>

      {/* Paid By Picker Modal */}
      <Modal
        visible={showPaidByPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaidByPicker(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowPaidByPicker(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Who paid?</Text>
            <FlatList
              data={members}
              keyExtractor={(item) => item.memberId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    item.memberId === paidByUserId && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setPaidByUserId(item.memberId);
                    setShowPaidByPicker(false);
                  }}
                >
                  <Avatar name={item.memberName} size={32} />
                  <Text style={[styles.sheetItemText, { color: colors.text.primary }]}>{item.memberName}</Text>
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
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: {
    flex: 1,
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
    justifyContent: "flex-end",
  },
  sheet: {
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
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
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
  sheetItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter-Medium",
  },
});
