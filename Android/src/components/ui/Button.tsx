import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme";
import { triggerHaptic } from "@/utils/haptics";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  className,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic();
    onPress();
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 8,
    },
    secondary: {
      backgroundColor: colors.glass.card,
      borderWidth: 1,
      borderColor: colors.glass.borderLight,
    },
    ghost: {
      backgroundColor: "transparent",
    },
    danger: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
    },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: "#ffffff" },
    secondary: { color: colors.text.primary },
    ghost: { color: colors.primary },
    danger: { color: colors.error },
  };

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[`size_${size}` as keyof typeof styles] as ViewStyle,
    variantStyles[variant],
    (disabled || loading) && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
    textVariantStyles[variant],
  ];

  return (
    <TouchableOpacity
      className={className}
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
  },
  size_sm: { paddingHorizontal: 12, paddingVertical: 8 },
  size_md: { paddingHorizontal: 20, paddingVertical: 12 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 16 },
  disabled: { opacity: 0.5 },
  text: { fontFamily: "Inter-SemiBold" },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});
