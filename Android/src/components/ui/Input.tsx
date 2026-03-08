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
import { colors } from "@/theme";

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

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={20}
            color={focused ? colors.primary : "#64748b"}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#475569"
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
              color="#64748b"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontFamily: "Inter-Medium",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: "rgba(37, 106, 244, 0.05)",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  leftIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: "#ffffff",
    fontFamily: "Inter",
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeIcon: { padding: 4 },
  error: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: "Inter",
    marginLeft: 4,
  },
});
