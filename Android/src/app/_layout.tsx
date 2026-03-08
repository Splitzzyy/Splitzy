import "../../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/stores/auth.store";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Toast } from "@/components/ui/Toast";
import { NetworkBanner } from "@/components/ui/NetworkBanner";

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/Inter.ttf"),
    "Inter-Light": require("../../assets/fonts/Inter-Light.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0a0f18" },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="group/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="group/create"
              options={{ animation: "slide_from_bottom", presentation: "modal" }}
            />
            <Stack.Screen
              name="expense/add"
              options={{ animation: "slide_from_bottom", presentation: "modal" }}
            />
            <Stack.Screen
              name="expense/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="settle-up"
              options={{ animation: "slide_from_bottom", presentation: "modal" }}
            />
          </Stack>
        </AuthGuard>
        <Toast />
        <NetworkBanner />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
