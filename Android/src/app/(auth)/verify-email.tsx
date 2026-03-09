import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/layout";
import { Button, LoadingSpinner } from "@/components/ui";
import { authApi } from "@/services/api/auth.api";
import { colors } from "@/theme";

type VerifyStatus = "loading" | "success" | "already_verified" | "error";

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage("No verification token provided.");
    }
  }, [token]);

  const verifyEmail = async (verifyToken: string) => {
    try {
      const response = await authApi.verifyEmail(verifyToken);
      const code = response.data?.code;
      if (code === "ALREADY_VERIFIED") {
        setStatus("already_verified");
        setMessage("Your email is already verified.");
      } else {
        setStatus("success");
        setMessage("Email verified successfully!");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.response?.data?.message || "Verification failed. The link may be expired.");
    }
  };

  const iconConfig: Record<VerifyStatus, { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
    loading: { name: "email-sync", color: colors.primary },
    success: { name: "check-circle", color: "#34d399" },
    already_verified: { name: "check-circle", color: "#34d399" },
    error: { name: "alert-circle", color: "#ef4444" },
  };

  const { name: iconName, color: iconColor } = iconConfig[status];

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {status === "loading" ? (
          <LoadingSpinner message="Verifying your email..." />
        ) : (
          <>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + "15" }]}>
              <MaterialCommunityIcons name={iconName} size={56} color={iconColor} />
            </View>
            <Text style={styles.title}>
              {status === "success" ? "Verified!" : status === "already_verified" ? "Already Verified" : "Verification Failed"}
            </Text>
            <Text style={styles.message}>{message}</Text>
            <Button
              title="Go to Login"
              onPress={() => router.replace("/(auth)/login")}
              style={{ marginTop: 24, width: "100%" }}
            />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { color: "#ffffff", fontSize: 24, fontFamily: "Inter-Bold", textAlign: "center" },
  message: { color: "#94a3b8", fontSize: 15, fontFamily: "Inter", textAlign: "center", marginTop: 8, lineHeight: 22 },
});
