import type { NotificationSound } from '../types';

/**
 * expo-notifications 用のサウンド名。
 * カスタム音は app.json の expo-notifications プラグインで
 * assets/sounds/*.wav を登録した開発ビルド／APK で再生されます。
 */
export const CUSTOM_SOUND_FILES: Record<Exclude<NotificationSound, 'default' | 'silent'>, string> = {
  bell: 'bell',
  chime: 'chime',
  warning: 'warning',
};

export function resolveNotificationSound(sound: NotificationSound): string | null {
  if (sound === 'silent') return null;
  if (sound === 'default') return 'default';
  return CUSTOM_SOUND_FILES[sound];
}
