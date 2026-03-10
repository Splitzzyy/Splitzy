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
import { triggerHaptic } from "@/utils/haptics";
import { ExpenseCategory, CATEGORY_CONFIG } from "@/constants/categories";
import { GlassCard } from "../ui/GlassCard";
import { useTheme } from "@/theme";

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
}

const categories = Object.entries(CATEGORY_CONFIG) as [
  string,
  { label: string; icon: string; color: string },
][];

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const current = CATEGORY_CONFIG[value];

  const handleSelect = (cat: ExpenseCategory) => {
    triggerHaptic();
    onChange(cat);
    setVisible(false);
  };

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
        <TouchableOpacity
          style={[
            styles.selector,
            {
              backgroundColor: colors.glass.card,
              borderColor: colors.glass.border,
            },
          ]}
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
          <Text style={[styles.selectorText, { color: colors.text.primary }]}>{current.label}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={colors.text.tertiary}
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
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.sheetHandle }]} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Select Category</Text>
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
                    style={[
                      styles.catItem,
                      isActive && {
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary,
                      },
                    ]}
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
                        { color: colors.text.secondary },
                        isActive && { color: colors.text.primary },
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
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
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
    fontSize: 15,
    fontFamily: "Inter",
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
    maxHeight: "70%",
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
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    textAlign: "center",
  },
});
