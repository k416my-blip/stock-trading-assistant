/** 音声検索（Expo Go では未対応・APK化後にネイティブ連携予定） */

export const VOICE_SEARCH_UNAVAILABLE_MESSAGE = '音声検索はAPK化後に利用できます';

export type VoiceSearchResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

/**
 * 音声認識を試行。現状は Expo Go 互換のため常にフォールバック。
 * 開発ビルドで STT を追加する場合はここを拡張する。
 */
export async function tryVoiceSearch(): Promise<VoiceSearchResult> {
  return { ok: false, message: VOICE_SEARCH_UNAVAILABLE_MESSAGE };
}
