/**
 * 投資行動支援 — 実データ根拠からルールベースで行動案を生成（AI推測なし）
 */
import {
  ACTION_INSUFFICIENT_DATA_LABEL_JA,
  ACTION_NEGATIVE_BEARISH_PCT,
  ACTION_VOLUME_SURGE_RATIO,
  MARKET_STANCE_LABELS_JA,
} from '../constants/aiActionGuide';
import { CONCIERGE_SHARP_DROP_PCT } from '../constants/aiDataDriven';
import type {
  AiActionCategory,
  ConciergeActionGuideBundle,
  ConciergeSymbolActionGuide,
  EvidenceScoreKey,
  MarketStance,
  NotificationPriorityTier,
} from '../types/conciergeActionGuide';
import type { ConciergeEvidenceCore, ConciergeSymbolEvidence } from '../types/conciergeEvidence';

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scorePriceAction(sym: ConciergeSymbolEvidence): number | null {
  if (sym.intradayChangePct == null) return null;
  return clampScore(Math.min(100, Math.abs(sym.intradayChangePct) * 12));
}

function scoreVolume(sym: ConciergeSymbolEvidence): number | null {
  if (sym.volumeSurgeRatio == null) return null;
  return clampScore(Math.min(100, (sym.volumeSurgeRatio / ACTION_VOLUME_SURGE_RATIO) * 100));
}

function scoreNews(sym: ConciergeSymbolEvidence): number | null {
  if (sym.latestFinancialNews.length === 0) return null;
  const neg = sym.latestFinancialNews.filter((h) => h.sentiment === 'ネガティブ').length;
  const pos = sym.latestFinancialNews.filter((h) => h.sentiment === 'ポジティブ').length;
  const total = sym.latestFinancialNews.length;
  const intensity = Math.max(neg, pos) / total;
  const bias = neg > pos ? 70 : pos > neg ? 30 : 50;
  return clampScore(bias + intensity * 30);
}

function scoreXSentiment(sym: ConciergeSymbolEvidence): number | null {
  const xs = sym.xSentiment;
  if (!xs || xs.postCount === 0) return null;
  const stress = xs.bearishPct * 0.5 + xs.panicPct * 0.35 + xs.hypePct * 0.15;
  return clampScore(stress);
}

function scoreVolatility(sym: ConciergeSymbolEvidence): number | null {
  if (sym.intradayChangePct == null) return null;
  const xs = sym.xSentiment;
  const panicBoost = xs ? xs.panicPct * 0.4 : 0;
  return clampScore(Math.min(100, Math.abs(sym.intradayChangePct) * 10 + panicBoost));
}

function computeEvidenceScores(sym: ConciergeSymbolEvidence): Record<EvidenceScoreKey, number> {
  return {
    priceAction: scorePriceAction(sym) ?? 0,
    volume: scoreVolume(sym) ?? 0,
    news: scoreNews(sym) ?? 0,
    xSentiment: scoreXSentiment(sym) ?? 0,
    volatility: scoreVolatility(sym) ?? 0,
  };
}

function countAvailableScores(scores: Record<EvidenceScoreKey, number>, sym: ConciergeSymbolEvidence): number {
  let n = 0;
  if (sym.intradayChangePct != null) n++;
  if (sym.volumeSurgeRatio != null) n++;
  if (sym.latestFinancialNews.length > 0) n++;
  if (sym.xSentiment && sym.xSentiment.postCount > 0) n++;
  return n;
}

function resolveMarketStance(sym: ConciergeSymbolEvidence): MarketStance {
  const ch = sym.intradayChangePct;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const bull = sym.xSentiment?.bullishPct ?? 0;
  if (ch != null && ch >= 2 && bear < 45) return 'bullish';
  if (ch != null && ch <= -2) return 'bearish';
  if (bear >= ACTION_NEGATIVE_BEARISH_PCT) return 'bearish';
  if (bull >= 55 && (ch == null || ch >= 0)) return 'bullish';
  return 'neutral';
}

