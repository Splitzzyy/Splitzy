import { View, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme";

interface GroupSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function GroupSearchBar({ value, onChangeText }: GroupSearchBarProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color="#94a3b8"
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        placeholder="Search groups..."
        placeholderTextColor="#64748b"
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter",
    padding: 0,
  },
});
