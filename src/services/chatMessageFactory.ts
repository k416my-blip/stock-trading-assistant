import type { AiChatMessage, AiChatMessageSource, AiChatRole } from '../types/aiChat';
import { createChatTimestampFields } from '../utils/chatTimestamp';

let auditListener: ((message: AiChatMessage) => void) | null = null;

export function registerChatAuditListener(listener: ((message: AiChatMessage) => void) | null): void {
  auditListener = listener;
}

export function emitChatAuditNotice(
  text: string,
  source: AiChatMessageSource,
  role: AiChatRole = 'system',
): void {
  const msg = createChatMessage({ role, text, messageSource: source });
  auditListener?.(msg);
}

type CreateChatMessageInput = Omit<
  AiChatMessage,
  'createdAt' | 'sortKey' | 'timezoneOffsetMinutes' | 'id'
> &
  Partial<Pick<AiChatMessage, 'createdAt' | 'sortKey' | 'timezoneOffsetMinutes' | 'id'>>;

export function createChatMessage(input: CreateChatMessageInput): AiChatMessage {
  const id =
    input.id ??
    `${input.role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const stamp = input.createdAt && Number.isFinite(Date.parse(input.createdAt))
    ? {
        createdAt: input.createdAt,
        sortKey: input.sortKey ?? Date.parse(input.createdAt),
        timezoneOffsetMinutes:
          input.timezoneOffsetMinutes ??
          -new Date(input.createdAt).getTimezoneOffset(),
      }
    : createChatTimestampFields();

  return {
    messageSource: 'chat',
    ...input,
    id,
    ...stamp,
  };
}

export function createUserChatMessage(
  text: string,
  options?: { messageSource?: AiChatMessageSource },
): AiChatMessage {
  return createChatMessage({
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: 'user',
    text: text.trim(),
    messageSource: options?.messageSource ?? 'chat',
  });
}

export function createAssistantChatMessagePartial(
  partial: Omit<CreateChatMessageInput, 'role'> & { role?: 'assistant' },
): AiChatMessage {
  return createChatMessage({
    role: 'assistant',
    messageSource: 'chat',
    ...partial,
  });
}

export function createSystemChatNotice(
  text: string,
  source: AiChatMessageSource,
): AiChatMessage {
  return createChatMessage({
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: 'system',
    text: text.trim(),
    messageSource: source,
  });
}

export function createSignalChatNotice(titleJa: string, bodyJa?: string): AiChatMessage {
  const text = bodyJa ? `${titleJa}\n${bodyJa}` : titleJa;
  return createSystemChatNotice(text, 'signal');
}

export function createQueueAckChatNotice(labelJa: string, ticker?: string): AiChatMessage {
  const detail = ticker ? `${labelJa}（${ticker}）` : labelJa;
  return createSystemChatNotice(`キュー確認: ${detail}`, 'queue_ack');
}

export function createWarningChatNotice(text: string): AiChatMessage {
  return createSystemChatNotice(text, 'warning');
}
