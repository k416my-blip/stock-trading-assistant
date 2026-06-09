/**
 * シグナルギャップ監査 — ルール変更なし・診断のみ
 */
import {
  FORWARD_ADX_MIN,
  FORWARD_ETF_UNIVERSE,
  FORWARD_MACD_MIN,
  FORWARD_MAX_CONCURRENT,
  FORWARD_PRIORITY,
  FORWARD_REGIME_DOWN_THRESH,
  FORWARD_REGIME_UP_THRESH,
  FORWARD_SHALLOW_ADX_MIN,
  FORWARD_SHALLOW_MACD_MIN,
  FORWARD_SIDEWAYS_DEEP_DIST,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardEtfLatestDiagnosis,
  ForwardSignalGapAuditReport,
  ForwardSignalGapDaySummary,
  ForwardValidationPersisted,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  buildSpyRegimeMap,
  classifyBucket,
  computeAdx14,
  computeDist52wPct,
  computeMacdHistPct,
  scanSignalAtBar,
  type FourBucket,
  type OhlcvBar,
  type Regime,
} from './case4Indicators';

export const SIGNAL_GAP_AUDIT_SINCE = '2026-04-14';

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return Math.round(((closes[idx]! / closes[idx - lookback]! - 1) * 100) * 1000) / 1000;
}

function bucketLabelJa(bucket: FourBucket | 'unknown'): string {
  const map: Record<string, string> = {
    up: '上昇',
    down: '下落',
    sideways_shallow: '横ばい・浅',
    sideways_deep: '横ばい・深',
    unknown: '不明',
  };
  return map[bucket] ?? bucket;
}

function regimeLabelJa(regime: Regime | 'unknown'): string {
  const map: Record<string, string> = {
    up: '上昇',
    sideways: '横ばい',
    down: '下落',
    unknown: '不明',
  };
  return map[regime] ?? regime;
}

export function diagnoseEtfAtBar(input: {
  symbol: ForwardEtfSymbol;
  bars: OhlcvBar[];
  idx: number;
  regimeMap: Map<string, Regime>;
  spyBars: OhlcvBar[];
}): ForwardEtfLatestDiagnosis {
  const { symbol, bars, idx, regimeMap, spyBars } = input;
  const date = bars[idx]?.date ?? '';
  const adx14 = computeAdx14(bars, idx);
  const closes = bars.map((b) => b.close);
  const macdHistPct = computeMacdHistPct(closes, idx);
  const dist52wPct = computeDist52wPct(bars, idx);
  const spyRegime = regimeMap.get(date) ?? 'unknown';
  const spyRet63Pct = computeSpyRet63(spyBars, date);
  const reasons: string[] = [];

  if (adx14 == null || macdHistPct == null || dist52wPct == null) {
    reasons.push('指標計算不可（履歴不足）');
    return {
      symbol,
      barDate: date,
      adx14,
      macdHistPct,
      dist52wPct,
      spyRegime,
      spyRet63Pct,
      bucket: 'unknown',
      passes: false,
      disqualificationReasonsJa: reasons,
      primaryDisqualificationJa: reasons[0]!,
    };
  }

  if (adx14 <= FORWARD_ADX_MIN) {
    reasons.push(`ADX不足（${adx14} ≤ ${FORWARD_ADX_MIN}、要 >${FORWARD_ADX_MIN}）`);
  }
  if (macdHistPct <= FORWARD_MACD_MIN) {
    reasons.push(`MACD不足（${macdHistPct}% ≤ ${FORWARD_MACD_MIN}%、要 >${FORWARD_MACD_MIN}%）`);
  }
  if (spyRegime === 'unknown') {
    reasons.push('レジーム未判定（SPY 63日リターン未取得）');
  }

  const bucket =
    adx14 > FORWARD_ADX_MIN && macdHistPct > FORWARD_MACD_MIN && spyRegime !== 'unknown'
      ? classifyBucket(spyRegime, dist52wPct)
      : 'unknown';

  if (bucket === 'unknown' && reasons.length === 0) {
    reasons.push('バケット未分類');
  }

  if (bucket === 'up') {
    if (dist52wPct > -2) {
      reasons.push(`52週高値乖離不足（${dist52wPct}% > -2%、上昇相場は要 ≤-2%）`);
    }
  } else if (bucket === 'down' || bucket === 'sideways_deep') {
    if (dist52wPct > -8) {
      reasons.push(
        `52週高値乖離不足（${dist52wPct}% > -8%、${bucketLabelJa(bucket)}は要 ≤-8%）`,
      );
    }
  } else if (bucket === 'sideways_shallow') {
    if (dist52wPct > -2 || dist52wPct <= FORWARD_SIDEWAYS_DEEP_DIST) {
      reasons.push(
        `52週高値乖離帯域外（${dist52wPct}%、横ばい浅は -2% ～ ${FORWARD_SIDEWAYS_DEEP_DIST}%）`,
      );
    }
    if (adx14 <= FORWARD_SHALLOW_ADX_MIN) {
      reasons.push(`ADX不足・横ばい浅（${adx14} ≤ ${FORWARD_SHALLOW_ADX_MIN}、要 >${FORWARD_SHALLOW_ADX_MIN}）`);
    }
    if (macdHistPct <= FORWARD_SHALLOW_MACD_MIN) {
      reasons.push(
        `MACD不足・横ばい浅（${macdHistPct}% ≤ ${FORWARD_SHALLOW_MACD_MIN}%、要 >${FORWARD_SHALLOW_MACD_MIN}%）`,
      );
    }
  }

  const scan = scanSignalAtBar(bars, idx, regimeMap);
  const passes = scan?.passes ?? false;
  if (passes) {
    return {
      symbol,
      barDate: date,
      adx14,
      macdHistPct,
      dist52wPct,
      spyRegime,
      spyRet63Pct,
      bucket,
      passes: true,
      disqualificationReasonsJa: [],
      primaryDisqualificationJa: '条件適合',
    };
  }

  return {
    symbol,
    barDate: date,
    adx14,
    macdHistPct,
    dist52wPct,
    spyRegime,
    spyRet63Pct,
    bucket,
    passes: false,
    disqualificationReasonsJa: reasons.length > 0 ? reasons : ['最終ルール不適合'],
    primaryDisqualificationJa: reasons[0] ?? '最終ルール不適合',
  };
}

