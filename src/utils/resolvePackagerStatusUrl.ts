import Constants from 'expo-constants';

/** Expo Go / トンネル経由の Metro /status URL */
export function resolvePackagerStatusUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const base = hostUri.startsWith('http') ? hostUri : `http://${hostUri}`;
    return `${base.replace(/\/$/, '')}/status`;
  }
  return 'http://127.0.0.1:8081/status';
}
