import * as Haptics from "expo-haptics";
import { useSettingsStore } from "@/stores/settings.store";

/**
 * Non-hook haptic helpers that respect the settings store.
 * Use these in callbacks/event handlers where useHaptics() isn't convenient.
 */
export function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.impactAsync(style);
}

export function triggerNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
) {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.notificationAsync(type);
}

export function triggerSelection() {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.selectionAsync();
}
