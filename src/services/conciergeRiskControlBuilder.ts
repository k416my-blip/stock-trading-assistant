/**
 * Risk Control & Anti-Hallucination — 実データから信頼層を構築
 */
import {
  CONFIDENCE_GATE_MIN_PCT,
  CROSS_VALIDATION_MIN_FAMILIES,
  NEWS_STALE_AGE_MS,
  QUOTE_STALE_AGE_MS,
  RUMOR_LABEL_PREFIX,
  SOURCE_RELIABILITY_META,
  X_STALE_AGE_MS,
  ANALYSIS_BLOCKED_LABEL_JA,
} from '../constants/aiRiskControl';
import type {
  ApiIsolationStatus,
  ConciergeRiskControlBundle,
  ConciergeSymbolRiskControl,
  CrossValidationResult,
  DataFreshnessMeta,
  EvidenceSourceFamily,
  SourceReliabilityEntry,
  SourceReliabilityTier,
} from '../types/conciergeRiskControl';
import type {
  ConciergeEvidenceBundle,
  ConciergeEvidenceCore,
  ConciergeSymbolEvidence,
} from '../types/conciergeEvidence';
import type {
  ConciergeActionGuideBundle,
  ConciergeSymbolActionGuide,
} from '../types/conciergeActionGuide';

export type EvidenceWithActionGuide = ConciergeEvidenceCore & {
  actionGuide: ConciergeActionGuideBundle;
};

