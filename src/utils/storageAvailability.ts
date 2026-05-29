import { Platform } from 'react-native';

/** AsyncStorage / 永続化診断が利用可能か（RN 実機では window が無いことがある） */
export function isPersistedStorageAvailable(): boolean {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return true;
  }
  return typeof globalThis !== 'undefined' && 'window' in globalThis;
}
