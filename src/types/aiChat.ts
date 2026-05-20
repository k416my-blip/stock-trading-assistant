import type { AiConciergeConversationMode, AiConciergeResponseIntent } from './aiConcierge';

export type AiChatRole = 'user' | 'assistant';

export type AiChatStructuredReply = {
  reason: string;
  risk: string;
  market: string;
  urgency: string;
  confidence: string;
  dataFreshness: string;
  followUp?: string;
  conclusion?: string;
  technicalReason?: string;
  macroReason?: string;
  systemStateReason?: string;
  confidenceDegradationReason?: string;
};

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  text: string;
  structured?: AiChatStructuredReply;
  responseIntent?: AiConciergeResponseIntent;
  conversationMode?: AiConciergeConversationMode;
  createdAt: string;
};
