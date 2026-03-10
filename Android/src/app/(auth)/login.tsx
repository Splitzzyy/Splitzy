import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { ScreenWrapper } from "@/components/layout";
import { Input, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema, type LoginFormData } from "@/utils/validators";
import { useTheme } from "@/theme";
import { useHaptics } from "@/hooks/useHaptics";
import { GOOGLE_WEB_CLIENT_ID } from "@/constants/auth";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { login, googleLogin, isLoading, error, clearError } = useAuthStore();
  const haptics = useHaptics();
  const { colors } = useTheme();
  const [showError, setShowError] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGooglePress = async () => {
    clearError();
    setShowError(false);
    setIsGoogleLoading(true);
    haptics.light();
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token received");
      await googleLogin({ idToken });
      haptics.success();
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — do nothing
      } else {
        haptics.error();
        setShowError(true);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
            <View style={[styles.logoContainer, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons
                name="wallet-bifold"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
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
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </Link>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading && !isGoogleLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.glass.border }]} />
            <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.glass.border }]} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: colors.glass.card, borderColor: colors.glass.borderLight }]}
            onPress={handleGooglePress}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={20} color={colors.text.primary} />
                <Text style={[styles.googleButtonText, { color: colors.text.primary }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.tertiary }]}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Inter-Bold" },
  subtitle: { fontSize: 15, fontFamily: "Inter", marginTop: 6 },
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
  forgotText: { fontSize: 13, fontFamily: "Inter-Medium" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontSize: 14, fontFamily: "Inter" },
  linkText: { fontSize: 14, fontFamily: "Inter-SemiBold" },
});
