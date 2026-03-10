import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { triggerSelection } from "@/utils/haptics";
import { useTheme } from "@/theme";

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
  const { colors } = useTheme();

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
            style={[
              styles.chip,
              {
                backgroundColor: colors.glass.card,
                borderColor: colors.glass.borderLight,
              },
              isActive && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => {
              triggerSelection();
              onSelect(f.key);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.text.secondary },
                isActive && { color: colors.text.primary },
              ]}
            >
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
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
  },
});
