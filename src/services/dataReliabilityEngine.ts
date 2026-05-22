/**
 * Data Reliability & Market Data Integrity — rule-based, deterministic, local-only.
 */
import { API_HEALTH_STATUS_LABELS_JA } from '../constants/apiSetupWizard';
import {
  ABNORMAL_CHANGE_PCT,
  AI_INPUT_GATE_MIN_SCORE,
  BAD_TICK_CHANGE_PCT,
  CONSENSUS_DIVERGENCE_PCT,
  DATA_QUALITY_BASE,
  DATA_RELIABILITY_REGULATORY_JA,
  DEDUCT_ABNORMAL_CHANGE_PCT,
  DEDUCT_API_DEGRADED,
  DEDUCT_BAD_TICK,
  DEDUCT_CONSENSUS_DIVERGENCE,
  DEDUCT_DUPLICATE_NEWS,
  DEDUCT_MARKET_CLOSED_MOVE,
  DEDUCT_NULL_OR_INVALID_PRICE,
  DEDUCT_STALE_NEWS,
  DEDUCT_STALE_QUOTE,
  DEDUCT_STORAGE_CORRUPT,
  DEDUCT_VOLUME_ANOMALY,
  DEDUCT_X_LOW_RELIABILITY,
  STALE_NEWS_MAX_AGE_SEC,
  TIER_HIGH_MIN,
  TIER_MEDIUM_MIN,
  VOLUME_SURGE_BAD,
} from '../constants/dataReliability';
import { STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import type { ApiHealthDashboard, ApiProviderId } from '../types/apiSetup';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type {
  ApiReliabilityRow,
  BuildDataReliabilityInput,
  DataReliabilityBundle,
  QuoteIntegrityIssue,
  ReliabilityTier,
  SymbolDataReliability,
  TimestampedDataPoint,
} from '../types/dataReliability';
import { isValidQuotePrice } from '../utils/safeNumeric';
import { resolveMarketSession } from './paperBroker/marketHoursEngine';
import { runStorageIntegrityCheck } from './productionStability/storageIntegrity';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function tierFromScore(score: number): ReliabilityTier {
  if (score >= TIER_HIGH_MIN) return 'high';
  if (score >= TIER_MEDIUM_MIN) return 'medium';
  return 'low';
}

function tierLabelJa(t: ReliabilityTier): string {
  return t === 'high' ? '高' : t === 'medium' ? '中' : '低';
}

function ageSecondsFrom(iso: string | undefined, nowMs: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((nowMs - t) / 1000));
}

function isHolidaySession(market: ConciergeSymbolEvidence['market'], now: Date): boolean {
  return resolveMarketSession(market, now) === 'holiday';
}

function isMarketClosed(market: ConciergeSymbolEvidence['market'], now: Date): boolean {
  const s = resolveMarketSession(market, now);
  return s === 'closed' || s === 'holiday';
}

/** Exported for docs/tests — per-symbol score formula */
export function computeSymbolDataQualityScore(input: {
  priceValid: boolean;
  quoteStale: boolean;
  newsStale: boolean;
  abnormalChange: boolean;
  badTick: boolean;
  volumeAnomaly: boolean;
  consensusWarn: boolean;
  closedMove: boolean;
  xLowReliability: boolean;
  duplicateNews: boolean;
}): number {
  let score = DATA_QUALITY_BASE;
  if (!input.priceValid) score -= DEDUCT_NULL_OR_INVALID_PRICE;
  if (input.quoteStale) score -= DEDUCT_STALE_QUOTE;
  if (input.newsStale) score -= DEDUCT_STALE_NEWS;
  if (input.abnormalChange) score -= DEDUCT_ABNORMAL_CHANGE_PCT;
  if (input.badTick) score -= DEDUCT_BAD_TICK;
  if (input.volumeAnomaly) score -= DEDUCT_VOLUME_ANOMALY;
  if (input.consensusWarn) score -= DEDUCT_CONSENSUS_DIVERGENCE;
  if (input.closedMove) score -= DEDUCT_MARKET_CLOSED_MOVE;
  if (input.xLowReliability) score -= DEDUCT_X_LOW_RELIABILITY;
  if (input.duplicateNews) score -= DEDUCT_DUPLICATE_NEWS;
  return clamp(score);
}

