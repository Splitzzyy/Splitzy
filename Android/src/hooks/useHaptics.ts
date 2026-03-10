import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settings.store";

/**
 * Hook providing haptic feedback functions.
 * Respects the user's haptic feedback preference from settings.
 */
export function useHaptics() {
  const enabled = useSettingsStore((s) => s.hapticsEnabled);

  const light = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [enabled]);

  const medium = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [enabled]);

  const heavy = useCallback(() => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [enabled]);

  const success = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [enabled]);

  const warning = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [enabled]);

  const error = useCallback(() => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [enabled]);

  const selection = useCallback(() => {
    if (!enabled) return;
    Haptics.selectionAsync();
  }, [enabled]);

  return { light, medium, heavy, success, warning, error, selection };
}
