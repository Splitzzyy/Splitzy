import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { triggerHaptic } from "@/utils/haptics";

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
  color,
  onPress,
  style,
  className,
}: IconButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  return (
    <TouchableOpacity
      className={className}
      style={[
        styles.button,
        { backgroundColor: colors.glass.card, borderColor: colors.glass.border },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={name} size={size} color={color ?? colors.text.primary} />
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
    borderWidth: 1,
  },
});
