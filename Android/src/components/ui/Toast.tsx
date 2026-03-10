import { useEffect } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView, AnimatePresence } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUIStore } from "@/stores/ui.store";
import { useTheme } from "@/theme";

const ICON_MAP: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  success: "check-circle",
  error: "alert-circle",
  warning: "alert",
  info: "information",
};

export function Toast() {
  const { toast, hideToast } = useUIStore();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const colorMap: Record<string, string> = {
    success: colors.toastText.success,
    error: colors.toastText.error,
    warning: colors.toastText.warning,
    info: colors.primary,
  };

  const bgMap: Record<string, string> = {
    success: colors.toast.success,
    error: colors.toast.error,
    warning: colors.toast.warning,
    info: colors.toast.info,
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(hideToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, hideToast]);

  return (
    <AnimatePresence>
      {toast.visible && (
        <MotiView
          from={{ opacity: 0, translateY: -20, scale: 0.95 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          exit={{ opacity: 0, translateY: -20, scale: 0.95 }}
          transition={{ type: "timing", duration: 250 }}
          style={[
            styles.container,
            {
              top: insets.top + 8,
              backgroundColor: bgMap[toast.type] ?? bgMap.info,
              borderColor: colorMap[toast.type] ?? colorMap.info,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.touchable}
            onPress={hideToast}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={ICON_MAP[toast.type] ?? "information"}
              size={20}
              color={colorMap[toast.type] ?? colorMap.info}
            />
            <Text style={[styles.message, { color: colors.text.primary }]} numberOfLines={2}>
              {toast.message}
            </Text>
          </TouchableOpacity>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  touchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
});
