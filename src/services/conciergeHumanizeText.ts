import { PANIC_WORD_REPLACEMENTS } from '../constants/conciergeUx';
import type { AiChatStructuredReply } from '../types/aiChat';
import type { ConciergeShortAnswer } from '../types/conciergeUx';

export function humanizeAnalystText(text: string): string {
  let out = text;
  for (const { pattern, replacement } of PANIC_WORD_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function buildShortAnswerFromStructured(
  structured?: AiChatStructuredReply,
  fallbackText?: string,
): ConciergeShortAnswer {
  const conclusionJa = humanizeAnalystText(
    structured?.conclusion?.trim() ||
      structured?.market?.trim() ||
      fallbackText?.split('\n')[0]?.slice(0, 120) ||
      '現時点の材料を整理しました。',
  );

  const reasons: string[] = [];
  if (structured?.reason) reasons.push(humanizeAnalystText(structured.reason));
  if (structured?.technicalReason) reasons.push(humanizeAnalystText(structured.technicalReason));
  if (structured?.macroReason) reasons.push(humanizeAnalystText(structured.macroReason));
  if (structured?.systemStateReason) reasons.push(humanizeAnalystText(structured.systemStateReason));
  if (structured?.risk && reasons.length < 3) {
    reasons.push(humanizeAnalystText(structured.risk));
  }
  while (reasons.length < 3 && reasons.length > 0) {
    reasons.push('追加の独立根拠は限定的 — データ更新を確認');
    if (reasons.length >= 3) break;
  }

  const actionJa = humanizeAnalystText(
    structured?.followUp?.trim() ||
      '急がず、保有比率と損切りルールを先に確認してください（参考）。',
  );

  return {
    conclusionJa,
    reasonsJa: reasons.slice(0, 3),
    actionJa,
  };
}
