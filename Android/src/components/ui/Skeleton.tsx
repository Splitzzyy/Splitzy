import { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Pre-built skeleton for a card-like row (icon + two text lines + trailing) */
export function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width={48} height={48} borderRadius={12} />
      <View style={skeletonStyles.textCol}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
}

/** Pre-built skeleton for a list of cards */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  list: {
    gap: 8,
    paddingHorizontal: 24,
  },
});
