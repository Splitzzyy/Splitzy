import { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { MotiView, AnimatePresence } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -10 }}
          transition={{ type: "timing", duration: 200 }}
          style={[styles.banner, { top: insets.top }]}
        >
          <MaterialCommunityIcons
            name="wifi-off"
            size={16}
            color={colors.semantic.warning}
          />
          <Text style={styles.text}>No internet connection</Text>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9998,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.2)",
  },
  text: {
    color: colors.semantic.warning,
    fontSize: 13,
    fontFamily: "Inter-Medium",
  },
});