function summarizeDay(input: {
  date: string;
  bundle: ForwardOhlcvBundle;
  regimeMap: Map<string, Regime>;
}): ForwardSignalGapDaySummary {
  const { date, bundle, regimeMap } = input;
  const passing: ForwardEtfSymbol[] = [];
  const perSymbolPrimaryReasonJa = {} as Record<ForwardEtfSymbol, string>;

  for (const symbol of FORWARD_ETF_UNIVERSE) {
    const bars = bundle.etfBars[symbol];
    const idx = bars.findIndex((b) => b.date === date);
    if (idx < 0) {
      perSymbolPrimaryReasonJa[symbol] = 'バーなし';
      continue;
    }
    const d = diagnoseEtfAtBar({ symbol, bars, idx, regimeMap, spyBars: bundle.spyBars });
    perSymbolPrimaryReasonJa[symbol] = d.primaryDisqualificationJa;
    if (d.passes) passing.push(symbol);
  }

  const sorted = [...passing].sort((a, b) => FORWARD_PRIORITY[b] - FORWARD_PRIORITY[a]);
  const taken = sorted.slice(0, FORWARD_MAX_CONCURRENT);
  const rejected = sorted.slice(FORWARD_MAX_CONCURRENT);

  for (const sym of rejected) {
    perSymbolPrimaryReasonJa[sym] = `同時採用上限（優先度${FORWARD_PRIORITY[sym]}位、上位${FORWARD_MAX_CONCURRENT}件のみ）`;
  }

  return {
    date,
    passingSymbols: passing,
    rejectedByConcurrentLimit: rejected,
    perSymbolPrimaryReasonJa,
  };
}

function findLastSignal(state: ForwardValidationPersisted): {
  date: string | null;
  symbol: ForwardEtfSymbol | null;
} {
  if (state.signals.length === 0) return { date: null, symbol: null };
  const sorted = [...state.signals].sort((a, b) => b.date.localeCompare(a.date));
  return { date: sorted[0]!.date, symbol: sorted[0]!.symbol };
}

function buildActiveSignalZeroReport(state: ForwardValidationPersisted): string {
  const open = state.openPositions.length;
  const pending = state.signals.filter((s) => s.status === 'pending_entry').length;
  const lines = [
    `オープンポジション: ${open}件`,
    `エントリー待ち: ${pending}件`,
  ];
  if (open === 0 && pending === 0) {
    lines.push('→ 現在有効シグナル0件: 未決済のポジションもエントリー待ちもない');
    lines.push('→ 直近の最新バーで全ETFがエントリー条件を満たしていない可能性が高い');
  }
  return lines.join('\n');
}

