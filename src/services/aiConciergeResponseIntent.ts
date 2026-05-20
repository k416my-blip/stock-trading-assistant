import type { AiConciergeConversationMode, AiConciergeResponseIntent } from '../types/aiConcierge';
import type { ResolveConciergeConversationModeInput } from '../types/aiConciergeMode';
import {
  resolveConciergeConversationMode,
  shouldAppendConciergeSafetyFooter,
  shouldShowStructuredForMode,
} from './aiConciergeConversationMode';

export function classifyConciergeResponseIntent(message: string): AiConciergeResponseIntent {
  const t = message.trim();
  if (!t) return 'general_education';

  if (/注目銘柄|注目している|おすすめ銘柄|どの銘柄|何に注目/.test(t)) {
    return 'general_education';
  }

  if (/なぜ下がった|下落理由|下げ要因|なぜ下げ|下がった理由/.test(t)) {
    return 'general_education';
  }

  if (
    /なぜ買い推奨|買い推奨|売却検討|売るべき|買うべき|買い？|売り？|この銘柄|緊急性は|今すぐ買|今すぐ売|仕込|利確/i.test(
      t,
    ) ||
    (/\d{4}/.test(t) && /買|売|推奨|判断/.test(t))
  ) {
    return 'investment_analysis';
  }

  if (
    /保有バランス|ポートフォリオ|セクター偏り|偏り|保有銘柄|ポジション|配分|古い株価の銘柄|執行照合/i.test(
      t,
    )
  ) {
    return 'portfolio_review';
  }

  if (
    /更新停止|quota|レート制限|診断ログ|劣化|キュー|API|接続|フォールバック|キルスイッチ|セーフブート|リカバリ|システム状態/i.test(
      t,
    )
  ) {
    return 'system_status';
  }

  if (
    /健全性チェック|制限モード|劣化モード|読み取り専用|stale|古いデータ|古い株価|ボタン|画面|タブ|設定|使い方|操作|ヘルプ|どうやって/i.test(
      t,
    )
  ) {
    return 'app_help';
  }

  if (/リスクオフ|リスクオン|risk-on|risk-off|とは|意味|教えて|何ですか/i.test(t)) {
    return 'general_education';
  }

  if (/信頼度|レジーム|マクロ|テクニカル|市場リスク/.test(t) && !/とは|意味|教えて|何ですか/.test(t)) {
    return 'investment_analysis';
  }

  return 'general_education';
}

/** Structured 理由/リスク/市場 blocks — analysis mode only */
export function shouldShowStructuredConciergeReply(
  intentOrMode: AiConciergeResponseIntent | AiConciergeConversationMode,
  userMessage = '',
  ops?: Omit<ResolveConciergeConversationModeInput, 'intent' | 'userMessage'>,
): boolean {
  if (
    intentOrMode === 'conversation' ||
    intentOrMode === 'elaboration' ||
    intentOrMode === 'warning' ||
    intentOrMode === 'analysis'
  ) {
    return shouldShowStructuredForMode(intentOrMode);
  }
  const mode = resolveConciergeConversationMode({
    intent: intentOrMode,
    userMessage,
    ...ops,
  });
  return shouldShowStructuredForMode(mode);
}

/** Append per-message safety footer only for explicit analysis mode */
export function shouldAppendMessageSafetyFooter(
  intentOrMode: AiConciergeResponseIntent | AiConciergeConversationMode,
  userMessage = '',
  ops?: Omit<ResolveConciergeConversationModeInput, 'intent' | 'userMessage'>,
): boolean {
  if (
    intentOrMode === 'conversation' ||
    intentOrMode === 'elaboration' ||
    intentOrMode === 'warning' ||
    intentOrMode === 'analysis'
  ) {
    return shouldAppendConciergeSafetyFooter(intentOrMode);
  }
  const mode = resolveConciergeConversationMode({
    intent: intentOrMode,
    userMessage,
    ...ops,
  });
  return shouldAppendConciergeSafetyFooter(mode);
}
