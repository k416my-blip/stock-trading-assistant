import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickTransactionHistoryImageResult =
  | { ok: true; uri: string }
  | { ok: false; cancelled: boolean; error?: string };

/** Launch photo library and return local URI for Transaction History screenshot. */
export async function pickTransactionHistoryImage(): Promise<PickTransactionHistoryImageResult> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return {
        ok: false,
        cancelled: false,
        error: '写真ライブラリへのアクセスが拒否されました。設定から許可してください。',
      };
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { ok: false, cancelled: true };
  }

  return { ok: true, uri: result.assets[0].uri };
}

export async function pickTransactionHistoryImageWithAlert(): Promise<string | null> {
  const picked = await pickTransactionHistoryImage();
  if (picked.ok) return picked.uri;
  if (picked.cancelled) return null;
  if (picked.error) {
    Alert.alert('画像を選べません', picked.error);
  }
  return null;
}
