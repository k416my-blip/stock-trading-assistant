import { Platform, Vibration } from 'react-native';
import type { UrgencySignalLevel } from '../types/urgencySignal';

export type UrgentAlertPrefs = {
  urgentVibrationEnabled: boolean;
  urgentSoundEnabled: boolean;
};

export async function playUrgentSignalFeedback(
  level: UrgencySignalLevel,
  prefs: UrgentAlertPrefs,
): Promise<void> {
  if (level !== 'critical') return;

  if (prefs.urgentVibrationEnabled) {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([0, 120, 80, 120]);
      }
    } else {
      try {
        const Haptics = await import('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Vibration.vibrate([0, 100, 60, 100]);
      } catch {
        Vibration.vibrate(200);
      }
    }
  }

  if (prefs.urgentSoundEnabled) {
    await playUrgentBeep();
  }
}

async function playUrgentBeep(): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        void ctx.close();
      }, 120);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    /* no sound asset — haptic fallback only */
  }
}
