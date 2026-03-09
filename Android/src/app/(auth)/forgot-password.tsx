import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/layout";
import { Input, Button, IconButton } from "@/components/ui";
import { authApi } from "@/services/api/auth.api";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/utils/validators";
import { colors } from "@/theme";
import { useHaptics } from "@/hooks/useHaptics";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data);
      haptics.success();
      Alert.alert("Reset Link Sent", "Check your email for the password reset link.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.response?.data?.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <IconButton
            name="arrow-left"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="lock-reset" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset link
            </Text>
          </View>
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
            <Button
              title="Send Reset Link"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16 },
  backButton: { backgroundColor: "transparent", borderWidth: 0, alignSelf: "flex-start" },
  header: { alignItems: "center", marginTop: 40, marginBottom: 40 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(37, 106, 244, 0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { color: "#ffffff", fontSize: 24, fontFamily: "Inter-Bold" },
  subtitle: { color: "#64748b", fontSize: 14, fontFamily: "Inter", marginTop: 6, textAlign: "center", lineHeight: 20 },
  form: { gap: 16 },
});
