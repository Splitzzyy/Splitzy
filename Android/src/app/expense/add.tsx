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
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { triggerHaptic, triggerNotification } from "@/utils/haptics";
import { NotificationFeedbackType } from "expo-haptics";
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
import { categorizeExpense } from "@/utils/categorizeExpense";
import { useTheme } from "@/theme";
import type { GroupMember, SplitDetailDto } from "@/types/api.types";
import { scanReceipt } from "@/utils/receiptScanner";

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const { groups, fetchGroups, currentGroup, fetchGroupOverview } =
    useGroupsStore();
  const { addExpense } = useExpensesStore();
  const { userId } = useAuthStore();
  const { showToast } = useUIStore();
  const { fetchDashboard, fetchRecentActivity } = useDashboardStore();

  const scrollViewRef = useRef<ScrollView>(null);
  const isManualCategory = useRef(false);

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
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanPicker, setShowScanPicker] = useState(false);
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

  // Initialize selectedMembers when members change
  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map((m) => m.memberId));
    }
  }, [members]);

  // Auto-detect category from expense name
  useEffect(() => {
    if (isManualCategory.current || !name.trim()) return;
    const timer = setTimeout(() => {
      const detected = categorizeExpense(name);
      if (detected !== ExpenseCategory.Uncategorized) {
        setCategory(detected);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  const paidByMember = members.find((m) => m.memberId === paidByUserId);

  const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);

  const buildSplitDetails = (): SplitDetailDto[] => {
    const total = parseFloat(amount) || 0;
    if (total <= 0 || members.length === 0) return [];

    if (splitMethod === "equal") {
      const participating = members.filter((m) => selectedMembers.includes(m.memberId));
      if (participating.length === 0) return [];
      const perPerson = total / participating.length;
      return participating.map((m) => ({
        userId: m.memberId,
        amount: parseFloat(perPerson.toFixed(2)),
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
      triggerNotification(NotificationFeedbackType.Success);
      showToast("Expense added!", "success");

      // Refresh data in background
      fetchGroupOverview(selectedGroupId);
      fetchDashboard();
      fetchRecentActivity();

      router.back();
    } catch (error: any) {
      triggerNotification(NotificationFeedbackType.Error);
      showToast(error.message || "Failed to add expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomAmountChange = (memberId: number, val: number) => {
    setCustomAmounts((prev) => ({ ...prev, [memberId]: val }));
  };

  const processScannedImage = async (uri: string) => {
    try {
      setIsScanning(true);
      showToast("Scanning receipt... Please wait.", "info");
      const result = await scanReceipt(uri);
      
      let foundSomething = false;
      if (result.amount !== null && result.amount > 0) {
        setAmount(result.amount.toString());
        showToast(`Found amount: ₹${result.amount}`, "success");
        foundSomething = true;
      }
      
      if (result.merchantName) {
        setName(result.merchantName);
        isManualCategory.current = false; // Allow auto-detect to run on this new name
        foundSomething = true;
      } else if (!name) {
        setName("Scanned Receipt");
      }

      if (!foundSomething && !result.amount) {
        showToast("Could not detect amount automatically", "info");
      }
      triggerNotification(NotificationFeedbackType.Success);
    } catch (error) {
      showToast("Failed to scan receipt", "error");
      triggerNotification(NotificationFeedbackType.Error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCamera = async () => {
    setShowScanPicker(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      showToast("Camera permission is required!", "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      processScannedImage(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    setShowScanPicker(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showToast("Gallery permission is required!", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      processScannedImage(result.assets[0].uri);
    }
  };

  const handleScanReceipt = () => {
    Keyboard.dismiss();
    setShowScanPicker(true);
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
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Group</Text>
          <TouchableOpacity
            style={[styles.picker, { backgroundColor: colors.glass.card, borderColor: colors.glass.border }]}
            onPress={() => !params.groupId && setShowGroupPicker(true)}
            activeOpacity={params.groupId ? 1 : 0.7}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={selectedGroup ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.pickerText,
                { color: colors.text.primary },
                !selectedGroup && { color: colors.text.hint },
              ]}
            >
              {selectedGroup?.groupName ?? "Select a group"}
            </Text>
            {!params.groupId && (
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={colors.text.tertiary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <View style={styles.amountHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Amount</Text>
            <TouchableOpacity 
              style={[styles.scanBtn, { backgroundColor: colors.primaryLight }]} 
              onPress={handleScanReceipt}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="line-scan" size={16} color={colors.primary} />
              <Text style={[styles.scanBtnText, { color: colors.primary }]}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>
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
        <CategoryPicker value={category} onChange={(c) => { isManualCategory.current = true; setCategory(c); }} />

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
            selectedMembers={selectedMembers}
            onSelectedMembersChange={setSelectedMembers}
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
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowGroupPicker(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Select Group</Text>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.groupId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    item.groupId === selectedGroupId && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    triggerHaptic();
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
                        : colors.text.secondary
                    }
                  />
                  <Text style={[styles.sheetItemText, { color: colors.text.primary }]}>{item.groupName}</Text>
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

      {/* Scan Receipt Source Picker Modal */}
      <Modal
        visible={showScanPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScanPicker(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowScanPicker(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.modalBackground, maxHeight: 'auto' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary, marginBottom: 16 }]}>Scan Receipt</Text>
            
            <TouchableOpacity
              style={[styles.sheetItem, { paddingVertical: 16 }]}
              onPress={handleCamera}
            >
              <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
              <Text style={[styles.sheetItemText, { color: colors.text.primary }]}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sheetItem, { paddingVertical: 16 }]}
              onPress={handleGallery}
            >
              <MaterialCommunityIcons name="image-multiple" size={24} color={colors.primary} />
              <Text style={[styles.sheetItemText, { color: colors.text.primary }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetItem, { paddingVertical: 16, marginTop: 8 }]}
              onPress={() => setShowScanPicker(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.error} />
              <Text style={[styles.sheetItemText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
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

      {/* Scanning Overlay */}
      {isScanning && (
        <View style={[StyleSheet.absoluteFill, styles.scanOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.scanCard, { backgroundColor: colors.modalBackground }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.scanText, { color: colors.text.primary }]}>Scanning Receipt...</Text>
          </View>
        </View>
      )}
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
    gap: 12,
  },
  amountHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scanBtnText: {
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
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
  scanOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  scanCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  scanText: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
});
