/**
 * 2025年4月クラスター32件 単独説明力監査 — ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardAdxBucketId,
  ForwardApril2025ClusterExplainerAuditReport,
  ForwardAprilClusterFactorSection,
  ForwardAprilClusterGroupStats,
  ForwardAprilClusterHoldDaysBucketId,
  ForwardDist52BucketId,
  ForwardMacdBucketId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyAdxBucket } from './forwardValidationAdxDist52CrossAudit';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { classifyMacdBucket } from './forwardValidationFourFactorComboAudit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const CLUSTER_MONTH = '2025-04';

const ADX_ORDER: { id: ForwardAdxBucketId; labelJa: string }[] = [
  { id: 'a25_30', labelJa: 'ADX 25-30' },
  { id: 'a30_35', labelJa: 'ADX 30-35' },
  { id: 'a35_40', labelJa: 'ADX 35-40' },
  { id: 'a40_50', labelJa: 'ADX 40-50' },
  { id: 'a50_plus', labelJa: 'ADX 50+' },
];

const MACD_ORDER: { id: ForwardMacdBucketId; labelJa: string }[] = [
  { id: 'm01_02', labelJa: 'MACD 0.1-0.2' },
  { id: 'm02_03', labelJa: 'MACD 0.2-0.3' },
  { id: 'm03_05', labelJa: 'MACD 0.3-0.5' },
  { id: 'm05_plus', labelJa: 'MACD 0.5+' },
];

const DIST52_ORDER: { id: ForwardDist52BucketId; labelJa: string }[] = [
  { id: 'm2_m4', labelJa: '52w -2%～-4%' },
  { id: 'm4_m6', labelJa: '52w -4%～-6%' },
  { id: 'm6_m8', labelJa: '52w -6%～-8%' },
  { id: 'm8_m10', labelJa: '52w -8%～-10%' },
  { id: 'm10_m12', labelJa: '52w -10%～-12%' },
  { id: 'm12_plus', labelJa: '52w -12%以下' },
];

const HOLD_ORDER: { id: ForwardAprilClusterHoldDaysBucketId; labelJa: string }[] = [
  { id: 'h1_7', labelJa: '保有1-7日' },
  { id: 'h8_14', labelJa: '保有8-14日' },
  { id: 'h15_21', labelJa: '保有15-21日' },
  { id: 'h22_25', labelJa: '保有22-25日' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function filterApril2025Cluster(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return trades.filter((t) => t.signalDate.slice(0, 7) === CLUSTER_MONTH);
}

export function classifyHoldDaysBucket(holdDays: number): ForwardAprilClusterHoldDaysBucketId {
  if (holdDays <= 7) return 'h1_7';
  if (holdDays <= 14) return 'h8_14';
  if (holdDays <= 21) return 'h15_21';
  return 'h22_25';
}

function buildGroupStats(labelJa: string, trades: ForwardPassedTradeRecord[]): ForwardAprilClusterGroupStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function spread(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  return round3(Math.max(...nums) - Math.min(...nums));
}

function formatGroup(g: ForwardAprilClusterGroupStats): string {
  if (g.tradeCount === 0) return `${g.labelJa}: 0件`;
  return (
    `${g.labelJa}: ${g.tradeCount}件 · 勝率${g.winRatePct}% · 均R${g.avgReturnPct ?? '—'}% · ` +
    `利確${g.takeProfitRatePct}% · 25日満了${g.maxHoldRatePct}%`
  );
}

function buildFactorSection(
  factorId: ForwardAprilClusterFactorSection['factorId'],
  factorLabelJa: string,
  groups: ForwardAprilClusterGroupStats[],
): ForwardAprilClusterFactorSection {
  const withTrades = groups.filter((g) => g.tradeCount > 0);
  return {
    factorId,
    factorLabelJa,
    groups,
    returnSpreadPct: spread(withTrades.map((g) => g.avgReturnPct)),
    winRateSpreadPct: spread(withTrades.map((g) => g.winRatePct)),
  };
}

function buildProfitDriverInsight(
  overall: ForwardAprilClusterGroupStats,
  sections: ForwardAprilClusterFactorSection[],
): string {
  const ranked = [...sections]
    .filter((s) => s.returnSpreadPct != null && s.returnSpreadPct > 0)
    .sort((a, b) => (b.returnSpreadPct ?? 0) - (a.returnSpreadPct ?? 0));

  const best = ranked[0];
  const bestGroup = best
    ? [...best.groups]
        .filter((g) => g.tradeCount > 0 && g.avgReturnPct != null)
        .sort((a, b) => (b.avgReturnPct ?? 0) - (a.avgReturnPct ?? 0))[0]
    : null;
  const worstGroup = best
    ? [...best.groups]
        .filter((g) => g.tradeCount > 0 && g.avgReturnPct != null)
        .sort((a, b) => (a.avgReturnPct ?? 0) - (b.avgReturnPct ?? 0))[0]
    : null;

  const lines = [
    `クラスター全体: ${overall.tradeCount}件 · 勝率${overall.winRatePct}% · 均R${overall.avgReturnPct ?? '—'}% · 利確${overall.takeProfitRatePct}%`,
  ];

  if (overall.winCount === overall.tradeCount) {
    lines.push('勝敗は全件プラス — 利益の差は「勝率」ではなく均R・利確到達の幅で評価。');
  }

  if (best && bestGroup && worstGroup && best.returnSpreadPct != null) {
    lines.push(
      `均Rのばらつき最大: ${best.factorLabelJa}（スプレッド${best.returnSpreadPct}%）`,
      `  最高: ${bestGroup.labelJa} 均R${bestGroup.avgReturnPct}%（${bestGroup.tradeCount}件）`,
      `  最低: ${worstGroup.labelJa} 均R${worstGroup.avgReturnPct}%（${worstGroup.tradeCount}件）`,
    );
  }

  const holdSection = sections.find((s) => s.factorId === 'holdDays');
  if (holdSection) {
    const tpGroups = holdSection.groups.filter((g) => g.tradeCount > 0 && g.takeProfitRatePct === 100);
    const mhGroups = holdSection.groups.filter((g) => g.tradeCount > 0 && g.maxHoldRatePct === 100);
    if (mhGroups.length > 0) {
      lines.push(`25日満了は${mhGroups.map((g) => g.labelJa).join('・')}に集中 — 利確未到達が利益を押し下げ。`);
    }
    if (tpGroups.some((g) => g.avgReturnPct === 3)) {
      lines.push('利確(+3%)到達群は均R+3%で頭打ち — 利益上限は出口ルールで決定。');
    }
  }

  return lines.join('\n');
}

export function auditApril2025ClusterExplainer(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardApril2025ClusterExplainerAuditReport {
  const passed = auditPassedTrades(input);
  const cluster = filterApril2025Cluster(passed.trades);
  const overall = buildGroupStats('全体', cluster);

  const adxGroups = ADX_ORDER.map((def) => {
    const rows = cluster.filter((t) => classifyAdxBucket(t.adx14) === def.id);
    return buildGroupStats(def.labelJa, rows);
  });
  const macdGroups = MACD_ORDER.map((def) => {
    const rows = cluster.filter((t) => classifyMacdBucket(t.macdHistPct) === def.id);
    return buildGroupStats(def.labelJa, rows);
  });
  const dist52Groups = DIST52_ORDER.map((def) => {
    const rows = cluster.filter((t) => classifyDist52Bucket(t.dist52wPct) === def.id);
    return buildGroupStats(def.labelJa, rows);
  });
  const etfGroups = FORWARD_ETF_UNIVERSE.map((sym) => {
    const rows = cluster.filter((t) => t.symbol === sym);
    return buildGroupStats(sym, rows);
  });
  const holdGroups = HOLD_ORDER.map((def) => {
    const rows = cluster.filter((t) => classifyHoldDaysBucket(t.holdDays) === def.id);
    return buildGroupStats(def.labelJa, rows);
  });

  const sections: ForwardAprilClusterFactorSection[] = [
    buildFactorSection('adx', 'ADX', adxGroups),
    buildFactorSection('macd', 'MACD', macdGroups),
    buildFactorSection('dist52', '52週乖離', dist52Groups),
    buildFactorSection('etf', 'ETF', etfGroups),
    buildFactorSection('holdDays', '保有日数', holdGroups),
  ];

  const profitDriverInsightJa = buildProfitDriverInsight(overall, sections);

  const humanLines = [
    `【2025年4月クラスター 単独説明力監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象: ${CLUSTER_MONTH}シグナル ${cluster.length}件`,
    '',
    `■ 全体\n${formatGroup(overall)}`,
    '',
    '■ 利益ドライバー所見',
    profitDriverInsightJa,
    '',
    ...sections.flatMap((s) => [
      `■ ${s.factorLabelJa}${s.returnSpreadPct != null ? `（均Rスプレッド${s.returnSpreadPct}%）` : ''}`,
      ...s.groups.filter((g) => g.tradeCount > 0).map((g) => formatGroup(g)),
      '',
    ]),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    clusterMonth: CLUSTER_MONTH,
    clusterCount: cluster.length,
    overall,
    sections,
    profitDriverInsightJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatApril2025ClusterExplainerCsv(
  report: ForwardApril2025ClusterExplainerAuditReport,
): string {
  const header =
    'factor,group,tradeCount,winRatePct,avgReturnPct,takeProfitRatePct,maxHoldRatePct';
  const rows: string[] = [header];
  rows.push(
    [
      'overall',
      '全体',
      report.overall.tradeCount,
      report.overall.winRatePct,
      report.overall.avgReturnPct ?? '',
      report.overall.takeProfitRatePct,
      report.overall.maxHoldRatePct,
    ].join(','),
  );
  for (const s of report.sections) {
    for (const g of s.groups.filter((x) => x.tradeCount > 0)) {
      rows.push(
        [
          s.factorId,
          g.labelJa,
          g.tradeCount,
          g.winRatePct,
          g.avgReturnPct ?? '',
          g.takeProfitRatePct,
          g.maxHoldRatePct,
        ].join(','),
      );
    }
  }
  return rows.join('\n');
}
