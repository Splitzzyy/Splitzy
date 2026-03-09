import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { IconButton } from "../ui/IconButton";
import { Avatar } from "../ui/Avatar";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showAvatar?: boolean;
  avatarName?: string;
  avatarUri?: string;
  onAvatarPress?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  showBack = false,
  showAvatar = false,
  avatarName = "",
  avatarUri,
  onAvatarPress,
  rightAction,
}: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <IconButton
            name="arrow-left"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        )}
        {showAvatar && (
          onAvatarPress ? (
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7}>
              <Avatar name={avatarName} uri={avatarUri} size={36} />
            </TouchableOpacity>
          ) : (
            <Avatar name={avatarName} uri={avatarUri} size={36} />
          )
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightAction && <View style={styles.right}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
    flex: 1,
  },
  backButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
});
