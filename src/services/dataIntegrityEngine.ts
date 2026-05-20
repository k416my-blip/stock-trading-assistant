import {
  BAD_TICK_JUMP_PCT,
  CONFIDENCE_DECAY_PER_HOUR_STALE,
  CONFIDENCE_OUTAGE_PENALTY,
  CROSS_SOURCE_DIVERGENCE_PCT,
  holidaysForMarket,
  LIQUIDITY_VOLUME_Z_THRESHOLD,
  MARKET_SESSION_LABEL,
  MAX_GAP_DAYS_TO_REPAIR,
  STALE_OHLCV_HOURS,
  STALE_QUOTE_MAX_AGE_MS,
  SPLIT_JUMP_THRESHOLD,
  TIMESTAMP_DRIFT_WARN_MS,
} from '../constants/dataIntegrity';
import type { Market } from '../types';
import type { MarketQuote } from '../types/marketData';
import type {
  AdjustmentValidation,
  ApiOutageReconciliation,
  BadTickFilter,
  ConfidenceDecay,
  CrossSourceVerification,
  DataIntegrityInput,
  DataIntegrityReport,
  GapClassification,
  GapClass,
  HolidayAwareness,
  IntegrityIssue,
  IntegritySeverity,
  LiquidityAnomalyCheck,
  LookaheadBiasCheck,
  MissingCandleRepair,
  SessionValidation,
  StaleQuoteCheck,
  SymbolIntegrityResult,
  TimestampDriftCheck,
} from '../types/dataIntegrity';
import type { AdjustedOHLCVBar, SurvivorshipBiasReport } from '../types/quantValidation';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseDate(d: string): number {
  return new Date(`${d}T12:00:00Z`).getTime();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function businessDaysBetween(a: string, b: string): number {
  let count = 0;
  let cur = a;
  const end = parseDate(b);
  while (parseDate(cur) < end && count < 10) {
    cur = addDays(cur, 1);
    const dow = new Date(`${cur}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

/** 欠損ローソク修復（線形補間 + 前日値ホールド） */
export function repairMissingCandles(bars: AdjustedOHLCVBar[]): MissingCandleRepair {
  if (bars.length < 2) {
    return { gapsFound: 0, candlesRepaired: 0, methodJa: 'データ不足' };
  }
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const out: AdjustedOHLCVBar[] = [sorted[0]];
  let gapsFound = 0;
  let repaired = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    const gapDays = businessDaysBetween(prev.date, cur.date);
    if (gapDays > 1 && gapDays <= MAX_GAP_DAYS_TO_REPAIR + 1) {
      gapsFound += 1;
      for (let g = 1; g < gapDays; g++) {
        const fillDate = addDays(prev.date, g);
        const t = g / gapDays;
        const interp = {
          open: prev.close + (cur.open - prev.close) * t,
          high: Math.max(prev.high, cur.high),
          low: Math.min(prev.low, cur.low),
          close: prev.close + (cur.close - prev.close) * t,
          volume: Math.round((prev.volume + cur.volume) / 2),
        };
        out.push({
          date: fillDate,
          open: interp.open,
          high: interp.high,
          low: interp.low,
          close: interp.close,
          adjClose: interp.close,
          volume: interp.volume,
          splitAdjFactor: prev.splitAdjFactor,
          dividendAdjFactor: prev.dividendAdjFactor,
        });
        repaired += 1;
      }
    }
    out.push(cur);
  }

  return {
    gapsFound,
    candlesRepaired: repaired,
    methodJa:
      repaired > 0
        ? `線形補間 ${repaired}本（最大${MAX_GAP_DAYS_TO_REPAIR}営業日）`
        : '欠損なし',
    repairedBars: repaired > 0 ? out : undefined,
  };
}

/** 分割/配当調整の整合性検証 */
export function validateSplitDividendAdjustment(bars: AdjustedOHLCVBar[]): AdjustmentValidation {
  let splitJumps = 0;
  let maxAdjGap = 0;
  let divDrift = 0;

  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    if (prev.close <= 0) continue;
    const ratio = cur.close / prev.close;
    if (ratio > 1 + SPLIT_JUMP_THRESHOLD || ratio < 1 - SPLIT_JUMP_THRESHOLD) {
      splitJumps += 1;
    }
    if (prev.adjClose > 0) {
      const adjRet = Math.abs((cur.adjClose - prev.adjClose) / prev.adjClose) * 100;
      maxAdjGap = Math.max(maxAdjGap, adjRet);
      if (ratio > 0.9 && ratio < 1.1 && cur.close < prev.close) {
        divDrift += (prev.close - cur.close) / prev.close;
      }
    }
  }

  const valid = splitJumps <= 2 && maxAdjGap < 18;
  return {
    valid,
    splitJumpsDetected: splitJumps,
    dividendDriftPct: Math.round((motionDivDrift(divDrift, bars.length)) * 1000) / 10,
    maxAdjGapPct: Math.round(maxAdjGap * 10) / 10,
    noteJa: valid
      ? '調整係数は整合的'
      : `要確認: 分割ジャンプ ${splitJumps} · 最大調整ギャップ ${maxAdjGap.toFixed(1)}%`,
  };
}

function motionDivDrift(sum: number, n: number): number {
  return n > 0 ? (sum / n) * 100 : 0;
}

export function detectStaleQuote(
  quoteFetchedAt: string | undefined,
  maxAgeMs = STALE_QUOTE_MAX_AGE_MS,
): StaleQuoteCheck {
  if (!quoteFetchedAt) {
    return {
      stale: true,
      ageMs: maxAgeMs + 1,
      maxAgeMs,
      noteJa: '取得時刻なし — ステール扱い',
    };
  }
  const ageMs = Date.now() - new Date(quoteFetchedAt).getTime();
  const stale = ageMs > maxAgeMs;
  return {
    stale,
    ageMs,
    maxAgeMs,
    noteJa: stale
      ? `ステール ${Math.round(ageMs / 60000)}分（上限 ${Math.round(maxAgeMs / 60000)}分）`
      : `クォート新鮮（${Math.round(ageMs / 1000)}秒前）`,
  };
}

export function reconcileApiOutage(diagnostics?: {
  successRatePct: number | null;
  timeoutCount: number;
  rateLimitCount: number;
}): ApiOutageReconciliation {
  const successRate = diagnostics?.successRatePct ?? null;
  const timeoutCount = diagnostics?.timeoutCount ?? 0;
  const rateLimitCount = diagnostics?.rateLimitCount ?? 0;
  const outageSuspected =
    (successRate != null && successRate < 55) || timeoutCount >= 5 || rateLimitCount >= 3;

  return {
    outageSuspected,
    successRatePct: successRate,
    timeoutCount,
    rateLimitCount,
    noteJa: outageSuspected
      ? `API不安定 — 成功率 ${successRate ?? '—'}% · タイムアウト ${timeoutCount}`
      : `API正常 — 成功率 ${successRate ?? '—'}%`,
  };
}

export function verifyCrossSourceQuote(
  quotePrice: number,
  referencePrice: number,
): CrossSourceVerification {
  if (quotePrice <= 0 || referencePrice <= 0) {
    return {
      verified: false,
      quotePrice,
      referencePrice,
      divergencePct: 100,
      noteJa: '参照価格不足 — 検証不可',
    };
  }
  const divergencePct = Math.abs((quotePrice - referencePrice) / referencePrice) * 100;
  const verified = divergencePct <= CROSS_SOURCE_DIVERGENCE_PCT;
  return {
    verified,
    quotePrice,
    referencePrice,
    divergencePct: Math.round(divergencePct * 100) / 100,
    noteJa: verified
      ? `クロス検証OK（乖離 ${divergencePct.toFixed(2)}%）`
      : `乖離 ${divergencePct.toFixed(2)}% — 要再取得`,
  };
}

export function detectTimestampDrift(
  quote?: MarketQuote | null,
  quoteFetchedAt?: string,
): TimestampDriftCheck {
  const quoteTs = quote?.datetime ? new Date(quote.datetime).getTime() : null;
  const localTs = quoteFetchedAt ? new Date(quoteFetchedAt).getTime() : Date.now();
  const driftMs = quoteTs ? Math.abs(localTs - quoteTs) : 0;
  const serverSkewSuspected = driftMs > TIMESTAMP_DRIFT_WARN_MS;
  return {
    driftMs,
    serverSkewSuspected,
    noteJa: serverSkewSuspected
      ? `タイムスタンプ乖離 ${Math.round(driftMs / 1000)}秒`
      : 'タイムスタンプ整合',
  };
}

export function checkLookaheadBias(bars: AdjustedOHLCVBar[], asOfDate?: string): LookaheadBiasCheck {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const futureBars = bars.filter((b) => b.date > asOf).length;
  const safe = futureBars === 0;
  return {
    safe,
    futureBars,
    asOfDate: asOf,
    noteJa: safe
      ? 'ルックアヘッド・バイアスなし（未来バー除外）'
      : `未来データ ${futureBars}本 — バックテストから除外必須`,
  };
}

export function detectLiquidityAnomaly(bars: AdjustedOHLCVBar[]): LiquidityAnomalyCheck {
  if (bars.length < 10) {
    return { anomalyDetected: false, volumeZScore: 0, noteJa: '出来高サンプル不足' };
  }
  const vols = bars.slice(-30).map((b) => b.volume);
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  const variance = vols.reduce((s, v) => s + (v - mean) ** 2, 0) / vols.length;
  const std = Math.sqrt(variance) || 1;
  const last = vols[vols.length - 1];
  const z = (last - mean) / std;
  const anomalyDetected = Math.abs(z) > LIQUIDITY_VOLUME_Z_THRESHOLD || last < mean * 0.15;
  return {
    anomalyDetected,
    volumeZScore: Math.round(z * 100) / 100,
    noteJa: anomalyDetected
      ? `流動性異常 — 出来高 Z=${z.toFixed(2)}`
      : `出来高正常（Z=${z.toFixed(2)}）`,
  };
}

function classifyGap(gapPct: number, volumeRatio: number): GapClass {
  if (Math.abs(gapPct) < 0.5) return 'none';
  if (Math.abs(gapPct) > BAD_TICK_JUMP_PCT) return 'bad_tick';
  if (Math.abs(gapPct) > 12) return 'split';
  if (volumeRatio < 0.2) return 'liquidity_vacuum';
  if (Math.abs(gapPct) > 4) return 'earnings';
  return 'overnight';
}

export function classifyGaps(bars: AdjustedOHLCVBar[]): GapClassification {
  const gaps: GapClassification['gaps'] = [];
  let largest = 0;
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    if (prev.close <= 0) continue;
    const gapPct = ((cur.open - prev.close) / prev.close) * 100;
    if (Math.abs(gapPct) < 0.3) continue;
    const volRatio = prev.volume > 0 ? cur.volume / prev.volume : 1;
    const cls = classifyGap(gapPct, volRatio);
    gaps.push({ date: cur.date, gapPct: Math.round(gapPct * 100) / 100, class: cls });
    largest = Math.max(largest, Math.abs(gapPct));
  }
  const recent = gaps.slice(-5);
  return {
    gaps: recent,
    largestGapPct: Math.round(largest * 100) / 100,
    noteJa:
      recent.length > 0
        ? `直近ギャップ ${recent.length}件 · 最大 ${largest.toFixed(1)}%`
        : '有意なギャップなし',
  };
}

export function filterBadTicks(bars: AdjustedOHLCVBar[]): { bars: AdjustedOHLCVBar[]; filter: BadTickFilter } {
  if (bars.length < 3) {
    return { bars, filter: { ticksRemoved: 0, thresholdPct: BAD_TICK_JUMP_PCT, noteJa: 'サンプル不足' } };
  }
  const out: AdjustedOHLCVBar[] = [bars[0]];
  let removed = 0;
  for (let i = 1; i < bars.length; i++) {
    const prev = out[out.length - 1];
    const cur = bars[i];
    if (prev.close > 0) {
      const jump = Math.abs((cur.close - prev.close) / prev.close) * 100;
      if (jump > BAD_TICK_JUMP_PCT && cur.volume < prev.volume * 0.1) {
        removed += 1;
        continue;
      }
    }
    out.push(cur);
  }
  return {
    bars: out,
    filter: {
      ticksRemoved: removed,
      thresholdPct: BAD_TICK_JUMP_PCT,
      noteJa: removed > 0 ? `不良ティック ${removed}本除外` : '不良ティックなし',
    },
  };
}

export function validateMarketSession(market: Market, now = new Date()): SessionValidation {
  const utc = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dow = now.getUTCDay();
  let inSession = false;

  if (market === 'us') {
    inSession = dow >= 1 && dow <= 5 && utc >= 14.5 && utc < 21;
  } else if (market === 'bursa') {
    inSession = dow >= 1 && dow <= 5 && utc >= 1 && utc < 9;
  } else if (market === 'hk') {
    inSession = dow >= 1 && dow <= 5 && utc >= 1.5 && utc < 8;
  }

  return {
    inSession,
    market,
    sessionLabelJa: MARKET_SESSION_LABEL[market],
    noteJa: inSession ? 'セッション内（代理時間）' : 'セッション外 — 価格は参考',
  };
}

export function checkExchangeHoliday(market: Market, dateStr?: string): HolidayAwareness {
  const d = dateStr ?? new Date().toISOString().slice(0, 10);
  const holidays = holidaysForMarket(market);
  const isHoliday = holidays.includes(d);
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  return {
    isHoliday: isHoliday || weekend,
    exchangeLabelJa: MARKET_SESSION_LABEL[market],
    nextSessionJa: isHoliday || weekend ? '次営業日まで遅延の可能性' : '通常セッション',
    noteJa: isHoliday || weekend ? '休場日 — データ更新停止の可能性' : '営業日',
  };
}

export function computeConfidenceDecay(params: {
  staleQuote: StaleQuoteCheck | null;
  ohlcvAgeHours?: number;
  outage: ApiOutageReconciliation;
  issues: IntegrityIssue[];
}): ConfidenceDecay {
  const baseConfidence = 100;
  let stalePenalty = 0;
  if (params.staleQuote?.stale) {
    stalePenalty = Math.min(40, (params.staleQuote.ageMs / 3600000) * CONFIDENCE_DECAY_PER_HOUR_STALE);
  }
  if (params.ohlcvAgeHours != null && params.ohlcvAgeHours > STALE_OHLCV_HOURS) {
    stalePenalty += Math.min(25, (params.ohlcvAgeHours - STALE_OHLCV_HOURS) * 2);
  }
  const outagePenalty = params.outage.outageSuspected ? CONFIDENCE_OUTAGE_PENALTY : 0;
  const issuePenalty = params.issues.filter((i) => i.severity === 'critical').length * 12;
  const decayedConfidence = clamp(
    baseConfidence - stalePenalty - outagePenalty - issuePenalty,
    0,
    100,
  );

  return {
    baseConfidence,
    decayedConfidence: Math.round(decayedConfidence),
    stalePenalty: Math.round(stalePenalty),
    outagePenalty,
    noteJa: `信頼度 ${Math.round(decayedConfidence)}%（ステール -${Math.round(stalePenalty)}）`,
  };
}

function buildSymbolIssues(
  r: Pick<
    SymbolIntegrityResult,
    | 'adjustmentValidation'
    | 'staleQuote'
    | 'crossSource'
    | 'lookahead'
    | 'liquidityAnomaly'
    | 'gapClassification'
    | 'timestampDrift'
  >,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const add = (id: string, severity: IntegritySeverity, titleJa: string, detailJa: string) => {
    issues.push({ id, severity, titleJa, detailJa });
  };

  if (!r.adjustmentValidation.valid) {
    add('adj', 'high', '調整不整合', r.adjustmentValidation.noteJa);
  }
  if (r.staleQuote?.stale) {
    add('stale', 'critical', 'ステール・クォート', r.staleQuote.noteJa);
  }
  if (r.crossSource && !r.crossSource.verified) {
    add('cross', 'high', 'クロスソース乖離', r.crossSource.noteJa);
  }
  if (!r.lookahead.safe) {
    add('lookahead', 'critical', 'ルックアヘッド', r.lookahead.noteJa);
  }
  if (r.liquidityAnomaly.anomalyDetected) {
    add('liq', 'watch', '流動性異常', r.liquidityAnomaly.noteJa);
  }
  if (r.gapClassification.gaps.some((g) => g.class === 'bad_tick')) {
    add('gap', 'high', '不良ギャップ', r.gapClassification.noteJa);
  }
  if (r.timestampDrift?.serverSkewSuspected) {
    add('drift', 'watch', 'タイムスタンプ乖離', r.timestampDrift.noteJa);
  }

  return issues;
}

/** 単一銘柄のデータ整合性検査 */
export function validateSymbolDataIntegrity(input: DataIntegrityInput): SymbolIntegrityResult {
  let bars = input.bars ?? [];
  const repair = repairMissingCandles(bars);
  if (repair.repairedBars) bars = repair.repairedBars;

  const filtered = filterBadTicks(bars);
  bars = filtered.bars;

  const adjustmentValidation = validateSplitDividendAdjustment(bars);
  const staleQuote = input.quoteFetchedAt
    ? detectStaleQuote(input.quoteFetchedAt)
    : input.quote
      ? detectStaleQuote(new Date().toISOString())
      : null;

  const reference = input.referenceBarClose ?? bars[bars.length - 1]?.close ?? 0;
  const crossSource =
    input.quote && reference > 0
      ? verifyCrossSourceQuote(input.quote.price, reference)
      : null;

  const timestampDrift = detectTimestampDrift(input.quote, input.quoteFetchedAt);
  const lookahead = checkLookaheadBias(bars);
  const liquidityAnomaly = detectLiquidityAnomaly(bars);
  const gapClassification = classifyGaps(bars);
  const session = validateMarketSession(input.market);
  const holiday = checkExchangeHoliday(input.market);

  const partial = {
    missingCandleRepair: repair,
    adjustmentValidation,
    staleQuote,
    crossSource,
    timestampDrift,
    lookahead,
    liquidityAnomaly,
    gapClassification,
    badTickFilter: filtered.filter,
    session,
    holiday,
    confidence: { baseConfidence: 100, decayedConfidence: 100, stalePenalty: 0, outagePenalty: 0, noteJa: '' },
  };

  const issues = buildSymbolIssues(partial);
  const outage = reconcileApiOutage(input.apiDiagnostics);
  const confidence = computeConfidenceDecay({
    staleQuote,
    ohlcvAgeHours: input.bars?.length
      ? (Date.now() - parseDate(input.bars[input.bars.length - 1].date)) / 3600000
      : undefined,
    outage,
    issues,
  });

  const symbolConfidence = confidence.decayedConfidence;

  return {
    symbol: input.symbol,
    market: input.market,
    ...partial,
    confidence,
    symbolConfidence,
    issues: issues.map((i) => ({ ...i, symbol: input.symbol })),
  };
}

/** ポートフォリオ横断レポート */
export function buildDataIntegrityReport(params: {
  inputs: DataIntegrityInput[];
  survivorship?: SurvivorshipBiasReport | null;
  apiDiagnostics?: DataIntegrityInput['apiDiagnostics'];
  /** 0–1 市場データ鮮度に基づく信頼度係数 */
  dataConfidence?: number;
}): DataIntegrityReport {
  const apiOutage = reconcileApiOutage(params.apiDiagnostics);
  const symbols = params.inputs.map((inp) =>
    validateSymbolDataIntegrity({ ...inp, apiDiagnostics: params.apiDiagnostics }),
  );

  const globalIssues: IntegrityIssue[] = [];
  if (apiOutage.outageSuspected) {
    globalIssues.push({
      id: 'api-outage',
      severity: 'high',
      titleJa: 'API障害疑い',
      detailJa: apiOutage.noteJa,
    });
  }
  if (params.survivorship && !params.survivorship.pointInTimeSafe) {
    globalIssues.push({
      id: 'survivorship',
      severity: 'watch',
      titleJa: 'サバイバーシップ',
      detailJa: params.survivorship.warningJa,
    });
  }

  const allIssues = [...globalIssues, ...symbols.flatMap((s) => s.issues)];
  const staleFactor = params.dataConfidence ?? 1;
  const rawAggregate =
    symbols.length > 0
      ? symbols.reduce((s, x) => s + x.symbolConfidence, 0) / symbols.length
      : apiOutage.outageSuspected
        ? 40
        : 85;
  const aggregateConfidence = Math.round(rawAggregate * staleFactor);

  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const executionSafe = criticalCount === 0 && aggregateConfidence >= 50 && !apiOutage.outageSuspected;

  const backtestRealismScore = Math.round(
    clamp(
      aggregateConfidence * 0.5 +
        (params.survivorship?.pointInTimeSafe ? 25 : 10) +
        symbols.filter((s) => s.lookahead.safe).length * 3 -
        symbols.filter((s) => !s.adjustmentValidation.valid).length * 8,
      0,
      100,
    ),
  );

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (criticalCount > 0 || aggregateConfidence < 45) healthStatus = 'red';
  else if (allIssues.some((i) => i.severity === 'high') || aggregateConfidence < 65) {
    healthStatus = 'yellow';
  }

  const verdictJa = executionSafe
    ? `データ衛生OK — 信頼度 ${aggregateConfidence}% · 執行安全`
    : healthStatus === 'red'
      ? `データ汚染リスク — ${allIssues.find((i) => i.severity === 'critical')?.titleJa ?? '要修復'}`
      : `監視モード — 信頼度 ${aggregateConfidence}%`;

  return {
    generatedAt: new Date().toISOString(),
    symbols,
    survivorship: params.survivorship ?? null,
    apiOutage,
    globalIssues,
    aggregateConfidence,
    executionSafe,
    backtestRealismScore,
    healthStatus,
    verdictJa,
  };
}

/** 執行・ゲート用の信頼度乗数 0–1 */
export function dataConfidenceMultiplier(report: DataIntegrityReport): number {
  return clamp(report.aggregateConfidence / 100, 0.2, 1);
}

/** バックテスト用に未来バーを除去 */
export function barsForBacktest(bars: AdjustedOHLCVBar[], asOfDate?: string): AdjustedOHLCVBar[] {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const repaired = repairMissingCandles(bars);
  const base = repaired.repairedBars ?? bars;
  const filtered = filterBadTicks(base);
  return filtered.bars.filter((b) => b.date <= asOf);
}
