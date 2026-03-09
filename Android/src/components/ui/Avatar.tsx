import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/theme";

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colorPalette = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
    "#14b8a6", "#06b6d4", "#eab308", "#ef4444",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[hash % colorPalette.length];
}

export function Avatar({ uri, name, size = 40, className }: AvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        className={className}
        contentFit="cover"
        transition={200}
      />
    );
  }

  const bgColor = getColorFromName(name);

  return (
    <View
      className={className}
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor + "20",
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: size * 0.38, color: bgColor },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter-SemiBold",
  },
});