function detectDuplicateNews(sym: ConciergeSymbolEvidence): boolean {
  const titles = sym.latestFinancialNews.map((h) => h.title.trim().toLowerCase());
  return new Set(titles).size < titles.length && titles.length > 1;
}

function evaluateXReliability(sym: ConciergeSymbolEvidence): boolean {
  const x = sym.xSentiment;
  if (!x) return false;
  if (x.postCount < 3) return true;
  if (x.hypePct + x.panicPct > 85) return true;
  const words = x.trendWords ?? [];
  if (words.length > 0 && new Set(words.map((w) => w.toLowerCase())).size < words.length * 0.6) {
    return true;
  }
  return false;
}

function buildLineage(sym: ConciergeSymbolEvidence, nowMs: number): TimestampedDataPoint[] {
  const points: TimestampedDataPoint[] = [];
  const quoteAge = sym.quoteAgeSeconds ?? ageSecondsFrom(undefined, nowMs);
  points.push({
    source: 'quote',
    sourceLabelJa: sym.quoteIsStale ? '株価（stale）' : '株価',
    timestampIso: new Date(nowMs - quoteAge * 1000).toISOString(),
    ageSeconds: quoteAge,
    stale: sym.quoteIsStale || quoteAge * 1000 > STALE_QUOTE_MAX_AGE_MS,
  });
  if (sym.latestFinancialNews[0]) {
    const h = sym.latestFinancialNews[0];
    const age = h.ageSeconds ?? ageSecondsFrom(h.fetchedAtIso, nowMs);
    points.push({
      source: 'news',
      sourceLabelJa: sym.newsSource,
      timestampIso: h.fetchedAtIso ?? new Date(nowMs).toISOString(),
      ageSeconds: age,
      stale: age > STALE_NEWS_MAX_AGE_SEC,
    });
  }
  if (sym.xSentiment) {
    const age = sym.xSentiment.ageSeconds ?? ageSecondsFrom(sym.xSentiment.fetchedAtIso, nowMs);
    points.push({
      source: 'x',
      sourceLabelJa: sym.xSentiment.fromCache ? 'X（キャッシュ）' : 'X',
      timestampIso: sym.xSentiment.fetchedAtIso ?? new Date(nowMs).toISOString(),
      ageSeconds: age,
      stale: age > 6 * 60 * 60,
    });
  }
  return points;
}

