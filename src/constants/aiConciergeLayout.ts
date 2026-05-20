/** Concierge bottom-sheet section order (top → bottom) */

export const CONCIERGE_PANEL_SECTION_ORDER = [
  'header',
  'composer',
  'status_card',
  'chat_history',
  'footer_meta',
] as const;

export type ConciergePanelSectionId = (typeof CONCIERGE_PANEL_SECTION_ORDER)[number];

export function conciergeSectionIndex(id: ConciergePanelSectionId): number {
  return CONCIERGE_PANEL_SECTION_ORDER.indexOf(id);
}

/** Settings → 詳細設定 disclosure order (for tests) */
export const SETTINGS_ADVANCED_DISCLOSURE_ORDER = [
  'beginner_guide',
  'personal_use_card',
  'risk_notice',
] as const;

export type SettingsAdvancedDisclosureSectionId =
  (typeof SETTINGS_ADVANCED_DISCLOSURE_ORDER)[number];

export function settingsAdvancedDisclosureIndex(id: SettingsAdvancedDisclosureSectionId): number {
  return SETTINGS_ADVANCED_DISCLOSURE_ORDER.indexOf(id);
}

export const AI_CONCIERGE_RISK_NOTICE_TITLE_JA = 'リスク告知';

export const AI_CONCIERGE_RISK_NOTICE_BODY_JA =
  '本アプリは投資判断を保証しません。実際の注文は証券会社アプリで手動実行してください。株式投資には元本割れのリスクがあり、表示データが古い場合は判断材料として不十分です。';

export const AI_CONCIERGE_BEGINNER_GUIDE_TITLE_JA = '初心者ガイド';

export const AI_CONCIERGE_BEGINNER_GUIDE_BODY_JA =
  'はじめての方は、練習モードで仮想売買を試し、実運用分析では証券会社で約定後に記録する流れを確認してください。用語は各画面の「？」から参照できます。';

export const AI_CONCIERGE_PERSONAL_USE_TITLE_JA = '個人利用の分析補助';

/** Concierge: quick-question chips removed */
export const SHOW_CONCIERGE_QUICK_ACTIONS = false;

/** React Native testID for layout-order assertions */
export const CONCIERGE_SECTION_TEST_ID: Record<ConciergePanelSectionId, string> = {
  header: 'concierge-section-header',
  composer: 'concierge-section-composer',
  status_card: 'concierge-section-status-card',
  chat_history: 'concierge-section-chat-history',
  footer_meta: 'concierge-section-footer-meta',
};

export const SETTINGS_ADVANCED_DISCLOSURE_TEST_ID: Record<
  SettingsAdvancedDisclosureSectionId,
  string
> = {
  beginner_guide: 'settings-advanced-beginner-guide',
  personal_use_card: 'settings-advanced-personal-use-card',
  risk_notice: 'settings-advanced-risk-notice',
};

/** Props for SelectableText in tests */
export const SELECTABLE_TEXT_PROP = { selectable: true } as const;
