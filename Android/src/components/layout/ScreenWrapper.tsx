import { View, StyleSheet, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme";

interface ScreenWrapperProps extends ViewProps {
  /** Add safe area padding at top */
  safeTop?: boolean;
  /** Add safe area padding at bottom (for non-tab screens) */
  safeBottom?: boolean;
  children: React.ReactNode;
}

export function ScreenWrapper({
  safeTop = true,
  safeBottom = false,
  children,
  style,
  ...props
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        safeTop && { paddingTop: insets.top },
        safeBottom && { paddingBottom: insets.bottom },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f18",
  },
});
