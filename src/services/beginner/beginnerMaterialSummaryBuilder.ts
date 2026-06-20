import {
  parseMaterialQualityStarCount,
  resolveAiTrustLevelJa,
  resolveAiTrustPct,
} from '../../constants/beginnerAiTrustLevelJa';
import type { MaterialStockRow } from '../bursa/bursaMaterialAnalysisService';
import type { AiSecondEvaluatorAction } from '../../types/aiSecondEvaluator';
import {
  BEGINNER_JUDGMENT_LABEL_JA,
  mapToBeginnerAiJudgment,
  type BeginnerAiJudgment,
} from './beginnerAiJudgmentJa';
import {
  fillBeginnerReasons,
  fillBeginnerWatchpoints,
  sanitizeBeginnerPlainJa,
} from './sanitizeBeginnerPlainJa';

export type BeginnerStockSummary = {
  symbol: string;
  nameJa: string;
  judgment: BeginnerAiJudgment;
  judgmentLabelJa: string;
  trustLabelJa: string;
  trustExplainJa: string;
  trustBarFillRatio: number;
  trustLevel: 'high' | 'medium' | 'low';
  reasonsJa: [string, string, string];
  watchpointsJa: string[];
  nextActionJa: string;
};

const POSITIVE_EVAL_PATTERNS: Array<{ test: RegExp; template: string }> = [
  { test: /配当|利回り|還元/, template: '会社からのお金の還元は安定しています' },
  { test: /アナリスト|コンセンサス|評価/, template: '外の評価に大きな悪い点はありません' },
  { test: /マクロ|景気|セクター/, template: '国の景気は横ばいで急な変化は少ないです' },
  { test: /ニュース|記事/, template: 'ニュースに大きな悪い話は少ないです' },
  { test: /インサイダー|機関/, template: '大きな投資家の動きに大きな悪い点はありません' },
  { test: /バリュエーション|適正|割安/, template: '今の値段は割高すぎません' },
  { test: /positive|好材料|プラス|↑/, template: '公開情報にプラスの材料があります' },
];

const NEGATIVE_EVAL_PATTERNS: Array<{ test: RegExp; template: string }> = [
  { test: /決算|業績|earnings|revision|下方/, template: '会社の成績発表の内容に注意してください' },
  { test: /金利|利上げ|macro|マクロ/, template: '借りるお金のコストのニュースに注意してください' },
  { test: /悪化|下方|downgrade|bearish|リスク/, template: '儲けが大きく減るニュースがないか確認してください' },
  { test: /negative|悪材料|警告|warning/, template: '値段が大きく下がるニュースに注意してください' },
];

function evalTexts(row: MaterialStockRow): string[] {
  return [
    row.dividendIntelligenceEvaluationJa,
    row.analystConsensusEvaluationJa,
    row.macroIntelligenceEvaluationJa,
    row.newsIntelligenceEvaluationJa,
    row.valuationIntelligenceEvaluationJa,
    row.earningsCallEvaluationJa,
    row.insiderTradingEvaluationJa,
    row.institutionalOwnershipEvaluationJa,
    row.earningsRevisionIntelligenceEvaluationJa,
    row.convictionIntelligenceEvaluationJa,
    ...row.positive.map((m) => m.title),
    ...row.negative.map((m) => m.title),
    ...row.summaryLines,
    ...(row.convictionIntelligenceDisplayJa
      ? [
          row.convictionIntelligenceDisplayJa.reasonLine1,
          row.convictionIntelligenceDisplayJa.reasonLine2,
          row.convictionIntelligenceDisplayJa.reasonLine3,
        ]
      : []),
    ...row.buyReasons,
    ...row.sellReasons,
  ].filter(Boolean);
}

