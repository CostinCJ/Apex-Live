import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/stores/settingsStore';

type HapticEvent =
  | 'set_complete'
  | 'rest_start'
  | 'rest_warning'
  | 'rest_end'
  | 'pr_achieved'
  | 'workout_complete'
  | 'error'
  | 'button_press'
  | 'voice_activated'
  | 'timer_milestone';

function getImpactStyle(): Haptics.ImpactFeedbackStyle {
  const intensity = useSettingsStore.getState().hapticIntensity;
  switch (intensity) {
    case 'light': return Haptics.ImpactFeedbackStyle.Light;
    case 'strong': return Haptics.ImpactFeedbackStyle.Heavy;
    default: return Haptics.ImpactFeedbackStyle.Medium;
  }
}

export async function triggerHaptic(event: HapticEvent): Promise<void> {
  if (Platform.OS === 'web') return;

  const { hapticFeedback } = useSettingsStore.getState();
  if (!hapticFeedback) return;

  const impact = getImpactStyle();

  switch (event) {
    case 'set_complete':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'rest_start':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'rest_warning':
      await Haptics.impactAsync(impact);
      break;
    case 'rest_end':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'pr_achieved':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 200));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'workout_complete':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 150));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 150));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'button_press':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'voice_activated':
      await Haptics.impactAsync(impact);
      break;
    case 'timer_milestone':
      await Haptics.impactAsync(impact);
      break;
  }
}