function validateQuote(sym: ConciergeSymbolEvidence, now: Date): {
  issues: QuoteIntegrityIssue[];
  flags: Parameters<typeof computeSymbolDataQualityScore>[0];
  consensusWarningJa: string | null;
} {
  const issues: QuoteIntegrityIssue[] = [];
  const price = sym.currentPrice;
  const priceValid = isValidQuotePrice(price);
  const holiday = isHolidaySession(sym.market, now);
  const closed = isMarketClosed(sym.market, now);

  if (price == null) {
    issues.push({
      code: 'null_price',
      labelJa: '価格なし',
      detailJa: 'currentPrice が null',
    });
  } else if (price === 0) {
    issues.push({
      code: 'zero_price',
      labelJa: 'ゼロ価格',
      detailJa: 'price=0 は無効',
    });
  } else if (!priceValid) {
    issues.push({
      code: 'nan_price',
      labelJa: '不正価格',
      detailJa: 'NaN/非有限値',
    });
  }

  const quoteStale = sym.quoteIsStale || (sym.quoteAgeSeconds ?? 0) * 1000 > STALE_QUOTE_MAX_AGE_MS;
  if (quoteStale) {
    issues.push({
      code: 'stale_quote',
      labelJa: '古い株価',
      detailJa: `経過 ${sym.quoteAgeSeconds ?? '—'}秒`,
    });
  }

  const ch = sym.intradayChangePct;
  const abnormalChange =
    ch != null && Math.abs(ch) >= ABNORMAL_CHANGE_PCT && priceValid;
  if (abnormalChange && !holiday) {
    issues.push({
      code: 'abnormal_change',
      labelJa: '前日比異常',
      detailJa: `${ch!.toFixed(2)}%`,
    });
  }

  const badTick =
    ch != null && Math.abs(ch) >= BAD_TICK_CHANGE_PCT && priceValid && !holiday;
  if (badTick) {
    issues.push({
      code: 'bad_tick',
      labelJa: 'バッドティック疑い',
      detailJa: `単発 ${ch!.toFixed(2)}% — 再取得推奨`,
    });
  }

  const volAnomaly =
    (sym.volumeSurgeRatio ?? 0) >= VOLUME_SURGE_BAD && closed && !holiday;
  if (volAnomaly) {
    issues.push({
      code: 'volume_anomaly',
      labelJa: '出来高異常',
      detailJa: `市場外 · 比率 ${sym.volumeSurgeRatio?.toFixed(1)}`,
    });
  }

  let consensusWarningJa: string | null = null;
  let consensusWarn = false;
  const hold = sym.portfolioHolding;
  if (hold && priceValid && price != null && hold.averageBuyPrice > 0) {
    const diffPct = (Math.abs(price - hold.averageBuyPrice) / hold.averageBuyPrice) * 100;
    if (diffPct >= CONSENSUS_DIVERGENCE_PCT && ch != null && Math.abs(ch) < 2) {
      consensusWarn = true;
      consensusWarningJa = `取得価格と平均取得 ${diffPct.toFixed(1)}% 乖離 — ソース不一致の疑い`;
      issues.push({
        code: 'consensus_divergence',
        labelJa: 'ソース不一致',
        detailJa: consensusWarningJa,
      });
    }
  }

  const closedMove =
    closed && ch != null && Math.abs(ch) >= 3 && !holiday;
  if (closedMove && !holiday) {
    issues.push({
      code: 'market_closed_move',
      labelJa: '市場時間外変動',
      detailJa: '休場/クローズ中の変化 — 誤検知抑制対象',
    });
  }

  const newsAge = sym.latestFinancialNews[0]?.ageSeconds ?? STALE_NEWS_MAX_AGE_SEC + 1;
  const newsStale = newsAge > STALE_NEWS_MAX_AGE_SEC;
  if (newsStale && sym.latestFinancialNews.length > 0) {
    issues.push({
      code: 'stale_quote',
      labelJa: '古いニュース',
      detailJa: `${Math.floor(newsAge / 3600)}h 前 — 新材料扱い禁止`,
    });
  }

  return {
    issues,
    consensusWarningJa,
    flags: {
      priceValid,
      quoteStale,
      newsStale,
      abnormalChange: abnormalChange && !closed,
      badTick,
      volumeAnomaly: volAnomaly,
      consensusWarn,
      closedMove: closedMove && holiday,
      xLowReliability: evaluateXReliability(sym),
      duplicateNews: detectDuplicateNews(sym),
    },
  };
}

function buildApiRows(dashboard: ApiHealthDashboard): ApiReliabilityRow[] {
  const ids: ApiProviderId[] = ['openai', 'news', 'earnings', 'reddit', 'x'];
  return ids.map((id) => {
    const row = dashboard.providers[id];
    const successRatePct =
      row.status === 'ok'
        ? 95
        : row.status === 'rate_limited'
          ? 40
          : row.status === 'error'
            ? 20
            : 0;
    const failureCount =
      row.status === 'error' || row.status === 'rate_limited' ? 1 : 0;
    const latencyMsEstimate =
      row.outcome === 'timeout'
        ? 15000
        : row.status === 'connecting'
          ? 5000
          : row.status === 'ok'
            ? 800
            : 0;
    return {
      providerId: id,
      labelJa: id,
      successRatePct,
      latencyMsEstimate,
      lastSuccessAt: row.lastSuccessAt,
      failureCount,
      statusJa: `${API_HEALTH_STATUS_LABELS_JA[row.status]} — ${row.messageJa}`,
    };
  });
}

