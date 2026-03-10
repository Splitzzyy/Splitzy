import { View, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

interface GroupSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function GroupSearchBar({ value, onChangeText }: GroupSearchBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass.card,
          borderColor: colors.glass.borderLight,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={colors.text.secondary}
        style={styles.icon}
      />
      <TextInput
        style={[styles.input, { color: colors.text.primary }]}
        placeholder="Search groups..."
        placeholderTextColor={colors.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter",
    padding: 0,
  },
});
