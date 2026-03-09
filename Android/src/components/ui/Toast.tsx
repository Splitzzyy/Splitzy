import { useEffect } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView, AnimatePresence } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUIStore } from "@/stores/ui.store";
import { colors } from "@/theme";

const ICON_MAP: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  success: "check-circle",
  error: "alert-circle",
  warning: "alert",
  info: "information",
};

const COLOR_MAP: Record<string, string> = {
  success: colors.semantic.positive,
  error: colors.semantic.negative,
  warning: colors.semantic.warning,
  info: colors.primary,
};

const BG_MAP: Record<string, string> = {
  success: "#0d2818",
  error: "#2a0f13",
  warning: "#2a2008",
  info: "#0c1a30",
};

export function Toast() {
  const { toast, hideToast } = useUIStore();
  const insets = useSafeAreaInsets();

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
              backgroundColor: BG_MAP[toast.type] ?? BG_MAP.info,
              borderColor: COLOR_MAP[toast.type] ?? COLOR_MAP.info,
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
              color={COLOR_MAP[toast.type] ?? COLOR_MAP.info}
            />
            <Text style={styles.message} numberOfLines={2}>
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
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
});
