/**
 * 確信度%の算出根拠（ルールベース actionGuide と同式）
 */
import { CONFIDENCE_GATE_MIN_PCT } from '../constants/aiRiskControl';
import { EVIDENCE_SCORE_LABELS_JA } from '../constants/aiActionGuide';
import type { ConciergeSymbolActionGuide } from '../types/conciergeActionGuide';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { EvidenceScoreKey } from '../types/conciergeActionGuide';

const SCORE_KEYS: EvidenceScoreKey[] = [
  'priceAction',
  'volume',
  'news',
  'xSentiment',
  'volatility',
];

function scoreAvailable(sym: ConciergeSymbolEvidence, key: EvidenceScoreKey): boolean {
  switch (key) {
    case 'priceAction':
    case 'volatility':
      return sym.intradayChangePct != null;
    case 'volume':
      return sym.volumeSurgeRatio != null;
    case 'news':
      return sym.latestFinancialNews.length > 0;
    case 'xSentiment':
      return Boolean(sym.xSentiment?.postCount);
    default:
      return false;
  }
}

export function buildConfidenceBasisJa(
  sym: ConciergeSymbolEvidence,
  guide: ConciergeSymbolActionGuide,
): string {
  const parts: string[] = [];
  parts.push(`確信度 ${guide.confidencePct}%（ゲート閾値 ${CONFIDENCE_GATE_MIN_PCT}%）`);

  if (guide.insufficientData) {
    parts.push('判断材料不足 — スコア上限35%');
  }

  const activeScores: string[] = [];
  for (const key of SCORE_KEYS) {
    if (scoreAvailable(sym, key)) {
      activeScores.push(`${EVIDENCE_SCORE_LABELS_JA[key]}=${guide.evidenceScores[key]}`);
    }
  }
  if (activeScores.length > 0) {
    parts.push(`有効根拠の平均: (${activeScores.join(' + ')}) / ${activeScores.length}`);
  } else {
    parts.push('有効根拠スコアなし');
  }

  if (sym.dataGapsJa.length > 0) {
    parts.push(`データ不足 ${sym.dataGapsJa.length}件 → -${sym.dataGapsJa.length * 8}pt`);
  }
  if (sym.quoteIsStale) {
    parts.push('株価ステール → -12pt');
  }

  const signalCount = [
    sym.intradayChangePct != null,
    sym.latestFinancialNews.length > 0,
    Boolean(sym.xSentiment?.postCount),
  ].filter(Boolean).length;
  parts.push(`独立シグナル ${signalCount}/3（2未満は判断材料不足）`);

  if (!guide.insufficientData && guide.confidencePct < CONFIDENCE_GATE_MIN_PCT) {
    parts.push(`→ ${CONFIDENCE_GATE_MIN_PCT}%未満のため「分析不能」`);
  }

  return parts.join(' · ');
}

export function buildOverallConfidenceBasisJa(
  symbols: ConciergeSymbolEvidence[],
  guides: ConciergeSymbolActionGuide[],
  overallPct: number,
): string {
  if (guides.length === 0) return `確信度 ${overallPct}% — 銘柄なし`;
  if (guides.length === 1) {
    return buildConfidenceBasisJa(symbols[0], guides[0]);
  }
  const perSymbol = guides.map((g) => `${g.symbol}:${g.confidencePct}%`).join(', ');
  return `銘柄平均 ${overallPct}%（${perSymbol}）· 閾値 ${CONFIDENCE_GATE_MIN_PCT}%`;
}
