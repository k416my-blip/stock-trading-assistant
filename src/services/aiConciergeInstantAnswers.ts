import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../constants/aiExplanationLevel';
import type { AiChatMessage } from '../types/aiChat';
import type { AiConciergeResponseIntent } from '../types/aiConcierge';
import type { AiChatStructuredReply } from '../types/aiChat';
import { createDatetimeInstantMessage } from './currentDateTime';
import { normalizeAiExplanationLevel } from './aiExplanationLevel';
import {
  formatAiCompanyWatchlistAnswerJa,
  formatGeneralWatchlistAnswerJa,
} from '../constants/aiConciergeSpecificity';
import {
  resolveConciergeConversationMode,
  shouldShowStructuredForMode,
  wantsDetailedConciergeAnalysis,
} from './aiConciergeConversationMode';
import { enrichConciergeChatMessage } from './aiConciergeMessageEnrich';

type LevelTexts = Partial<Record<AiExplanationLevel, string>> & { general: string };

type InstantFaq = {
  test: RegExp;
  intent: AiConciergeResponseIntent;
  texts: LevelTexts;
  structured?: AiChatStructuredReply;
};

function faqText(text: string): LevelTexts {
  return { general: text };
}

function resolveFaqText(texts: LevelTexts, level: AiExplanationLevel): string {
  const resolved = normalizeAiExplanationLevel(level);
  return texts[resolved] ?? texts.general;
}

const FAQ_ENTRIES: InstantFaq[] = [
  {
    test: /AI関連.*(会社|企業)|会社名.*(AI|ＡＩ)|注目している会社|どの会社.*AI|AI.*(銘柄|株).*(名前|教え)|(?:会社|企業).*(?:AI|ＡＩ).*(?:注目|名前|リスト)/,
    intent: 'general_education',
    texts: {
      sell_side_md: formatAiCompanyWatchlistAnswerJa(),
      advanced: formatAiCompanyWatchlistAnswerJa(),
      general: formatAiCompanyWatchlistAnswerJa(),
      high_school:
        'AI関連で見ている会社名は、NVIDIA、AMD、TSMC、Microsoft、Alphabet、Amazon、Meta、マレー銀行（1155）などです。チップを作る会社と、クラウドでAIを使う大きな会社、国内の銀行を分けて見ています。',
    },
  },
  {
    test: /注目銘柄|注目している|おすすめ銘柄|どの銘柄|何に注目/,
    intent: 'general_education',
    texts: {
      sell_side_md: formatGeneralWatchlistAnswerJa(),
      advanced: formatGeneralWatchlistAnswerJa(),
      general: formatGeneralWatchlistAnswerJa(),
      high_school:
        '具体名で言うと、半導体は NVIDIA・TSMC・AMD、大きなテック株は Microsoft・Alphabet・Amazon・Meta、国内ではマレー銀行（1155）を見ています。AI用チップと金利の動きを一緒に確認しています。',
    },
  },
  {
    test: /具体的に|具体例|例えば|どういう意味/,
    intent: 'general_education',
    texts: faqText(formatGeneralWatchlistAnswerJa()),
  },
  {
    test: /なぜ下がった|下落理由|下げ要因|なぜ下げ|下がった理由/,
    intent: 'general_education',
    texts: faqText(
      '直近の下落は、金利上昇懸念とセクター収益の下方修正が重なったことが主因です。個別では決算ガイダンスの下振れも効いています。',
    ),
  },
  {
    test: /リスクオフ/,
    intent: 'general_education',
    texts: {
      sell_side_md:
        'リスクオフは、リスク資産（株・クレジット等）から安全資産（債券・現金・金）へフローがシフトする局面です。',
      advanced:
        'リスクオフとは、株式などのリスク資産から資金が退避し、債券・現金・金などに流れやすい局面です。',
      general:
        'リスクオフとは、投資家が株などの値動きが大きい資産を避け、現金や債券など比較的安全な資産に資金を移す状態です。',
      high_school:
        'リスクオフとは、みんなが「今は危なそうだから安全な場所にお金を避難させよう」と考える状態です。株は売られやすく、現金や金などが選ばれやすくなります。',
    },
  },
  {
    test: /リスクオン/,
    intent: 'general_education',
    texts: {
      advanced:
        'リスクオンとは、リスク資産（株式など）への資金流入が増え、ボラティリティ許容が高まる局面です。安全資産への逃避は起きにくくなります。',
      general:
        'リスクオンとは、投資家がリスクを取りにいく相場環境のことです。株式などリスク資産への資金流入が増え、安全資産への逃避は起きにくくなります。',
      high_school:
        'リスクオンとは、「少しリスクを取っても利益が見込めそう」とみんなが考えやすい状態です。株などに資金が集まりやすくなります。',
    },
  },
  {
    test: /健全性チェック/,
    intent: 'app_help',
    texts: faqText(
      '健全性チェックは、APIキー、価格データ、保存状態、診断エラーをまとめて確認する機能です。問題があれば価格更新や設定を先に見直してください。',
    ),
  },
  {
    test: /制限モード|劣化モード/,
    intent: 'app_help',
    texts: faqText(
      '制限モード（劣化モード）は、API制限や接続失敗などを検出したときに分析の信頼度を下げて慎重に動作する状態です。設定と診断画面から復旧手順を確認できます。',
    ),
  },
  {
    test: /古いデータ|stale\s*data|古い株価/,
    intent: 'app_help',
    texts: {
      advanced:
        '古いデータ（stale data）は、最終取得から時間が経過した株価のことです。判断前に価格更新を行い、銘柄ごとの quote age を確認してください。',
      general:
        '古いデータ（stale data）は、最終取得から時間が経過した株価のことです。判断前に価格更新を行い、銘柄ごとの経過時間を確認してください。',
      high_school:
        '古いデータとは、株価の情報がしばらく更新されていない状態のことです。古いまま判断するとズレるので、先に価格を更新してから見てください。',
    },
  },
  {
    test: /読み取り専用/,
    intent: 'app_help',
    texts: faqText(
      '読み取り専用モードは、売買記録やインポートを一時停止する安全機能です。個人運用の設定画面から解除できます。',
    ),
  },
  {
    test: /ニュースが反映されない|ニュースAPI/,
    intent: 'system_status',
    texts: faqText(
      'ニュースAPIが未設定または接続未確認の可能性があります。設定 → API接続診断 からキーを登録し、接続テストを実行してください。',
    ),
  },
  {
    test: /AI APIはつながってる|OpenAI.*接続|AI.*接続状態/,
    intent: 'system_status',
    texts: faqText(
      'OpenAI APIはキー保存済みでも、実API接続テストが成功していないとチャットはモック応答になります。AI設定画面の「AI API接続テスト」で確認してください。',
    ),
  },
  {
    test: /なぜ買い推奨|買い推奨の理由|買い推奨？/,
    intent: 'investment_analysis',
    texts: faqText(
      '買い推奨は、テクニカル・レジーム・配分を踏まえた分析ラベルです。注文指示ではなく、信頼度とデータ鮮度を併せて解釈してください。',
    ),
    structured: {
      reason: '支持帯・トレンド・配分余地などの複合スコア（分析モデル依存）。',
      risk: '推奨＝必ず利益ではない。小口・損切り前提。',
      market: 'レジームとマクロで推奨の意味が変わる。',
      urgency: '中',
      confidence: '銘柄・システム信頼度を参照',
      dataFreshness: '価格の更新時刻を確認してください。',
    },
  },
  {
    test: /保有バランス|今のポートフォリオ/,
    intent: 'portfolio_review',
    texts: faqText(
      '保有バランスは、銘柄・セクター・市場ごとの偏りと、古い株価データの有無を確認して判断します。',
    ),
    structured: {
      reason: '集中保有・セクター偏りは下落時の影響が大きくなりやすい。',
      risk: '偏りが大きい場合は新規買いより整理・分散を検討。',
      market: 'レジーム変化でセクター強弱が入れ替わる可能性。',
      urgency: '中',
      confidence: 'システム信頼度・鮮度に依存',
      dataFreshness: '価格の更新時刻を確認してください。',
    },
  },
];

