import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface IconButtonProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  size?: number;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
  className?: string;
}

export function IconButton({
  name,
  size = 24,
  color = "#ffffff",
  onPress,
  style,
  className,
}: IconButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      className={className}
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
});
