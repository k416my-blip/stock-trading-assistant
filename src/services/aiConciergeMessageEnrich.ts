import type { AiChatMessage } from '../types/aiChat';
import type { ResolveConciergeConversationModeInput } from '../types/aiConciergeMode';
import {
  resolveConciergeConversationMode,
  shouldShowStructuredForMode,
  stripConciergeBoilerplateFromText,
} from './aiConciergeConversationMode';

export function enrichConciergeChatMessage(
  message: AiChatMessage,
  userText: string,
  ops?: Omit<ResolveConciergeConversationModeInput, 'intent' | 'userMessage'>,
): AiChatMessage {
  const intent = message.responseIntent;
  if (!intent) return message;

  const conversationMode = resolveConciergeConversationMode({
    intent,
    userMessage: userText,
    ...ops,
  });
  const stripped = stripConciergeBoilerplateFromText(message.text);
  return {
    ...message,
    text: stripped,
    responseIntent: intent,
    conversationMode,
    structured: shouldShowStructuredForMode(conversationMode) ? message.structured : undefined,
  };
}