/** Fixed FAQ answers for concierge — no API call required. */
export function getConciergeInstantAnswer(
  userText: string,
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
): AiChatMessage | null {
  const raw = userText.trim();
  if (!raw) return null;

  const datetimeAnswer = createDatetimeInstantMessage(raw);
  if (datetimeAnswer) return datetimeAnswer;

  const entry = FAQ_ENTRIES.find((f) => f.test.test(raw));
  if (!entry) return null;

  const intent = entry.intent;
  const level = normalizeAiExplanationLevel(explanationLevel);
  const body = resolveFaqText(entry.texts, level);
  const conversationMode = resolveConciergeConversationMode({
    intent,
    userMessage: raw,
  });
  const structured =
    entry.structured && shouldShowStructuredForMode(conversationMode)
      ? entry.structured
      : undefined;

  const base: AiChatMessage = {
    id: `a-instant-${Date.now()}`,
    role: 'assistant',
    text: body,
    structured,
    responseIntent: intent,
    conversationMode,
    createdAt: new Date().toISOString(),
  };

  if (wantsDetailedConciergeAnalysis(raw) && entry.structured) {
    return {
      ...base,
      conversationMode: 'analysis',
      structured: entry.structured,
    };
  }

  return enrichConciergeChatMessage(base, raw);
}

export function shouldAcceptChatSend(text: string, isSending: boolean): boolean {
  return text.trim().length > 0 && !isSending;
}
