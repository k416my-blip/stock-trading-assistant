import type { AppUxMode } from '../types/appUxMode';

export const DEFAULT_APP_UX_MODE: AppUxMode = 'standard';

export const APP_UX_MODE_LABELS_JA: Record<AppUxMode, string> = {
  beginner: '初心者',
  standard: '標準',
  pro: 'プロ',
};

export const APP_UX_MODE_HINTS_JA: Record<AppUxMode, string> = {
  beginner: '4タブ · やさしい表示 · Phase詳細非表示 · AI相談タブ',
  standard: '主要タブ + 銘柄チェック · 中間の情報量',
  pro: '全タブ · Phase13–24 · 監査 · 詳細コンシェルジュ',
};
