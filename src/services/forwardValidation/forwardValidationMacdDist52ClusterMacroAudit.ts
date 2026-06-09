/**
 * MACD×52w 4〜5月クラスタ vs その他 マクロ比較監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52ClusterMacroAuditReport,
  ForwardMacdDist52ClusterMacroCompareRow,
  ForwardMacdDist52ClusterMacroGroupStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesMacdDist52 } from './forwardValidationMacdDist52PeriodAudit';

const COHORT_LABEL = 'MACD>=0.25 × 52w<=-5%';
const CLUSTER_MONTHS = ['2025-04', '2025-05'] as const;

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  spyRet63Pct: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function isClusterMonth(signalDate: string): boolean {
  return (CLUSTER_MONTHS as readonly string[]).includes(monthKey(signalDate));
}

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - lookback]! - 1) * 100));
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function enrichTrades(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => ({
    ...t,
    vix: vixAtDate(vixBars, t.signalDate),
    spyRet63Pct: computeSpyRet63(bundle.spyBars, t.signalDate),
  }));
}

function buildGroupStats(
  groupId: 'cluster' | 'other',
  labelJa: string,
  trades: EnrichedTrade[],
): ForwardMacdDist52ClusterMacroGroupStats {
  const vixVals = trades.map((t) => t.vix).filter((v): v is number => v != null);
  const spyVals = trades.map((t) => t.spyRet63Pct).filter((v): v is number => v != null);
  return {
    groupId,
    labelJa,
    tradeCount: trades.length,
    avgVix: mean(vixVals),
    avgSpyRet63Pct: mean(spyVals),
    avgDist52wPct: mean(trades.map((t) => t.dist52wPct)),
    avgMacdHistPct: mean(trades.map((t) => t.macdHistPct)),
    avgAdx14: mean(trades.map((t) => t.adx14)),
    vixSampleCount: vixVals.length,
    spySampleCount: spyVals.length,
  };
}

function buildCompareRow(
  metricId: ForwardMacdDist52ClusterMacroCompareRow['metricId'],
  labelJa: string,
  unit: string,
  cluster: ForwardMacdDist52ClusterMacroGroupStats,
  other: ForwardMacdDist52ClusterMacroGroupStats,
): ForwardMacdDist52ClusterMacroCompareRow {
  const clusterVal = pickMetric(cluster, metricId);
  const otherVal = pickMetric(other, metricId);
  const delta =
    clusterVal != null && otherVal != null ? round3(clusterVal - otherVal) : null;
  return {
    metricId,
    labelJa,
    unit,
    clusterAvg: clusterVal,
    otherAvg: otherVal,
    deltaClusterMinusOther: delta,
  };
}

function pickMetric(
  g: ForwardMacdDist52ClusterMacroGroupStats,
  metricId: ForwardMacdDist52ClusterMacroCompareRow['metricId'],
): number | null {
  switch (metricId) {
    case 'vix':
      return g.avgVix;
    case 'spy_ret63':
      return g.avgSpyRet63Pct;
    case 'dist52':
      return g.avgDist52wPct;
    case 'macd':
      return g.avgMacdHistPct;
    case 'adx':
      return g.avgAdx14;
    default:
      return null;
  }
}

function formatGroup(g: ForwardMacdDist52ClusterMacroGroupStats): string {
  return [
    `${g.labelJa}（${g.tradeCount}件）`,
    `VIX ${g.avgVix ?? '—'}（n=${g.vixSampleCount}）`,
    `SPY63日 ${g.avgSpyRet63Pct ?? '—'}%（n=${g.spySampleCount}）`,
    `52w ${g.avgDist52wPct ?? '—'}% · MACD ${g.avgMacdHistPct ?? '—'} · ADX ${g.avgAdx14 ?? '—'}`,
  ].join('\n  ');
}

function formatCompare(r: ForwardMacdDist52ClusterMacroCompareRow): string {
  const d =
    r.deltaClusterMinusOther != null
      ? `（クラスター−その他 ${r.deltaClusterMinusOther >= 0 ? '+' : ''}${r.deltaClusterMinusOther}${r.unit}）`
      : '';
  return (
    `${r.labelJa}: 4〜5月 ${r.clusterAvg ?? '—'}${r.unit} vs その他 ${r.otherAvg ?? '—'}${r.unit}${d}`
  );
}

function buildInsight(
  comparisons: ForwardMacdDist52ClusterMacroCompareRow[],
  cluster: ForwardMacdDist52ClusterMacroGroupStats,
  other: ForwardMacdDist52ClusterMacroGroupStats,
): string {
  const lines: string[] = [];
  const spy = comparisons.find((c) => c.metricId === 'spy_ret63');
  const vix = comparisons.find((c) => c.metricId === 'vix');
  const dist = comparisons.find((c) => c.metricId === 'dist52');
  const macd = comparisons.find((c) => c.metricId === 'macd');
  const adx = comparisons.find((c) => c.metricId === 'adx');

  if (cluster.tradeCount > 0 && other.tradeCount === 0) {
    return '4〜5月以外に該当トレードなし。クラスター期のマクロ比較は片側のみ。';
  }

  if (spy?.deltaClusterMinusOther != null && spy.deltaClusterMinusOther < -1) {
    lines.push(
      `SPY63日リターンはクラスター期の方が低い（平均${spy.clusterAvg}% vs ${spy.otherAvg}%）→ 市場はより下落/弱含みのレジームでシグナルが集中。`,
    );
  } else if (spy?.deltaClusterMinusOther != null && spy.deltaClusterMinusOther > 1) {
    lines.push(`SPY63日はクラスター期の方が高い — 強さの主因はSPY上昇ではなさそう。`);
  }

  if (vix?.deltaClusterMinusOther != null && vix.deltaClusterMinusOther > 2) {
    lines.push(
      `VIXはクラスター期が高め（+${vix.deltaClusterMinusOther}）→ 不安・ボラティリティ上昇局面でのディップ買いが多い可能性。`,
    );
  } else if (vix?.deltaClusterMinusOther != null && vix.deltaClusterMinusOther < -2) {
    lines.push(`VIXはクラスター期が低め — パニック型ではなく穏やかな下落局面の可能性。`);
  }

  if (dist?.deltaClusterMinusOther != null && dist.deltaClusterMinusOther < -1) {
    lines.push(
      `52週乖離はクラスター期の方が深い（${dist.clusterAvg}% vs ${dist.otherAvg}%）→ より深い割安で一括シグナル。`,
    );
  }

  if (macd?.deltaClusterMinusOther != null && Math.abs(macd.deltaClusterMinusOther) < 0.05) {
    lines.push(`MACDは両群ほぼ同水準 — 強さの差はMACD閾値付近の微差では説明しにくい。`);
  } else if (macd?.deltaClusterMinusOther != null && macd.deltaClusterMinusOther > 0.1) {
    lines.push(`MACDはクラスター期がやや高い — モメンタム強度が出口+3%到達と相まった可能性。`);
  }

  if (adx?.deltaClusterMinusOther != null && adx.deltaClusterMinusOther > 3) {
    lines.push(`ADXはクラスター期が高い — トレンド強度が利確到達までの日数短縮に寄与した可能性。`);
  }

  lines.push(
    `全${cluster.tradeCount + other.tradeCount}件のうち${cluster.tradeCount}件（${round3((cluster.tradeCount / (cluster.tradeCount + other.tradeCount)) * 100)}%）が4〜5月 — 成績は同期間の複数ETF同日シグナルと+3%利確到達の組み合わせに依存（出口ルールは全期間共通）。`,
  );

  return lines.length > 0 ? lines.join('\n') : '有意な差分パターンは限定的（要個別日確認）。';
}

export function auditMacdDist52ClusterMacro(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52ClusterMacroAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = enrichTrades(input.bundle, passed.trades.filter(matchesMacdDist52));
  const clusterTrades = cohort.filter((t) => isClusterMonth(t.signalDate));
  const otherTrades = cohort.filter((t) => !isClusterMonth(t.signalDate));

  const cluster = buildGroupStats('cluster', '2025年4〜5月クラスタ', clusterTrades);
  const other = buildGroupStats('other', 'それ以外', otherTrades);

  const comparisons: ForwardMacdDist52ClusterMacroCompareRow[] = [
    buildCompareRow('vix', 'VIX', '', cluster, other),
    buildCompareRow('spy_ret63', 'SPY63日リターン', '%', cluster, other),
    buildCompareRow('dist52', '52週乖離', '%', cluster, other),
    buildCompareRow('macd', 'MACD', '', cluster, other),
    buildCompareRow('adx', 'ADX', '', cluster, other),
  ];

  const insightJa = buildInsight(comparisons, cluster, other);
  const vixBars = input.bundle.vixBars ?? [];
  const vixAvailable = vixBars.length > 0;

  const humanLines = [
    `【MACD×52w 4〜5月クラスタ マクロ比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 ${COHORT_LABEL} · ${cohort.length}件（クラスタ ${cluster.tradeCount} / その他 ${other.tradeCount}）`,
    `VIXデータ: ${vixAvailable ? 'あり' : 'なし（^VIX取得失敗）'} · SPY63日=シグナル日のSPY 63営業日リターン`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 4〜5月クラスタ',
    formatGroup(cluster),
    '',
    '■ それ以外',
    formatGroup(other),
    '',
    '■ 平均値比較',
    ...comparisons.map(formatCompare),
    '',
    '■ 4〜5月だけ強かった理由（監査所見）',
    insightJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortLabelJa: COHORT_LABEL,
    cohortTradeCount: cohort.length,
    clusterMonths: [...CLUSTER_MONTHS],
    vixDataAvailable: vixAvailable,
    cluster,
    other,
    comparisons,
    insightJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52ClusterMacroCsv(
  report: ForwardMacdDist52ClusterMacroAuditReport,
): string {
  const header = 'metric,clusterAvg,otherAvg,delta,unit';
  const rows = report.comparisons.map((r) =>
    [r.labelJa, r.clusterAvg ?? '', r.otherAvg ?? '', r.deltaClusterMinusOther ?? '', r.unit].join(','),
  );
  const groupHeader = 'group,tradeCount,avgVix,avgSpyRet63,avgDist52,avgMacd,avgAdx';
  const groupRows = [report.cluster, report.other].map((g) =>
    [
      g.labelJa,
      g.tradeCount,
      g.avgVix ?? '',
      g.avgSpyRet63Pct ?? '',
      g.avgDist52wPct ?? '',
      g.avgMacdHistPct ?? '',
      g.avgAdx14 ?? '',
    ].join(','),
  );
  return [groupHeader, ...groupRows, '', header, ...rows].join('\n');
}