function extractReasonCandidates(row: MaterialStockRow): string[] {
  const candidates: string[] = [];

  for (const text of evalTexts(row)) {
    for (const { test, template } of POSITIVE_EVAL_PATTERNS) {
      if (test.test(text)) {
        candidates.push(template);
      }
    }
  }

  for (const m of row.positive) {
    candidates.push(m.title);
  }

  for (const line of row.summaryLines) {
    if (line.trim()) candidates.push(line);
  }

  if (row.convictionIntelligenceDisplayJa) {
    candidates.push(row.convictionIntelligenceDisplayJa.reasonLine1);
    candidates.push(row.convictionIntelligenceDisplayJa.reasonLine2);
    candidates.push(row.convictionIntelligenceDisplayJa.reasonLine3);
  }

  return candidates;
}

function extractWatchpointCandidates(row: MaterialStockRow): string[] {
  const candidates: string[] = [];

  for (const text of evalTexts(row)) {
    for (const { test, template } of NEGATIVE_EVAL_PATTERNS) {
      if (test.test(text)) {
        candidates.push(template);
      }
    }
  }

  for (const m of row.negative) {
    candidates.push(m.title);
  }

  for (const r of row.sellReasons) {
    candidates.push(r);
  }

  return candidates;
}

function resolveNextActionJa(judgment: BeginnerAiJudgment, isHeld: boolean): string {
  switch (judgment) {
    case 'hold':
      return isHeld
        ? 'このまま保有し、大きな変化がないか様子を見てください'
        : '今は購入せず、様子を見てください';
    case 'monitor':
      return 'ニュースと値段の変化をこまめに確認してください';
    case 'buy_candidate':
      return '購入する前に、もう少し情報を集めてください';
    case 'pass':
      return isHeld
        ? '売却のタイミングを検討してもよいかもしれません'
        : '今は購入を見送ってください';
    default:
      return '急いで売買する必要はありません';
  }
}

export function buildBeginnerStockSummary(input: {
  materialRow: MaterialStockRow;
  isHeld: boolean;
  fusedAction?: AiSecondEvaluatorAction;
  finalScore?: number;
  confidencePct?: number;
}): BeginnerStockSummary {
  const { materialRow, isHeld } = input;
  const fusedAction = input.fusedAction ?? 'hold';
  const finalScore =
    input.finalScore ??
    (materialRow.scoreSign === 'positive' ? 62 : materialRow.scoreSign === 'negative' ? 38 : 50);

  const dataQualityStars = parseMaterialQualityStarCount(materialRow.dataQuality?.stars);
  const trustPct = resolveAiTrustPct({
    hybridConfidence: input.confidencePct,
    finalScore,
    dataQualityStars,
  });
  const trust = resolveAiTrustLevelJa({
    pct: trustPct.pct,
    isEstimated: trustPct.isEstimated,
    dataQualityStars,
  });

  const judgment = mapToBeginnerAiJudgment({
    isHeld,
    fusedAction,
    finalScore,
  });

  const reasonsJa = fillBeginnerReasons(extractReasonCandidates(materialRow));
  const watchpointsJa = fillBeginnerWatchpoints(extractWatchpointCandidates(materialRow));
  const nextActionJa = sanitizeBeginnerPlainJa(
    resolveNextActionJa(judgment, isHeld),
  );

  return {
    symbol: materialRow.stockCode,
    nameJa: materialRow.companyNameJa,
    judgment,
    judgmentLabelJa: BEGINNER_JUDGMENT_LABEL_JA[judgment],
    trustLabelJa: trust.labelJa,
    trustExplainJa: trust.explainJa,
    trustBarFillRatio: trust.barFillRatio,
    trustLevel: trust.level,
    reasonsJa,
    watchpointsJa,
    nextActionJa: nextActionJa || '急いで売買する必要はありません。',
  };
}

/** UX1.1 §4.2 Step3 — オンボーディング用プレビュー */
export function buildBeginnerOnboardingAdvicePreview(): {
  lines: Array<{ bullet: 'filled' | 'open' | 'dash'; text: string }>;
  newPurchaseSummaryJa: string;
  footerJa: string;
} {
  return {
    lines: [
      { bullet: 'filled', text: 'Maybank  保有継続' },
      { bullet: 'open', text: 'CIMB  監視' },
    ],
    newPurchaseSummaryJa: '新規購入  なし',
    footerJa: '急いで売買する必要はありません',
  };
}
