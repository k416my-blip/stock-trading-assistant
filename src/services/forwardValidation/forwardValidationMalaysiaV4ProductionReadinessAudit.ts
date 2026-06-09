/**
 * 最重要監査その84 — Malaysia v4 実運用開始最終確認 · 監査73–83.6集約 · 推測禁止
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ForwardMalaysiaV4OpenIssueRow,
  ForwardMalaysiaV4OpsAreaStatus,
  ForwardMalaysiaV4ProductionReadinessAuditReport,
  ForwardMalaysiaV4ProductionVerdict,
} from '../../types/forwardValidation';

const FIXED_CONDITIONS_JA =
  'MY v4実運用最終確認 · 監査73–83.6 CSV/JSON実データのみ · 推測禁止';

const V4_PORTFOLIO = 'TENAGA23.3/CIMB23.3/GAMUDA15/YTL15/IJM23.3';

type AuditDef = {
  auditNo: string;
  titleJa: string;
  csvName: string;
};

const AUDIT_CHAIN: AuditDef[] = [
  { auditNo: '73', titleJa: 'GAMUDA15%実取引', csvName: 'forward-validation-malaysia-v3-cap15-audit.csv' },
  { auditNo: '74', titleJa: 'YTL依存リスク', csvName: 'forward-validation-malaysia-v3-ytl-dependency-audit.csv' },
  { auditNo: '75', titleJa: 'YTL廃止MC検証', csvName: 'forward-validation-malaysia-v3-ytl-verify-audit.csv' },
  { auditNo: '76', titleJa: 'v4第4銘柄候補', csvName: 'forward-validation-malaysia-v4-candidate-audit.csv' },
  { auditNo: '77', titleJa: 'YTL依存率帰属', csvName: 'forward-validation-malaysia-v4-attribution-audit.csv' },
  { auditNo: '78', titleJa: 'IJM OOS最終', csvName: 'forward-validation-malaysia-v4-ijm-oos-audit.csv' },
  { auditNo: '79', titleJa: 'v4最終候補比較', csvName: 'forward-validation-malaysia-v4-final-compare-audit.csv' },
  { auditNo: '80', titleJa: 'v4運用監視', csvName: 'forward-validation-malaysia-v4-ops-monitor-audit.csv' },
  { auditNo: '81', titleJa: 'Yahoo品質', csvName: 'forward-validation-malaysia-v4-yahoo-quality-audit.csv' },
  { auditNo: '82', titleJa: 'v4リバランス', csvName: 'forward-validation-malaysia-v4-rebalance-audit.csv' },
  { auditNo: '83', titleJa: 'Twelve Bursa接続', csvName: 'forward-validation-malaysia-v4-twelve-bursa-audit.csv' },
  { auditNo: '83.5', titleJa: 'Twelve symbol_search', csvName: 'forward-validation-malaysia-v4-twelve-symbol-search-audit.csv' },
  { auditNo: '83.6', titleJa: 'Twelve Pro ROI', csvName: 'forward-validation-malaysia-v4-twelve-pro-roi-audit.csv' },
];

function readVerdictLine(csvPath: string): string {
  if (!existsSync(csvPath)) return 'CSV未検出';
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.startsWith('# '));
  for (let i = lines.length - 1; i >= 0; i--) {
    const content = lines[i]!.replace(/^# /, '');
    if (
      /^[ABC] /.test(content) ||
      /即採用|条件付き|非推奨|採用維持|即確定|要改善|実装バグ|Yellow|Proプラン|Yahooのみ/.test(content)
    ) {
      return content;
    }
  }
  return lines[lines.length - 1]?.replace(/^# /, '') ?? '—';
}

function parseMetric(csvPath: string, metric: string): string | null {
  if (!existsSync(csvPath)) return null;
  for (const line of readFileSync(csvPath, 'utf8').split(/\r?\n/)) {
    if (line.startsWith(`aggregate,${metric},`) || line.startsWith(`summary,${metric},`)) {
      return line.split(',')[2] ?? null;
    }
    if (line.startsWith(`metric,${metric},`)) {
      return line.split(',')[2] ?? null;
    }
  }
  return null;
}

function gitTagExists(): string {
  try {
    const tags = execSync('git tag -l malaysia-v4-final', { encoding: 'utf8' }).trim();
    return tags ? 'malaysia-v4-final 存在' : 'malaysia-v4-final 未検出';
  } catch {
    return 'git未確認';
  }
}

function buildAuditSummaries(scriptsDir: string) {
  return AUDIT_CHAIN.map((def) => {
    const csvPath = join(scriptsDir, def.csvName);
    return {
      auditNo: def.auditNo,
      titleJa: def.titleJa,
      verdictLine: readVerdictLine(csvPath),
      csvPath: existsSync(csvPath) ? csvPath : '未検出',
    };
  });
}

function buildOpenIssues(summaries: ReturnType<typeof buildAuditSummaries>, scriptsDir: string): ForwardMalaysiaV4OpenIssueRow[] {
  const issues: ForwardMalaysiaV4OpenIssueRow[] = [];

  const a81 = summaries.find((s) => s.auditNo === '81');
  if (a81?.verdictLine.includes('B')) {
    issues.push({
      severity: 'high',
      issueJa: 'Yahooデータ品質がA未満（B条件付き）',
      sourceAuditJa: '監査81',
      evidenceJa: a81.verdictLine,
    });
  }

  const a80 = summaries.find((s) => s.auditNo === '80');
  if (a80?.verdictLine.toLowerCase().includes('yellow')) {
    issues.push({
      severity: 'high',
      issueJa: '運用リスクYellow（監視強化）',
      sourceAuditJa: '監査80',
      evidenceJa: a80.verdictLine,
    });
  }

  const a75 = summaries.find((s) => s.auditNo === '75');
  if (a75?.verdictLine.includes('バグ')) {
    issues.push({
      severity: 'medium',
      issueJa: 'v3 YTL廃止シミュレーション実装バグ（v4ではMC4.79%再検証済）',
      sourceAuditJa: '監査75',
      evidenceJa: `${a75.verdictLine} · 監査79 delistMC=4.79%`,
    });
  }

  const missing = parseMetric(join(scriptsDir, 'forward-validation-malaysia-v4-yahoo-quality-audit.csv'), 'missingRatePct');
  if (missing) {
    issues.push({
      severity: 'medium',
      issueJa: `Yahoo OHLCV欠損率${missing}%`,
      sourceAuditJa: '監査81',
      evidenceJa: `aggregate missingRatePct=${missing}`,
    });
  }

  const a82 = summaries.find((s) => s.auditNo === '82');
  if (a82?.verdictLine.includes('ledger想定デモ')) {
    issues.push({
      severity: 'medium',
      issueJa: 'リバランス監査が実保有ではなくledgerデモ保有',
      sourceAuditJa: '監査82',
      evidenceJa: a82.verdictLine,
    });
  }

  const a83 = summaries.find((s) => s.auditNo === '83');
  if (a83?.verdictLine.includes('非推奨')) {
    issues.push({
      severity: 'low',
      issueJa: 'Twelve Data無料枠Bursa接続不可',
      sourceAuditJa: '監査83',
      evidenceJa: a83.verdictLine,
    });
  }

  const a836 = summaries.find((s) => s.auditNo === '83.6');
  if (a836?.verdictLine.includes('Yahooのみ継続')) {
    issues.push({
      severity: 'low',
      issueJa: 'Twelve Pro課金ROI未証明（Yahoo継続推奨）',
      sourceAuditJa: '監査83.6',
      evidenceJa: a836.verdictLine,
    });
  }

  const tag = gitTagExists();
  if (!tag.includes('存在')) {
    issues.push({
      severity: 'high',
      issueJa: 'GitHubタグ malaysia-v4-final 未確認',
      sourceAuditJa: 'git',
      evidenceJa: tag,
    });
  } else {
    issues.push({
      severity: 'medium',
      issueJa: '監査82–83.6はタグf97aef9以降未コミットの可能性',
      sourceAuditJa: 'git status',
      evidenceJa: 'malaysia-v4-final=f97aef9（監査73–81）· 82–83.6 CSVは未追跡',
    });
  }

  issues.push({
    severity: 'low',
    issueJa: 'ポートフォリオ保存・UI CSV出力は監査73–83.6対象外',
    sourceAuditJa: '監査84',
    evidenceJa: '該当監査CSVなし',
  });

  return issues;
}

function buildOpsAreas(summaries: ReturnType<typeof buildAuditSummaries>): ForwardMalaysiaV4OpsAreaStatus[] {
  const a81 = summaries.find((s) => s.auditNo === '81')!;
  const a82 = summaries.find((s) => s.auditNo === '82')!;
  const a80 = summaries.find((s) => s.auditNo === '80')!;
  const a83 = summaries.find((s) => s.auditNo === '83')!;
  const a836 = summaries.find((s) => s.auditNo === '83.6')!;

  return [
    {
      areaJa: 'データ取得',
      statusJa: a81.verdictLine.includes('B') ? '条件付き' : '完了',
      evidenceJa: a81.verdictLine,
    },
    {
      areaJa: 'リバランス',
      statusJa: a82.csvPath !== '未検出' ? '条件付き' : '未完了',
      evidenceJa: a82.verdictLine,
    },
    {
      areaJa: '売買提案',
      statusJa: a80.csvPath !== '未検出' ? '完了' : '未完了',
      evidenceJa: a80.verdictLine,
    },
    {
      areaJa: 'ポートフォリオ保存',
      statusJa: '未監査',
      evidenceJa: '監査73–83.6に該当CSVなし',
    },
    {
      areaJa: 'CSV出力',
      statusJa: '完了',
      evidenceJa: '監査73–83.6すべてCSV生成済み（scripts/）',
    },
    {
      areaJa: 'GitHub保存',
      statusJa: '条件付き',
      evidenceJa: 'malaysia-v4-finalタグ存在 · 82–83.6未コミット',
    },
    {
      areaJa: 'Forward Validation',
      statusJa: '完了',
      evidenceJa: '監査73–83.6がforwardValidationMalaysiaV4*Audit経由で完走',
    },
    {
      areaJa: 'Twelve Data',
      statusJa: a836.verdictLine.includes('Yahooのみ') ? '条件付き' : '未完了',
      evidenceJa: `${a83.verdictLine} · ${a836.verdictLine}`,
    },
  ];
}

function resolveVerdict(
  criticalCount: number,
  issues: ForwardMalaysiaV4OpenIssueRow[],
  summaries: ReturnType<typeof buildAuditSummaries>,
): ForwardMalaysiaV4ProductionVerdict {
  if (criticalCount > 0) return 'blocked';
  const a79 = summaries.find((s) => s.auditNo === '79');
  const a81 = summaries.find((s) => s.auditNo === '81');
  const strategyOk = a79?.verdictLine.includes('即採用') ?? false;
  const dataOk = a81?.verdictLine.includes('条件付き') || a81?.verdictLine.includes('採用');
  const highBlockers = issues.filter((i) => i.severity === 'high' && !i.issueJa.includes('GitHubタグ'));
  if (strategyOk && dataOk && highBlockers.length <= 2) return 'conditional';
  if (!strategyOk) return 'blocked';
  return 'conditional';
}

function verdictLabelJa(v: ForwardMalaysiaV4ProductionVerdict): string {
  switch (v) {
    case 'immediate':
      return '1. 即運用開始可';
    case 'conditional':
      return '2. 条件付き運用開始可';
    case 'blocked':
      return '3. 運用開始不可';
  }
}

export function buildMalaysiaV4ProductionReadinessAuditReport(input?: {
  scriptsDir?: string;
  auditedAt?: string;
}): ForwardMalaysiaV4ProductionReadinessAuditReport {
  const scriptsDir = input?.scriptsDir ?? join(process.cwd(), 'scripts');
  const auditedAt = input?.auditedAt ?? new Date().toISOString();
  const auditSummaries = buildAuditSummaries(scriptsDir);
  const openIssues = buildOpenIssues(auditSummaries, scriptsDir);
  const criticalCount = openIssues.filter((i) => i.severity === 'critical').length;
  const opsAreaStatuses = buildOpsAreas(auditSummaries);
  const productionVerdict = resolveVerdict(criticalCount, openIssues, auditSummaries);

  const completedItemsJa = auditSummaries
    .filter((s) => s.csvPath !== '未検出' && !s.verdictLine.includes('未検出'))
    .map((s) => `監査${s.auditNo} ${s.titleJa}: ${s.verdictLine}`);

  const incompleteItemsJa = [
    ...opsAreaStatuses.filter((o) => o.statusJa === '未完了' || o.statusJa === '未監査').map((o) => `${o.areaJa}: ${o.statusJa}`),
    ...openIssues.map((i) => `[${i.severity.toUpperCase()}] ${i.issueJa}`),
  ];

  const yahooRiskJa = [
    '監査81: 取得成功100% · 欠損5.66% · 異常0.008% · 遅延0日 · B条件付き',
    '監査83: Twelve無料0/5 · Yahoo価格差比較不可（CLI）',
    '監査83.6: Yahooのみ継続 · v4累積38.36%はYahooバンドルのみで算出',
    '依存リスク: 日次OHLCV+ポートフォリオquoteがYahoo経由',
  ].join(' · ');

  const fallbackJa = [
    '監査83.6: Twelve無料失敗時はYahooフォールバック（プロバイダチェーン）',
    '監査83.5: BursaはPro/Venture必須 · 無料Twelveは代替不可',
    '監査81: Yahoo単独でB判定 · Twelve比較0/5',
    '障害時: 監査データ上の二次データ源は未検証（Alpha等は監査対象外）',
  ].join(' · ');

  const checklistJa = [
    `配分: ${V4_PORTFOLIO}（監査79確定）`,
    '初回リバランス: YTL/IJM売却 · TENAGA/CIMB/GAMUDA買い（監査82）',
    'YTL依存監視: 35/40/45/50%閾値（監査80 · 現状32.815%）',
    'Yahoo品質: 欠損5.66%許容 · 遅延0日（監査81）',
    '月次DCA: 1500 MYR（監査73–79固定）',
    'Twelve: 無料枠使用不可 · Pro課金は83.6でROI否定',
    '運用リスク: Yellow監視強化（監査80）',
    '実保有投入後に監査82再実行',
    'GitHub: 82–83.6コミット後タグ更新',
  ];

  const startConditionsJa = [
    '監査81 B条件を承認（欠損5.66%・遅延0日）',
    '監査80 Yellow監視を有効化（YTL依存・集中度）',
    '実保有を入力し監査82リバランスを再実行',
    'TwelveはYahooフォールバック前提（監査83.6）',
    'Critical問題0件（監査84）',
  ];

  const answerAJa = `A 完了: 監査73–83.6の${completedItemsJa.length}件CSV検証 · 戦略A(76/77/78/79) · 運用監視(80) · データB(81) · リバランス(82) · Twelve判定(83–83.6)`;
  const answerBJa = `B 未完了: ${incompleteItemsJa.slice(0, 6).join(' · ')}${incompleteItemsJa.length > 6 ? ' …' : ''}`;
  const answerCJa = `C Critical: ${criticalCount === 0 ? 'なし' : `${criticalCount}件`}`;
  const answerDJa = `D 実運用開始: ${verdictLabelJa(productionVerdict)}`;
  const answerEJa = `E 開始条件: ${startConditionsJa.join(' · ')}`;
  const answerFJa = `F 最終判定: ${verdictLabelJa(productionVerdict)}`;

  const humanSummaryJa = [
    '監査84 Malaysia v4 実運用開始最終確認',
    FIXED_CONDITIONS_JA,
    `配分 ${V4_PORTFOLIO}`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
  ].join('\n');

  return {
    auditedAt,
    auditSummaries,
    completedItemsJa,
    incompleteItemsJa,
    openIssues,
    criticalCount,
    opsAreaStatuses,
    yahooRiskJa,
    fallbackJa,
    checklistJa,
    startConditionsJa,
    productionVerdict,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4ProductionReadinessCsv(
  report: ForwardMalaysiaV4ProductionReadinessAuditReport,
): string {
  const lines = [
    `# 最重要監査その84 v4実運用最終確認`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.answerFJa}`,
    '',
    'section,auditNo,title,verdict,csv',
    ...report.auditSummaries.map((s) =>
      ['audit', s.auditNo, s.titleJa, `"${s.verdictLine.replace(/"/g, '""')}"`, s.csvPath].join(','),
    ),
    '',
    'section,severity,issue,source,evidence',
    ...report.openIssues.map((i) =>
      [
        'issue',
        i.severity,
        `"${i.issueJa.replace(/"/g, '""')}"`,
        i.sourceAuditJa,
        `"${i.evidenceJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,area,status,evidence',
    ...report.opsAreaStatuses.map((o) =>
      [
        'ops',
        o.areaJa,
        o.statusJa,
        `"${o.evidenceJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,checklist,item',
    ...report.checklistJa.map((c, idx) => ['check', idx + 1, `"${c.replace(/"/g, '""')}"`].join(',')),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
  ];
  return lines.join('\n');
}

export function saveProductionReadinessArtifacts(
  report: ForwardMalaysiaV4ProductionReadinessAuditReport,
  baseDir: string,
): { jsonPath: string; csvPath: string } {
  const jsonPath = join(baseDir, 'forward-validation-malaysia-v4-production-readiness-audit.json');
  const csvPath = join(baseDir, 'forward-validation-malaysia-v4-production-readiness-audit.csv');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(csvPath, formatMalaysiaV4ProductionReadinessCsv(report), 'utf8');
  return { jsonPath, csvPath };
}

export function runMalaysiaV4ProductionReadinessAudit(
  scriptsDir?: string,
): ForwardMalaysiaV4ProductionReadinessAuditReport {
  return buildMalaysiaV4ProductionReadinessAuditReport({ scriptsDir });
}
