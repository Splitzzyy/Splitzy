import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  isPassword,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          focused && { borderColor: colors.primary, backgroundColor: colors.inputBackgroundFocused },
          error && { borderColor: colors.error },
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={20}
            color={focused ? colors.primary : colors.text.tertiary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.text.primary }, style]}
          placeholderTextColor={colors.text.hint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  leftIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeIcon: { padding: 4 },
  error: {
    fontSize: 12,
    fontFamily: "Inter",
    marginLeft: 4,
  },
});