function classifyCategories(sym: ConciergeSymbolEvidence): AiActionCategory[] {
  const cats = new Set<AiActionCategory>();
  const ch = sym.intradayChangePct;
  const vol = sym.volumeSurgeRatio;
  const xs = sym.xSentiment;
  const holding = sym.portfolioHolding;

  if (ch != null && ch <= CONCIERGE_SHARP_DROP_PCT) {
    cats.add('panic');
    cats.add('high-risk');
  }
  if (vol != null && vol >= ACTION_VOLUME_SURGE_RATIO) {
    cats.add('unusual-volume');
  }
  if (xs) {
    if (xs.bearishPct >= ACTION_NEGATIVE_BEARISH_PCT) {
      cats.add('rumor-alert');
      cats.add('caution');
    }
    if (xs.postSurgeRatePct != null && xs.postSurgeRatePct >= 40) {
      cats.add('rumor-alert');
    }
    const priceStress = ch != null && ch <= CONCIERGE_SHARP_DROP_PCT;
    const volStress = vol != null && vol >= ACTION_VOLUME_SURGE_RATIO;
    if (xs.panicPct >= 25 && (priceStress || volStress)) {
      cats.add('panic');
    }
  }
  if (ch != null && ch >= 4 && (vol == null || vol < ACTION_VOLUME_SURGE_RATIO)) {
    cats.add('opportunity');
  }
  if (holding?.unrealizedPnlPct != null && holding.unrealizedPnlPct >= 15) {
    cats.add('profit-taking');
  }
  if (sym.unusualActivityFlags.length >= 2) {
    cats.add('caution');
    cats.add('high-risk');
  }
  if (cats.size === 0) cats.add('watch');
  return [...cats];
}

function primaryCategory(categories: AiActionCategory[]): AiActionCategory {
  const order: AiActionCategory[] = [
    'panic',
    'high-risk',
    'rumor-alert',
    'unusual-volume',
    'caution',
    'profit-taking',
    'opportunity',
    'watch',
  ];
  for (const c of order) {
    if (categories.includes(c)) return c;
  }
  return 'watch';
}

function buildReasonBullets(sym: ConciergeSymbolEvidence): string[] {
  const bullets: string[] = [];
  if (sym.intradayChangePct != null) {
    bullets.push(`日中変化 ${sym.intradayChangePct >= 0 ? '+' : ''}${sym.intradayChangePct.toFixed(1)}%`);
  }
  if (sym.volumeSurgeRatio != null && sym.volumeSurgeRatio >= 1.5) {
    const pct = Math.round((sym.volumeSurgeRatio - 1) * 100);
    bullets.push(`出来高 約${sym.volumeSurgeRatio.toFixed(1)}倍（+${pct}%相当）`);
  }
  if (sym.xSentiment) {
    if (sym.xSentiment.bearishPct >= ACTION_NEGATIVE_BEARISH_PCT) {
      bullets.push(`Xネガティブ比率 ${sym.xSentiment.bearishPct}%`);
    }
    if (sym.xSentiment.postSurgeRatePct != null && sym.xSentiment.postSurgeRatePct >= 30) {
      bullets.push(`X投稿急増 +${sym.xSentiment.postSurgeRatePct.toFixed(0)}%`);
    }
  }
  const negNews = sym.latestFinancialNews.filter((h) => h.sentiment === 'ネガティブ');
  if (negNews.length > 0) {
    bullets.push(`ネガニュース: ${negNews[0].title.slice(0, 48)}`);
  }
  for (const f of sym.unusualActivityFlags) {
    if (!bullets.some((b) => b.includes(f.labelJa.slice(0, 12)))) {
      bullets.push(f.labelJa);
    }
  }
  return bullets.slice(0, 6);
}

function buildRecommendations(
  categories: AiActionCategory[],
  sym: ConciergeSymbolEvidence,
  insufficient: boolean,
): string[] {
  if (insufficient) {
    return ['判断材料が足りないため様子見', '追加ニュース・株価更新を確認', '新規買い・増し玉は控えめに'];
  }
  const rec: string[] = [];
  if (categories.includes('panic') || categories.includes('high-risk')) {
    rec.push('新規買いは慎重');
    rec.push('ナンピンは段階的・小ロット');
    rec.push('損切り水準の再確認');
  }
  if (categories.includes('rumor-alert') || categories.includes('caution')) {
    rec.push('追加ニュース・公式発表を監視');
    rec.push('X/SNSは一次情報で裏取り');
  }
  if (categories.includes('unusual-volume')) {
    rec.push('出来高の背景（需給・イベント）を確認');
  }
  if (categories.includes('profit-taking')) {
    rec.push('利確・部分売却を検討');
  }
  if (categories.includes('opportunity')) {
    rec.push('押し目買いはリスク許容度内で');
    rec.push('ポジションサイズを抑える');
  }
  if (categories.includes('watch')) {
    rec.push('急いで動かず様子見');
    rec.push('次の値動きと出来高を確認');
  }
  return [...new Set(rec)].slice(0, 5);
}

