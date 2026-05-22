import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../constants/aiExplanationLevel';
import type { AiChatMessage, AiChatMessageSource, AiChatStructuredReply } from '../types/aiChat';
import {
  createAssistantChatMessagePartial,
  createChatMessage,
  createUserChatMessage as createStampedUserChatMessage,
} from '../services/chatMessageFactory';
import { createDatetimeInstantMessage } from '../services/currentDateTime';
import { getConciergeInstantAnswer } from '../services/aiConciergeInstantAnswers';
import { classifyConciergeResponseIntent } from '../services/aiConciergeResponseIntent';
import {
  resolveConciergeConversationMode,
  shouldShowStructuredForMode,
  wantsDetailedConciergeAnalysis,
} from '../services/aiConciergeConversationMode';
import type { AiConciergeConversationMode, AiConciergeResponseIntent } from '../types/aiConcierge';

const WELCOME: AiChatMessage = createChatMessage({
  id: 'welcome',
  role: 'assistant',
  text: 'こんにちは。戦略コンシェルジュです。用語・銘柄・マクロ・保有の見方など、質問に直接答えます。',
  responseIntent: 'general_education',
  conversationMode: 'conversation',
});

function finalizeMockReply(
  text: string,
  structured: AiChatStructuredReply | undefined,
  responseIntent: AiConciergeResponseIntent,
  userMessage: string,
): {
  text: string;
  structured?: AiChatStructuredReply;
  responseIntent: AiConciergeResponseIntent;
  conversationMode: AiConciergeConversationMode;
} {
  const conversationMode = resolveConciergeConversationMode({
    intent: responseIntent,
    userMessage,
  });
  const useStructured =
    structured && shouldShowStructuredForMode(conversationMode);
  return {
    text,
    structured: useStructured ? structured : undefined,
    responseIntent,
    conversationMode,
  };
}

function buildReply(
  userText: string,
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
): {
  text: string;
  structured?: AiChatStructuredReply;
  responseIntent: AiConciergeResponseIntent;
  conversationMode: AiConciergeConversationMode;
} {
  const raw = userText.trim();
  const intent = classifyConciergeResponseIntent(raw);

  const datetime = createDatetimeInstantMessage(raw);
  if (datetime) {
    return {
      text: datetime.text,
      responseIntent: datetime.responseIntent ?? 'general_education',
      conversationMode: 'conversation',
    };
  }

  const instant = getConciergeInstantAnswer(raw, explanationLevel);
  if (instant) {
    return {
      text: instant.text,
      structured: instant.structured,
      responseIntent: instant.responseIntent ?? intent,
      conversationMode: instant.conversationMode ?? 'conversation',
    };
  }

  const detailed = wantsDetailedConciergeAnalysis(raw);

  if (/なぜ買い推奨|買い推奨の理由/.test(raw)) {
    return finalizeMockReply(
      detailed
        ? '買い推奨の根拠は、支持帯付近の押し目とトレンド維持の組み合わせが多いです。信頼度は中程度以下のことが多く、小口で検証する前提です。'
        : 'モックでは、支持帯付近の押し目やトレンド維持を「買い推奨」の参考理由としています。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  if (/なぜ売却検討|売却検討の理由/.test(raw)) {
    return finalizeMockReply(
      'モックでは、公平価値帯より高い、またはボラティリティ拡大時に「売却検討」を付与します。過剰保有の整理の目安です。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  if (/緊急性/.test(raw)) {
    return finalizeMockReply(
      '緊急性「高」は監視を促すラベルで、取引を促すものではありません。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  if (/今のリスク|リスクは/.test(raw)) {
    return finalizeMockReply(
      'いま押さえるべきは、古い株価での判断、API未接続時のモック精度、ポジションサイズの過大の3点です。',
      undefined,
      'general_education',
      raw,
    );
  }

  const q = raw.toLowerCase();
  const has1155 = q.includes('1155') || q.includes('maybank');
  const hasSell = /売|reduce|利確/.test(raw);
  const hasBuy = /買|buy|仕込/.test(raw);

  if (has1155 && hasSell) {
    return finalizeMockReply(
      '1155（マレー銀行）はモックでは「保有推奨」寄りです。過剰保有でなければ、いまは売却を急ぐ必要は薄いと見ています。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  if (has1155 || hasBuy) {
    return finalizeMockReply(
      '小口の「買い推奨」候補はありますが、信頼度は中以下です。まず練習モードで記録フローを確認するのが無難です。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  if (hasSell) {
    return finalizeMockReply(
      '売却検討は、ポジションとニュースを自分で確認するための目安ラベルです。',
      undefined,
      'investment_analysis',
      raw,
    );
  }

  return finalizeMockReply(
    'ご質問ありがとうございます。銘柄コード（例: 1155）や「注目銘柄は？」「リスクオフとは？」のように具体的に聞いてもらえると、すぐ答えられます。',
    undefined,
    'general_education',
    raw,
  );
}

export function getInitialAiChatMessages(): AiChatMessage[] {
  return [WELCOME];
}

export function createUserChatMessage(
  text: string,
  options?: { messageSource?: AiChatMessageSource },
): AiChatMessage {
  return createStampedUserChatMessage(text, options);
}

export function createAssistantChatMessage(
  userText: string,
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
): AiChatMessage {
  const { text, structured, responseIntent, conversationMode } = buildReply(
    userText,
    explanationLevel,
  );
  return createAssistantChatMessagePartial({
    id: `a-${Date.now()}`,
    text,
    structured,
    responseIntent,
    conversationMode,
  });
}
