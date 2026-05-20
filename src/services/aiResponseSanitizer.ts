import { AI_FORBIDDEN_EXPRESSIONS, AI_PERSONAL_SAFETY_FOOTER } from '../constants/aiStrategy';
import type { AiConciergeConversationMode } from '../types/aiConcierge';
import type { AiChatStructuredReply } from '../types/aiChat';
import { stripConciergeBoilerplateFromText } from './aiConciergeConversationMode';

export type ParsedAiApiJson = {
  conclusion?: string;
  reason?: string;
  technicalReason?: string;
  macroReason?: string;
  risk?: string;
  systemStateReason?: string;
  confidenceDegradationReason?: string;
  urgency?: string;
  confidence?: string;
  dataFreshness?: string;
  followUp?: string;
  body?: string;
};

export type SanitizeAiTextOptions = {
  appendSafetyFooter?: boolean;
};

export function containsForbiddenExpression(text: string): boolean {
  return AI_FORBIDDEN_EXPRESSIONS.some((re) => re.test(text));
}

export function sanitizeAiText(text: string, options?: SanitizeAiTextOptions): string {
  let out = text;
  for (const re of AI_FORBIDDEN_EXPRESSIONS) {
    out = out.replace(re, '（表現を修正しました）');
  }
  if (options?.appendSafetyFooter && !out.includes('最終判断はユーザー自身')) {
    out = `${out}\n\n${AI_PERSONAL_SAFETY_FOOTER}`;
  }
  return out.trim();
}

export function parseAiApiJsonContent(raw: string): ParsedAiApiJson | null {
  try {
    const trimmed = raw.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) return null;
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as ParsedAiApiJson;
  } catch {
    return null;
  }
}

export function toStructuredReply(parsed: ParsedAiApiJson, marketFallback: string): AiChatStructuredReply {
  return {
    conclusion: parsed.conclusion ?? '参考情報のみ',
    reason: parsed.reason ?? '—',
    technicalReason: parsed.technicalReason,
    macroReason: parsed.macroReason,
    risk: parsed.risk ?? '—',
    systemStateReason: parsed.systemStateReason,
    confidenceDegradationReason: parsed.confidenceDegradationReason,
    market: marketFallback,
    urgency: parsed.urgency ?? '—',
    confidence: parsed.confidence ?? '—',
    dataFreshness: parsed.dataFreshness ?? '端末の株価更新時刻を確認してください。',
    followUp: parsed.followUp ?? '証券会社の画面で価格とニュースを確認してください。',
  };
}

export function buildDisplayText(
  parsed: ParsedAiApiJson,
  structured: AiChatStructuredReply,
  mode: AiConciergeConversationMode = 'conversation',
): string {
  const rawBody = parsed.body ?? structured.conclusion ?? '分析補助の参考情報です。';
  let body = stripConciergeBoilerplateFromText(rawBody);
  body = sanitizeAiText(body, { appendSafetyFooter: mode === 'analysis' });

  if (mode !== 'analysis') {
    return body;
  }

  const follow =
    structured.followUp && !body.includes(structured.followUp) ? `\n\n${structured.followUp}` : '';
  return `${body}${follow}`;
}
