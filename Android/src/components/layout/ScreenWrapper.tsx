import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

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
  const { colors } = useTheme();

  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.background.main },
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
