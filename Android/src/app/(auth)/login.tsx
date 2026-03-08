import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/layout";
import { Input, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema, type LoginFormData } from "@/utils/validators";
import { colors } from "@/theme";
import { useHaptics } from "@/hooks/useHaptics";

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const haptics = useHaptics();
  const [showError, setShowError] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data);
      haptics.success();
    } catch {
      haptics.error();
      setShowError(true);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="wallet-bifold"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your expenses
            </Text>
          </View>

          {error && showError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color="#ef4444"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  leftIcon="email-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  leftIcon="lock-outline"
                  isPassword
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotLink}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </Link>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 40 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(37, 106, 244, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: "#ffffff", fontSize: 28, fontFamily: "Inter-Bold" },
  subtitle: { color: "#64748b", fontSize: 15, fontFamily: "Inter", marginTop: 6 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: "#ef4444", fontSize: 13, fontFamily: "Inter-Medium", flex: 1 },
  form: { gap: 16 },
  forgotLink: { alignSelf: "flex-end" },
  forgotText: { color: colors.primary, fontSize: 13, fontFamily: "Inter-Medium" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: "#64748b", fontSize: 14, fontFamily: "Inter" },
  linkText: { color: colors.primary, fontSize: 14, fontFamily: "Inter-SemiBold" },
});
