import type { AiConciergeMode } from '../constants/aiConcierge';

/** Classify user message into concierge conversation role (no LLM). */
export function detectConciergeMode(message: string): AiConciergeMode {
  const t = message.trim();
  if (!t) return 'general';

  if (
    /ボタン|画面|タブ|設定|使い方|操作|ヘルプ|とは|説明して|どうやって|健全性チェック|制限モード|読み取り専用|stale|古い株価データ/i.test(
      t,
    )
  ) {
    return 'operation';
  }

  if (
    /買い推奨|売却検討|信頼度|推奨が|戦略|レジーム|マクロ|テクニカル|緊急|リスクオン|risk-on|なぜ買い|なぜ売/i.test(
      t,
    )
  ) {
    return 'strategy';
  }

  if (
    /更新停止|quota|レート制限|診断|劣化|キュー|API|接続|フォールバック|モック|キルスイッチ|セーフブート|リカバリ/i.test(
      t,
    )
  ) {
    return 'system';
  }

  if (
    /保有|ポートフォリオ|バランス|セクター|偏り|銘柄|株数|配分|照合|ジャーナル|ポジション/i.test(
      t,
    )
  ) {
    return 'portfolio';
  }

  return 'general';
}

export function conciergeModePromptHint(mode: AiConciergeMode): string {
  switch (mode) {
    case 'operation':
      return '操作説明モード: UI・機能・用語を分かりやすく説明。投資助言はしない。';
    case 'strategy':
      return '戦略モード: 相場・推奨・信頼度を世界モデルに基づき説明。';
    case 'system':
      return 'システムモード: 診断・劣化・キュー・API制限・更新停止の理由を説明。';
    case 'portfolio':
      return 'ポートフォリオモード: 保有・偏り・鮮度・執行リスクを説明。';
    default:
      return '一般会話: 質問に直接答える。テンプレ見出し・毎回の免責は出さない。';
  }
}
