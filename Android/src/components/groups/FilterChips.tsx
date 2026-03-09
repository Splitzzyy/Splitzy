import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/theme";

export type GroupFilter = "all" | "owe" | "owed" | "settled";

const FILTERS: { key: GroupFilter; label: string }[] = [
  { key: "all", label: "All Groups" },
  { key: "owe", label: "You Owe" },
  { key: "owed", label: "Owed to You" },
  { key: "settled", label: "Settled" },
];

interface FilterChipsProps {
  active: GroupFilter;
  onSelect: (filter: GroupFilter) => void;
}

export function FilterChips({ active, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map((f) => {
        const isActive = f.key === active;
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(f.key);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontFamily: "Inter-Medium",
  },
  chipTextActive: {
    color: "#ffffff",
  },
});