export type BuildRiskControlInput = {
  evidence: EvidenceWithActionGuide;
  apiHealthDegraded?: boolean;
  newsApiDegraded?: boolean;
  quoteStaleCount?: number;
  recentNotificationCount?: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function freshnessMeta(
  timestampIso: string | undefined,
  staleMs: number,
  nowMs: number,
): DataFreshnessMeta | null {
  if (!timestampIso) return null;
  const ageSeconds = Math.max(0, Math.floor((nowMs - Date.parse(timestampIso)) / 1000));
  const stale = ageSeconds * 1000 > staleMs;
  return {
    timestampIso,
    ageSeconds,
    stale,
    staleWarningJa: stale ? '古いデータの可能性' : null,
  };
}

function inferNewsTier(source: string, title: string): SourceReliabilityTier {
  const s = `${source} ${title}`.toLowerCase();
  if (/sec\.gov|edgar|開示|決算短信|annual report/i.test(s)) return 'official_filing';
  if (/reuters|bloomberg|wsj|ft\.com|日経|nhk/i.test(s)) return 'major_news';
  if (/rss|yahoo|google news/i.test(s)) return 'major_news';
  if (/x\.com|twitter|sns|social/i.test(s)) return 'social_media';
  return 'anonymous_rumor';
}

export function enrichNewsSourceReliability(
  sym: ConciergeSymbolEvidence,
  bundleGeneratedAt: string,
): ConciergeSymbolEvidence {
  const nowMs = Date.parse(bundleGeneratedAt);
  const headlines = sym.latestFinancialNews.map((h) => {
    const tier = h.sourceTier ?? inferNewsTier(sym.newsSource, h.title);
    const fetchedAtIso = h.fetchedAtIso ?? bundleGeneratedAt;
    const ageSeconds = h.ageSeconds ?? Math.max(0, Math.floor((nowMs - Date.parse(fetchedAtIso)) / 1000));
    const rumor = tier === 'social_media' || tier === 'anonymous_rumor';
    return {
      ...h,
      sourceTier: tier,
      fetchedAtIso,
      ageSeconds,
      rumorLabel: rumor,
    };
  });
  return { ...sym, latestFinancialNews: headlines };
}

export function crossValidateSymbolEvidence(sym: ConciergeSymbolEvidence): CrossValidationResult {
  const families: EvidenceSourceFamily[] = [];
  const stressNotes: string[] = [];

  if (sym.intradayChangePct != null && sym.intradayChangePct <= -3) {
    families.push('price');
    stressNotes.push('価格下落');
  }
  if (sym.volumeSurgeRatio != null && sym.volumeSurgeRatio >= 2) {
    if (!families.includes('volume')) families.push('volume');
    stressNotes.push('出来高急増');
  }
  const negNews = sym.latestFinancialNews.filter((h) => h.sentiment === 'ネガティブ');
  if (negNews.length > 0 && negNews.some((h) => (h.sourceTier ?? 'major_news') !== 'anonymous_rumor')) {
    families.push('news');
    stressNotes.push('ネガニュース');
  }
  const xs = sym.xSentiment;
  if (xs && xs.bearishPct >= 50 && xs.postCount >= 3) {
    families.push('x');
    stressNotes.push('Xネガティブ');
  }

  const unique = [...new Set(families)];
  const strongWarningAllowed = unique.length >= CROSS_VALIDATION_MIN_FAMILIES;
  return {
    agreeingFamilies: unique,
    familyCount: unique.length,
    strongWarningAllowed,
    summaryJa: strongWarningAllowed
      ? `独立ソース${unique.length}種でストレス一致（${stressNotes.join(' · ')}）`
      : `独立ソース${unique.length}種のみ — 強い警告は抑制（${stressNotes.join(' · ') || '材料薄い'}）`,
  };
}

function computeDataQuality(sym: ConciergeSymbolEvidence, guide: ConciergeSymbolActionGuide): number {
  let score = guide.confidencePct;
  if (sym.quoteIsStale) score -= 15;
  score -= sym.dataGapsJa.length * 6;
  const staleNews = sym.latestFinancialNews.some(
    (h) => h.ageSeconds != null && h.ageSeconds * 1000 > NEWS_STALE_AGE_MS,
  );
  if (staleNews) score -= 10;
  if (sym.xSentiment?.fromCache && (sym.xSentiment.ageSeconds ?? 0) * 1000 > X_STALE_AGE_MS) {
    score -= 8;
  }
  const tiers = sym.latestFinancialNews.map((h) => h.sourceTier ?? 'major_news');
  if (tiers.every((t) => t === 'social_media' || t === 'anonymous_rumor') && tiers.length > 0) {
    score -= 12;
  }
  return clamp(score);
}

function buildSourceBreakdown(sym: ConciergeSymbolEvidence): SourceReliabilityEntry[] {
  const entries: SourceReliabilityEntry[] = [];
  const seenTiers = new Set<string>();
  if (sym.currentPrice != null || sym.intradayChangePct != null) {
    const m = SOURCE_RELIABILITY_META.exchange_data;
    entries.push({ tier: 'exchange_data', labelJa: m.labelJa, weight: m.weight });
    seenTiers.add('exchange_data');
  }
  for (const h of sym.latestFinancialNews.slice(0, 3)) {
    const tier = h.sourceTier ?? 'major_news';
    if (seenTiers.has(tier)) continue;
    seenTiers.add(tier);
    const m = SOURCE_RELIABILITY_META[tier];
    entries.push({ tier, labelJa: m.labelJa, weight: m.weight });
  }
  if (sym.xSentiment?.postCount) {
    const m = SOURCE_RELIABILITY_META.social_media;
    if (!seenTiers.has('social_media')) {
      entries.push({ tier: 'social_media', labelJa: m.labelJa, weight: m.weight });
    }
  }
  return entries;
}

function rumorLabels(sym: ConciergeSymbolEvidence): string[] {
  const labels: string[] = [];
  for (const h of sym.latestFinancialNews) {
    if (h.rumorLabel || h.sourceTier === 'anonymous_rumor' || h.sourceTier === 'social_media') {
      labels.push(`${RUMOR_LABEL_PREFIX} ${h.title.slice(0, 60)}`);
    }
  }
  if (sym.xSentiment && sym.xSentiment.analysisBasis !== 'fetched_posts') {
    labels.push(`${RUMOR_LABEL_PREFIX} Xセンチメント（投稿取得なし・推定）`);
  }
  return labels.slice(0, 5);
}

function buildApiIsolation(input: BuildRiskControlInput): ApiIsolationStatus {
  const gaps = input.evidence.symbols.flatMap((s) => s.dataGapsJa);
  const xDegraded = gaps.some((g) => /X|投稿|SNS/i.test(g)) || Boolean(input.apiHealthDegraded);
  const newsDegraded =
    gaps.some((g) => /ニュース|news/i.test(g)) || Boolean(input.newsApiDegraded);
  const quoteDegraded =
    (input.quoteStaleCount ?? 0) > 0 ||
    input.evidence.symbols.some((s) => s.quoteIsStale || s.currentPrice == null);

  const notes: string[] = [];
  if (xDegraded) notes.push('X API障害は他分析に影響させない');
  if (newsDegraded) notes.push('ニュース未取得は株価・出来高のみで判断');
  if (quoteDegraded) notes.push('株価鮮度に注意 — 他ソースは独立評価');

  return {
    xApiDegraded: xDegraded,
    newsApiDegraded: newsDegraded,
    quoteApiDegraded: quoteDegraded,
    isolationNoteJa: notes.length > 0 ? notes.join(' · ') : null,
  };
}

export function buildConciergeRiskControl(input: BuildRiskControlInput): ConciergeRiskControlBundle {
  const nowMs = Date.parse(input.evidence.generatedAt);
  const apiIsolation = buildApiIsolation(input);
  const guides = input.evidence.actionGuide.symbols;

  const symbols: ConciergeSymbolRiskControl[] = input.evidence.symbols.map((sym) => {
    const guide = guides.find((g) => g.symbol === sym.symbol) ?? guides[0];
    const crossValidation = crossValidateSymbolEvidence(sym);
    const dataQualityScore = guide ? computeDataQuality(sym, guide) : 0;
    const confidencePct = guide?.confidencePct ?? 0;
    const gateOpen = confidencePct >= CONFIDENCE_GATE_MIN_PCT && !guide?.insufficientData;
    const allowAction = gateOpen && crossValidation.strongWarningAllowed;
    const allowSpeculative = gateOpen && dataQualityScore >= CONFIDENCE_GATE_MIN_PCT;

    const quoteFresh = freshnessMeta(
      sym.quoteAgeSeconds != null
        ? new Date(nowMs - sym.quoteAgeSeconds * 1000).toISOString()
        : input.evidence.generatedAt,
      QUOTE_STALE_AGE_MS,
      nowMs,
    );
    const newsFresh = freshnessMeta(
      sym.latestFinancialNews[0]?.fetchedAtIso ?? input.evidence.generatedAt,
      NEWS_STALE_AGE_MS,
      nowMs,
    );
    const xFresh = sym.xSentiment
      ? freshnessMeta(
          sym.xSentiment.fetchedAtIso ?? input.evidence.generatedAt,
          X_STALE_AGE_MS,
          nowMs,
        )
      : null;

    const staleWarningsJa: string[] = [];
    if (quoteFresh?.staleWarningJa) staleWarningsJa.push(`株価: ${quoteFresh.staleWarningJa}`);
    if (newsFresh?.staleWarningJa) staleWarningsJa.push(`ニュース: ${newsFresh.staleWarningJa}`);
    if (xFresh?.staleWarningJa) staleWarningsJa.push(`X: ${xFresh.staleWarningJa}`);

    return {
      symbol: sym.symbol,
      dataQualityScore,
      confidenceGateOpen: gateOpen,
      allowActionRecommendations: allowAction,
      allowSpeculativeAi: allowSpeculative,
      crossValidation,
      rumorLabelsJa: rumorLabels(sym),
      staleWarningsJa,
      sourceBreakdown: buildSourceBreakdown(sym),
      freshness: { quote: quoteFresh, news: newsFresh, x: xFresh },
    };
  });

  const overallDataQualityScore =
    symbols.length > 0
      ? clamp(symbols.reduce((a, s) => a + s.dataQualityScore, 0) / symbols.length)
      : 0;
  const overallConfidencePct = input.evidence.actionGuide.overallConfidencePct;
  const confidenceGateOpen = overallConfidencePct >= CONFIDENCE_GATE_MIN_PCT;
  const allowSpeculativeAi =
    confidenceGateOpen &&
    overallDataQualityScore >= CONFIDENCE_GATE_MIN_PCT &&
    !input.evidence.actionGuide.symbols.every((g) => g.insufficientData);
  const allowActionRecommendations =
    allowSpeculativeAi && symbols.some((s) => s.allowActionRecommendations);

  const burstSuppressActive =
    (input.recentNotificationCount ?? 0) >= 3;

  let analysisBlockedJa: string | null = null;
  if (!allowSpeculativeAi) {
    analysisBlockedJa =
      input.evidence.actionGuide.symbols.every((g) => g.insufficientData)
        ? `${ANALYSIS_BLOCKED_LABEL_JA} — 判断材料不足`
        : `${ANALYSIS_BLOCKED_LABEL_JA} — 確信度${overallConfidencePct}%（閾値${CONFIDENCE_GATE_MIN_PCT}%未満）`;
  }

  const globalStale = symbols.some((s) => s.staleWarningsJa.length > 0);

  return {
    generatedAt: new Date().toISOString(),
    overallDataQualityScore,
    overallConfidencePct,
    confidenceGateOpen,
    allowSpeculativeAi,
    allowActionRecommendations,
    analysisBlockedJa,
    apiIsolation,
    symbols,
    globalStaleWarningJa: globalStale ? '古いデータの可能性 — 鮮度を確認してください' : null,
    burstSuppressActive,
    deterministicModeHintJa: '重要分析: 低温度・ルールベース根拠優先',
  };
}

/** 証拠バンドルに riskControl を付与 */
export function attachRiskControlToEvidence(
  evidence: EvidenceWithActionGuide,
  options?: Omit<BuildRiskControlInput, 'evidence'>,
): ConciergeEvidenceBundle {
  const enrichedSymbols = evidence.symbols.map((s) =>
    enrichNewsSourceReliability(s, evidence.generatedAt),
  );
  const base: EvidenceWithActionGuide = { ...evidence, symbols: enrichedSymbols };
  const riskControl = buildConciergeRiskControl({ evidence: base, ...options });
  return { ...base, riskControl };
}