function buildAttentionPoints(sym: ConciergeSymbolEvidence, categories: AiActionCategory[]): string[] {
  const pts: string[] = [];
  if (sym.quoteIsStale) pts.push('株価データが古い可能性');
  if (sym.dataGapsJa.length > 0) pts.push(`データ不足: ${sym.dataGapsJa.join(' · ')}`);
  if (categories.includes('rumor-alert')) pts.push('噂・投稿と事実の切り分け');
  if (sym.volumeSurgeRatio != null && sym.volumeSurgeRatio >= ACTION_VOLUME_SURGE_RATIO) {
    pts.push('出来高急増は需給ショックのサインになり得る');
  }
  if (sym.portfolioHolding) {
    pts.push(`保有 ${sym.portfolioHolding.shares}株 · 含み${sym.portfolioHolding.unrealizedPnlPct?.toFixed(1) ?? '—'}%`);
  }
  return pts.slice(0, 4);
}

function buildRiskSummary(categories: AiActionCategory[], stance: MarketStance): string {
  if (categories.includes('panic')) return '急落・ネガ材料が重なり下振れリスクが高い局面です（参考）';
  if (categories.includes('high-risk')) return '複数の異常シグナルが重なっており、ボラティリティ拡大に注意（参考）';
  if (categories.includes('rumor-alert')) return '投稿・噂先行で株価が過剰反応している可能性（参考）';
  if (stance === 'bearish') return '弱気材料が優勢 — 防御的な姿勢を検討（参考）';
  if (stance === 'bullish') return '強気だが過熱・利確圧力に注意（参考）';
  return '大きな異常は限定的 — 通常のリスク管理を継続（参考）';
}

function resolveNotificationPriority(
  sym: ConciergeSymbolEvidence,
  categories: AiActionCategory[],
): NotificationPriorityTier {
  const ch = sym.intradayChangePct;
  const vol = sym.volumeSurgeRatio;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const postSurge = sym.xSentiment?.postSurgeRatePct ?? 0;

  const priceStress = ch != null && ch <= CONCIERGE_SHARP_DROP_PCT;
  const volStress = vol != null && vol >= ACTION_VOLUME_SURGE_RATIO;
  const xOnlySurge = bear >= ACTION_NEGATIVE_BEARISH_PCT && postSurge >= 40 && !priceStress && !volStress;

  if (priceStress && volStress) {
    return 'critical';
  }
  if (xOnlySurge) {
    return 'medium';
  }
  if (bear >= ACTION_NEGATIVE_BEARISH_PCT && postSurge >= 40 && (priceStress || volStress)) {
    return 'critical';
  }
  if (
    ch != null && ch <= CONCIERGE_SHARP_DROP_PCT ||
    (vol != null && vol >= ACTION_VOLUME_SURGE_RATIO) ||
    bear >= ACTION_NEGATIVE_BEARISH_PCT ||
    categories.includes('panic')
  ) {
    return 'high';
  }
  if (categories.includes('rumor-alert') || categories.includes('unusual-volume')) {
    return 'medium';
  }
  return 'low';
}

function buildNotificationWhy(
  sym: ConciergeSymbolEvidence,
  priority: NotificationPriorityTier,
  reasons: string[],
): string {
  const parts = reasons.length > 0 ? reasons.slice(0, 3).join(' · ') : sym.displayLabelJa;
  return `【なぜ通知したか】${sym.displayLabelJa} — ${parts}（優先度: ${priority}）`;
}

