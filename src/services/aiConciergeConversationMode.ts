import type { AiConciergeConversationMode } from '../types/aiConcierge';
import type { ResolveConciergeConversationModeInput } from '../types/aiConciergeMode';
import { userWantsElaboration } from './aiConciergeEntityExtraction';

export type { AiConciergeConversationMode, ResolveConciergeConversationModeInput };

export function wantsDetailedConciergeAnalysis(message: string): boolean {
  return /詳細分析|分析モード|深掘り|深掘|レポート形式|構造化して|根拠をすべて|フル分析|詳しく分析/i.test(
    message.trim(),
  );
}

export function resolveConciergeConversationMode(
  input: ResolveConciergeConversationModeInput,
): AiConciergeConversationMode {
  const t = input.userMessage.trim();
  const degraded = Boolean(input.degradedMode);
  const stale = (input.staleHoldingsCount ?? 0) > 0;
  const apiBad = Boolean(input.apiHealthDegraded);

  if (
    input.intent === 'system_status' ||
    ((degraded || stale || apiBad) &&
      /劣化|診断|API|接続|更新停止|フォールバック|システム状態|stale|古いデータ|quota|レート制限/i.test(t))
  ) {
    return 'warning';
  }

  if (wantsDetailedConciergeAnalysis(t)) {
    return 'analysis';
  }

  if (
    (input.intent === 'investment_analysis' || input.intent === 'portfolio_review') &&
    /詳細|深掘|レポート|構造化|根拠一覧|フル|テクニカルとマクロ両方/i.test(t)
  ) {
    return 'analysis';
  }

  if (userWantsElaboration(t)) {
    return 'elaboration';
  }

  return 'conversation';
}

export function shouldShowStructuredForMode(mode: AiConciergeConversationMode): boolean {
  return mode === 'analysis';
}

export function shouldAppendConciergeSafetyFooter(mode: AiConciergeConversationMode): boolean {
  return mode === 'analysis';
}

const BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^最終判断はユーザー自身[^\n]*$/gim,
  /^市場ニュースを確認してください[^\n]*$/gim,
  /^確認事項:\s*.*/gim,
  /^リスク:\s*.*/gim,
  /^緊急性:\s*.*/gim,
  /^市場状況:\s*.*/gim,
  /^信頼度:\s*.*/gim,
  /^理由:\s*.*/gim,
  /^結論:\s*.*/gim,
  /^データ鮮度:\s*.*/gim,
];

/** Remove template labels the model may echo into body text. */
export function stripConciergeBoilerplateFromText(text: string): string {
  let out = text;
  for (const re of BOILERPLATE_LINE_PATTERNS) {
    out = out.replace(re, '');
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