export async function buildDataReliabilityBundle(
  input: BuildDataReliabilityInput,
): Promise<DataReliabilityBundle> {
  const now = new Date();
  const nowMs = now.getTime();
  const generatedAt = input.generatedAt ?? now.toISOString();
  const holidayActive = input.symbols.some((s) => isHolidaySession(s.market, now));

  const symbols: SymbolDataReliability[] = input.symbols.map((sym) => {
    const { issues, flags, consensusWarningJa } = validateQuote(sym, now);
    let score = computeSymbolDataQualityScore(flags);
    if (holidayActive && flags.closedMove) {
      score = clamp(score + 10);
    }
    const tier = tierFromScore(score);
    const aiGateOpen = score >= AI_INPUT_GATE_MIN_SCORE && flags.priceValid;
    return {
      symbol: sym.symbol,
      market: sym.market,
      dataQualityScore: score,
      tier,
      issues,
      lineage: buildLineage(sym, nowMs),
      consensusWarningJa,
      aiGateOpen,
      gateNoteJa: aiGateOpen
        ? null
        : score < AI_INPUT_GATE_MIN_SCORE
          ? 'Data Quality 不足 — 強い判断禁止'
          : '価格無効 — 判断保留',
    };
  });

  let globalScore =
    symbols.length > 0
      ? clamp(symbols.reduce((a, s) => a + s.dataQualityScore, 0) / symbols.length)
      : 50;

  const storage = await runStorageIntegrityCheck();
  if (!storage.ok) globalScore = clamp(globalScore - DEDUCT_STORAGE_CORRUPT);

  if (input.apiHealth.degradedByApis) {
    globalScore = clamp(globalScore - DEDUCT_API_DEGRADED);
  }

  const reliabilityTier = tierFromScore(globalScore);
  const aiInputGateOpen =
    globalScore >= AI_INPUT_GATE_MIN_SCORE &&
    storage.ok &&
    symbols.every((s) => s.aiGateOpen || s.issues.length === 0);

  const duplicateTitles = new Set<string>();
  let dupCount = 0;
  for (const sym of input.symbols) {
    for (const h of sym.latestFinancialNews) {
      const k = h.title.trim().toLowerCase();
      if (duplicateTitles.has(k)) dupCount += 1;
      duplicateTitles.add(k);
    }
  }

  const corporateActionNoteJa = input.symbols.some((s) => /\.(KL|HK)$/i.test(s.symbol))
    ? '分割・配当・シンボル変更は手動確認（ルールガード）'
    : null;

  return {
    generatedAt,
    safetyBannerJa: DATA_RELIABILITY_REGULATORY_JA,
    reliabilityTier,
    reliabilityBannerJa: `データ信頼度: ${tierLabelJa(reliabilityTier)}（${globalScore}/100）`,
    globalDataQualityScore: globalScore,
    aiInputGateOpen,
    aiGateNoteJa: aiInputGateOpen
      ? 'ゲート開放 — 根拠十分'
      : 'AI Input Gate 閉鎖 — 判断保留・断定禁止',
    safeFallbackJa: aiInputGateOpen
      ? null
      : '判断保留 — データ不確実または原因特定不能。再取得後に分析してください。',
    symbols,
    apiHealth: buildApiRows(input.apiHealth),
    storageIntegrityOk: storage.ok,
    storageCorruptionKeys: storage.corrupted,
    duplicateGuardNoteJa:
      dupCount > 0 ? `重複ニュース ${dupCount} 件をカウント除外` : null,
    timezoneNoteJa: '全タイムスタンプは UTC 基準で比較（US/JP/MY ローカルは市場時間ルールで補正）',
    holidaySuppressionActive: holidayActive,
    corporateActionNoteJa,
    lineageSummaryJa: symbols.flatMap((s) =>
      s.lineage.map((l) => `${s.symbol}: ${l.sourceLabelJa} ${l.ageSeconds}s`),
    ).slice(0, 8),
  };
}

export async function refreshDataReliabilityBundle(
  input: BuildDataReliabilityInput,
): Promise<DataReliabilityBundle> {
  return buildDataReliabilityBundle(input);
}