function computeConfidence(sym: ConciergeSymbolEvidence, scores: Record<EvidenceScoreKey, number>): number {
  const available = countAvailableScores(scores, sym);
  if (available === 0) return 0;
  const keys: EvidenceScoreKey[] = ['priceAction', 'volume', 'news', 'xSentiment', 'volatility'];
  let sum = 0;
  let weight = 0;
  for (const k of keys) {
    const raw =
      k === 'priceAction'
        ? sym.intradayChangePct != null
        : k === 'volume'
          ? sym.volumeSurgeRatio != null
          : k === 'news'
            ? sym.latestFinancialNews.length > 0
            : k === 'xSentiment'
              ? Boolean(sym.xSentiment?.postCount)
              : sym.intradayChangePct != null;
    if (raw) {
      sum += scores[k];
      weight += 1;
    }
  }
  let base = weight > 0 ? sum / weight : 0;
  base -= sym.dataGapsJa.length * 8;
  if (sym.quoteIsStale) base -= 12;
  return clampScore(base);
}

function isInsufficientData(sym: ConciergeSymbolEvidence): boolean {
  if (sym.currentPrice == null && sym.intradayChangePct == null) return true;
  if (sym.dataGapsJa.length >= 3) return true;
  const hasNews = sym.latestFinancialNews.length > 0;
  const hasX = Boolean(sym.xSentiment?.postCount);
  const hasPrice = sym.intradayChangePct != null;
  const signals = [hasNews, hasX, hasPrice].filter(Boolean).length;
  return signals < 2;
}

export function buildSymbolActionGuide(sym: ConciergeSymbolEvidence): ConciergeSymbolActionGuide {
  const scores = computeEvidenceScores(sym);
  const insufficient = isInsufficientData(sym);
  const categories = classifyCategories(sym);
  const primary = primaryCategory(categories);
  const stance = resolveMarketStance(sym);
  const reasons = buildReasonBullets(sym);
  const priority = resolveNotificationPriority(sym, categories);

  return {
    symbol: sym.symbol,
    market: sym.market,
    displayLabelJa: sym.displayLabelJa,
    primaryCategory: primary,
    categories,
    marketStance: stance,
    marketStanceLabelJa: MARKET_STANCE_LABELS_JA[stance],
    reasonBulletsJa: insufficient ? ['判断材料不足 — 推測は行いません'] : reasons,
    recommendedActionsJa: buildRecommendations(categories, sym, insufficient),
    attentionPointsJa: buildAttentionPoints(sym, categories),
    riskSummaryJa: insufficient
      ? `${ACTION_INSUFFICIENT_DATA_LABEL_JA} — ${sym.dataGapsJa.join(' · ') || '主要指標未取得'}`
      : buildRiskSummary(categories, stance),
    confidencePct: insufficient ? Math.min(35, computeConfidence(sym, scores)) : computeConfidence(sym, scores),
    insufficientData: insufficient,
    insufficientDataLabelJa: insufficient ? ACTION_INSUFFICIENT_DATA_LABEL_JA : null,
    evidenceScores: scores,
    notificationPriority: priority,
    notificationWhyJa: buildNotificationWhy(sym, priority, reasons),
  };
}

export function buildConciergeActionGuide(
  evidence: ConciergeEvidenceCore,
): ConciergeActionGuideBundle {
  const symbols = evidence.symbols.map(buildSymbolActionGuide);
  const confidences = symbols.map((s) => s.confidencePct);
  const overallConfidencePct =
    confidences.length > 0
      ? clampScore(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

  const stanceVotes: Record<MarketStance, number> = { bullish: 0, neutral: 0, bearish: 0 };
  for (const s of symbols) stanceVotes[s.marketStance]++;
  const overallStance: MarketStance =
    stanceVotes.bearish >= stanceVotes.bullish && stanceVotes.bearish >= stanceVotes.neutral
      ? 'bearish'
      : stanceVotes.bullish > stanceVotes.neutral
        ? 'bullish'
        : 'neutral';

  const primaryCategory = symbols[0]?.primaryCategory ?? 'watch';

  const aggregatedRecommendationsJa = [
    ...new Set(symbols.flatMap((s) => s.recommendedActionsJa)),
  ].slice(0, 6);
  const aggregatedRisksJa = [...new Set(symbols.map((s) => s.riskSummaryJa))].slice(0, 3);
  const aggregatedAttentionJa = [...new Set(symbols.flatMap((s) => s.attentionPointsJa))].slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    symbols,
    overallConfidencePct,
    overallStance,
    overallStanceLabelJa: MARKET_STANCE_LABELS_JA[overallStance],
    primaryCategory,
    aggregatedRecommendationsJa,
    aggregatedRisksJa,
    aggregatedAttentionJa,
  };
}
