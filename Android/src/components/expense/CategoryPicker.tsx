import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ExpenseCategory, CATEGORY_CONFIG } from "@/constants/categories";
import { GlassCard } from "../ui/GlassCard";
import { colors } from "@/theme";

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
}

const categories = Object.entries(CATEGORY_CONFIG) as [
  string,
  { label: string; icon: string; color: string },
][];

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [visible, setVisible] = useState(false);
  const current = CATEGORY_CONFIG[value];

  const handleSelect = (cat: ExpenseCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(cat);
    setVisible(false);
  };

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setVisible(true)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.iconDot, { backgroundColor: current.color + "33" }]}
          >
            <MaterialCommunityIcons
              name={current.icon as any}
              size={18}
              color={current.color}
            />
          </View>
          <Text style={styles.selectorText}>{current.label}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Category</Text>
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            >
              {categories.map(([key, cat]) => {
                const catEnum = parseInt(key) as ExpenseCategory;
                const isActive = catEnum === value;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.catItem, isActive && styles.catItemActive]}
                    onPress={() => handleSelect(catEnum)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.catIcon,
                        { backgroundColor: cat.color + "33" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={24}
                        color={cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.catLabel,
                        isActive && { color: "#ffffff" },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  selector: {
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
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter",
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
    maxHeight: "70%",
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
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  catItem: {
    width: "30%",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  catItemActive: {
    backgroundColor: "rgba(37, 106, 244, 0.1)",
    borderColor: colors.primary,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    textAlign: "center",
  },
});
