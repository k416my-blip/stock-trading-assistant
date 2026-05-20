/**
 * 個人利用専用 — 商用配布は docs/ARCHITECTURE_PERSONAL_VS_COMMERCIAL.md を参照
 */

import {
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
  PLATFORM_POSITIONING_SUBTITLE_JA,
} from './platformClarification';

export const APP_DEPLOYMENT_MODE = 'personal_use' as const;

export type AppDeploymentMode = typeof APP_DEPLOYMENT_MODE;

export const PERSONAL_USE_LABEL = '個人利用';

export const PERSONAL_USE_TAGLINE = `個人用AI投資OS — ${PLATFORM_POSITIONING_SUBTITLE_JA}`;

export const PERSONAL_USE_DISCLAIMERS = [
  'ご自身の検討用のみ — 公開・商用利用ではありません。',
  'モック／閲覧専用のAI提案 — 証券会社への注文送信は行いません。',
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
] as const;

/** 練習（仮想）取引の前に表示 */
export const PERSONAL_DECISION_GATE = {
  title: 'ご自身の判断が必要です',
  responsibility: '最終的な判断はご自身の責任です。',
  noAutoExecution: 'このアプリは注文を出しません。練習取引は端末内のシミュレーションです。',
  stalePricePrefix: '株価が古い可能性:',
  confirm: '理解した — 続行',
  cancel: 'キャンセル',
} as const;
