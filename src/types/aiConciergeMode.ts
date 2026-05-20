import type { AiConciergeResponseIntent } from './aiConcierge';

export type ResolveConciergeConversationModeInput = {
  intent: AiConciergeResponseIntent;
  userMessage: string;
  degradedMode?: boolean;
  staleHoldingsCount?: number;
  apiHealthDegraded?: boolean;
};