export function auditSignalGapSince(input: {
  state: ForwardValidationPersisted;
  bundle: ForwardOhlcvBundle;
  sinceDate?: string;
}): ForwardSignalGapAuditReport {
  const sinceDate = input.sinceDate ?? SIGNAL_GAP_AUDIT_SINCE;
  const { state, bundle } = input;
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const yahooLatestDate = bundle.latestDate;

  const latestBarDiagnosis = FORWARD_ETF_UNIVERSE.map((symbol) => {
    const bars = bundle.etfBars[symbol];
    const idx = bars.length - 1;
    return diagnoseEtfAtBar({ symbol, bars, idx, regimeMap, spyBars: bundle.spyBars });
  });

  const gapDates = bundle.tradingDates.filter((d) => d >= sinceDate && d <= yahooLatestDate);
  const gapPeriodSummaries = gapDates.map((date) =>
    summarizeDay({ date, bundle, regimeMap }),
  );

  const reasonCountsSince = Object.fromEntries(
    FORWARD_ETF_UNIVERSE.map((sym) => [sym, {} as Record<string, number>]),
  ) as Record<ForwardEtfSymbol, Record<string, number>>;

  for (const day of gapPeriodSummaries) {
    for (const sym of FORWARD_ETF_UNIVERSE) {
      const reason = day.perSymbolPrimaryReasonJa[sym];
      const bucket = reasonCountsSince[sym];
      bucket[reason] = (bucket[reason] ?? 0) + 1;
    }
  }

  const daysWithAnyPass = gapPeriodSummaries.filter((d) => d.passingSymbols.length > 0).length;
  const signalsSinceCount = state.signals.filter((s) => s.date >= sinceDate).length;
  const last = findLastSignal(state);

  const activeSignalZeroReportJa = buildActiveSignalZeroReport(state);

  const humanLines: string[] = [
    `【シグナルギャップ監査】${sinceDate} ～ ${yahooLatestDate}`,
    '',
    `最終シグナル: ${last.date ?? '—'} ${last.symbol ?? ''}`,
    `期間内シグナル記録: ${signalsSinceCount}件 / 営業日 ${gapDates.length}日`,
    `条件適合日: ${daysWithAnyPass}日 · 全ETF不適合日: ${gapDates.length - daysWithAnyPass}日`,
    '',
    '■ 最新バー診断（Yahoo取得後）',
  ];

  for (const d of latestBarDiagnosis) {
    humanLines.push(
      `${d.symbol} (${d.barDate}): ADX=${d.adx14 ?? '—'} MACD=${d.macdHistPct ?? '—'}% 52w=${d.dist52wPct ?? '—'}%`,
    );
    humanLines.push(
      `  SPYレジーム=${regimeLabelJa(d.spyRegime)} (${d.spyRet63Pct ?? '—'}%) バケット=${bucketLabelJa(d.bucket)}`,
    );
    humanLines.push(
      `  → ${d.passes ? '✓ 条件適合' : d.primaryDisqualificationJa}`,
    );
  }

  humanLines.push('', '■ 期間内の主な失格理由（営業日数）');
  for (const sym of FORWARD_ETF_UNIVERSE) {
    const counts = reasonCountsSince[sym];
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    humanLines.push(
      `${sym}: ${top.map(([r, n]) => `${r}(${n}日)`).join(' · ') || '—'}`,
    );
  }

  humanLines.push('', '■ 現在有効シグナル0件の理由');
  humanLines.push(activeSignalZeroReportJa);

  if (daysWithAnyPass === 0 && gapDates.length > 0) {
    humanLines.push('');
    humanLines.push(
      `結論: ${sinceDate}以降、全営業日で4ETFいずれもエントリー条件を満たしていません。`,
    );
    humanLines.push(
      '主因は最新バー診断の失格理由を参照（多くの場合 52週高値乖離不足 または ADX/MACD 不足）。',
    );
  } else if (daysWithAnyPass > 0 && signalsSinceCount === 0) {
    humanLines.push('');
    humanLines.push(
      '注意: 条件適合日はあるが state にシグナル未記録 — エンジン replay または storage 不整合の可能性',
    );
  }

  return {
    auditedAt: new Date().toISOString(),
    sinceDate,
    yahooLatestDate,
    lastSignalDate: last.date,
    lastSignalSymbol: last.symbol,
    signalsSinceCount,
    tradingDaysSince: gapDates.length,
    daysWithAnyPass,
    daysWithZeroPass: gapDates.length - daysWithAnyPass,
    latestBarDiagnosis,
    gapPeriodSummaries,
    reasonCountsSince,
    activeSignalZeroReportJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatSignalGapReportCsv(report: ForwardSignalGapAuditReport): string {
  const lines: string[] = ['# Signal Gap Audit', `auditedAt,${report.auditedAt}`, ''];
  lines.push('symbol,barDate,adx14,macdHistPct,dist52wPct,spyRegime,spyRet63Pct,bucket,passes,primaryReason');
  for (const d of report.latestBarDiagnosis) {
    lines.push(
      [
        d.symbol,
        d.barDate,
        d.adx14,
        d.macdHistPct,
        d.dist52wPct,
        d.spyRegime,
        d.spyRet63Pct,
        d.bucket,
        d.passes,
        `"${d.primaryDisqualificationJa.replace(/"/g, '""')}"`,
      ].join(','),
    );
  }
  lines.push('');
  lines.push('# humanSummary');
  lines.push(report.humanSummaryJa);
  return lines.join('\n');
}
