import type { MarketRegimeResult } from '../types/marketRegime';
import type { AiStrategyBriefing, AiTradeQueueItem } from '../types/aiStrategyBriefing';
import { AI_SAFE_ACTION_LABEL } from '../constants/aiStrategyBriefing';

export function buildMockAiStrategyBriefing(regime?: MarketRegimeResult): AiStrategyBriefing {
  return {
    marketRegimeLabel: regime?.labelJa ?? 'レンジ相場（モック）',
    topSuggestions: [
      `保有推奨 — 大型銀行株`,
      `要注視 — 輸出関連の抵抗帯付近`,
      `売却検討 — 守り株の過剰保有時`,
      `買い推奨 — 流動性が合う場合のみ小口`,
    ],
    riskMode: regime && regime.riskScore >= 60 ? '守り' : 'バランス',
    nextMacroEvent: 'マレーシア CPI 発表 · 金曜 09:00（モック）',
  };
}

function mockSignalTimes(occurredMinutesAgo: number, deadlineMinutesFromNow?: number) {
  const now = Date.now();
  return {
    occurredAt: new Date(now - occurredMinutesAgo * 60_000).toISOString(),
    responseDeadlineAt:
      deadlineMinutesFromNow !== undefined
        ? new Date(now + deadlineMinutesFromNow * 60_000).toISOString()
        : undefined,
  };
}

export function getMockAiTradeQueue(): AiTradeQueueItem[] {
  return [
    {
      id: 'ai-q-nvda',
      ticker: 'NVDA',
      name: 'NVIDIA',
      market: 'us',
      suggestedAction: 'suggested_buy',
      urgency: 'critical',
      confidence: 67,
      rationaleSummary: '決算直後の高出来高 — モックで緊急監視。小口のみ検討。',
      ...mockSignalTimes(8, 10),
      explanation: {
        technicalReasons: ['出来高が20日平均の2倍以上（モック）。', 'ギャップアップ後の押し目形成を監視。'],
        macroReasons: ['AIデータセンター投資テーマ継続（モック）。'],
        riskReasons: ['緊急ラベルは注文指示ではありません。', 'ボラティリティ拡大に注意。'],
        dataFreshnessNote: '米国株モック — 実行前に最新株価を確認してください。',
      },
    },
    {
      id: 'ai-q-1155',
      ticker: '1155',
      name: 'Malayan Banking',
      market: 'bursa',
      suggestedAction: 'suggested_hold',
      urgency: 'low',
      confidence: 72,
      rationaleSummary:
        '20日移動平均線上で推移。ブレイクアウトが明確になるまで様子見。個人分析用モックです。',
      ...mockSignalTimes(42),
      explanation: {
        technicalReasons: [
          '日足で20日移動平均線を下回っていない。',
          'RSIは中立圏 — 買われすぎではない。',
        ],
        macroReasons: [
          '国内金利は安定寄り（モックシナリオ）。',
          '国内寄りの収益構造で為替影響は限定的。',
        ],
        riskReasons: [
          '想定内のポジションサイズを守ること。',
          '売買指示ではありません — 証券画面でご確認ください。',
        ],
        dataFreshnessNote:
          'モックデータ。実行前にポートフォリオの株価更新時刻を確認。API更新停止時は古いデータの可能性あり。',
      },
    },
    {
      id: 'ai-q-5347',
      ticker: '5347',
      name: 'Tenaga Nasional',
      market: 'bursa',
      suggestedAction: 'suggested_reduce',
      urgency: 'medium',
      confidence: 64,
      rationaleSummary:
        'モック公平価値帯より高め。過剰保有なら売却検討 — ご自身で確認のうえ判断してください。',
      ...mockSignalTimes(15, 30),
      explanation: {
        technicalReasons: [
          '週足でボリンジャーバンド上限付近（モック）。',
          '直近の上昇日は出来高が減少傾向。',
        ],
        macroReasons: [
          '燃料費転嫁の不確実性（モックカレンダー）。',
          '配当利回りは魅力的だがモック中央値より割高感。',
        ],
        riskReasons: [
          `${AI_SAFE_ACTION_LABEL.suggested_reduce}は注文ではありません。`,
          '手動編集後は執行照合で不一致が出る場合があります。',
        ],
        dataFreshnessNote: 'モックのため株価経過不明 — 練習売却記録前に保有画面で更新してください。',
      },
    },
    {
      id: 'ai-q-5183',
      ticker: '5183',
      name: 'Petronas Chemicals',
      market: 'bursa',
      suggestedAction: 'watch_closely',
      urgency: 'high',
      confidence: 61,
      rationaleSummary:
        'モックでボラティリティ急増。価格とニュースを確認するまで様子見。',
      ...mockSignalTimes(22, -12),
      explanation: {
        technicalReasons: [
          'ATRが20日平均より拡大（モック）。',
          '前高値でのブレイク失敗 — フォロー要監視。',
        ],
        macroReasons: [
          '原油連動ベータがモック因子で上昇。',
          '地域の化学マージン見通しは材料混在。',
        ],
        riskReasons: [
          '緊急性「高」は監視を促すもので、売買を促すものではありません。',
          '夜間ニュースでギャップリスクあり。',
        ],
        dataFreshnessNote:
          '時間外は古いデータ（STALE）になりやすい — 古い株価での練習記録は避け、更新または手動価格を使用。',
      },
    },
    {
      id: 'ai-q-1295',
      ticker: '1295',
      name: 'Public Bank',
      market: 'bursa',
      suggestedAction: 'suggested_buy',
      urgency: 'medium',
      confidence: 58,
      rationaleSummary:
        'モック支持帯への押し目。流動性ルールに合う場合のみ小口検討。',
      ...mockSignalTimes(5, 20),
      explanation: {
        technicalReasons: [
          '直近安値の再テストで売り出来高減少（モック）。',
          'MACDヒストグラムがマイナス圏から改善傾向。',
        ],
        macroReasons: [
          'モックレジームで質の高い銀行因子が優先。',
          '金利パスは現状モックで安定想定。',
        ],
        riskReasons: [
          '信頼度58% — 弱いシグナルとして小口のみ。',
          'ワークフロー確認は練習モードで — 自動執行なし。',
        ],
        dataFreshnessNote: '信頼度58% — 端末で最新株価を確認するまで弱いシグナルとして扱う。',
      },
    },
  ];
}
