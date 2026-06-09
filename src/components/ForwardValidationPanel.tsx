import { StyleSheet, Text, View } from 'react-native';
import {
  FORWARD_BACKTEST_BASELINE,
  FORWARD_REPORT_MILESTONES,
} from '../constants/forwardValidation';
import type {
  ForwardBaselineComparison,
  ForwardPerformanceMetrics,
  ForwardSignalRecord,
  ForwardValidationAuditResult,
  ForwardValidationReport,
  ForwardYahooFetchLog,
} from '../types/forwardValidation';
import { formatAuditStatusJa } from '../services/forwardValidation/forwardValidationAudit';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  metrics: ForwardPerformanceMetrics;
  comparison: ForwardBaselineComparison;
  reports: ForwardValidationReport[];
  lastRunDate: string | null;
  lastRunAt: string | null;
  lastFetchAt: string | null;
  yahooLatestDate: string | null;
  fetchLog: ForwardYahooFetchLog | null;
  symbolLatestDates: Record<string, string>;
  recentSignals: ForwardSignalRecord[];
  audit: ForwardValidationAuditResult | null;
  displayNow: string;
  loading?: boolean;
  compact?: boolean;
};

export function ForwardValidationPanel({
  metrics,
  comparison,
  reports,
  lastRunDate,
  lastRunAt,
  lastFetchAt,
  yahooLatestDate,
  fetchLog,
  symbolLatestDates,
  recentSignals,
  audit,
  displayNow,
  loading,
  compact,
}: Props) {
  const bt = FORWARD_BACKTEST_BASELINE;
  const d = comparison.delta;
  const futureSignals = recentSignals.filter((s) => s.date > displayNow.slice(0, 10));

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>4ETF 前向き検証</Text>
      <Text style={styles.subtitle}>
        SCHD · VYM · DGRO · SPLG · 仮想資金 $10,000 · 確定ルール固定
      </Text>

      {loading ? <Text style={styles.muted}>市場データ取得・日次判定中…</Text> : null}

      {!compact ? (
        <>
          <Text style={styles.section}>リアルタイム監視</Text>
          <Text style={styles.line}>現在日時: {fmtIso(displayNow)}</Text>
          <Text style={styles.line}>最終取得日時: {fmtIso(lastFetchAt)}</Text>
          <Text style={styles.line}>最終判定日時: {fmtIso(lastRunAt)}</Text>
          <Text style={styles.line}>
            最終判定日: {lastRunDate ?? '—'}{' '}
            <Text style={styles.muted}>(Yahoo union最新={yahooLatestDate ?? '—'})</Text>
          </Text>
          {fetchLog ? (
            <Text style={styles.line}>
              Yahoo取得成功: {fetchLog.successCount}/{fetchLog.symbols.length} · 失敗{' '}
              {fetchLog.failureCount}
            </Text>
          ) : null}
          {Object.keys(symbolLatestDates).length > 0 ? (
            <Text style={styles.muted}>
              銘柄別最新:{' '}
              {Object.entries(symbolLatestDates)
                .map(([k, v]) => `${k}=${v}`)
                .join(' · ')}
            </Text>
          ) : null}
          {fetchLog?.symbols.some((s) => !s.ok) ? (
            <>
              <Text style={styles.warnTitle}>Yahoo取得失敗ログ</Text>
              {fetchLog.symbols
                .filter((s) => !s.ok)
                .map((s) => (
                  <Text key={s.symbol} style={styles.errorLine}>
                    {s.symbol}: {s.httpStatus != null ? `HTTP ${s.httpStatus}` : '—'} · {s.error}
                  </Text>
                ))}
            </>
          ) : null}
        </>
      ) : null}

      <Text style={styles.section}>実運用成績（仮想PF）</Text>
      <View style={styles.kpiRow}>
        <Kpi label="Sharpe" value={fmt(metrics.sharpe)} />
        <Kpi label="MaxDD" value={metrics.maxDrawdownPct != null ? `${metrics.maxDrawdownPct}%` : '—'} />
        <Kpi label="PF" value={fmt(metrics.profitFactor)} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi
          label="勝率"
          value={metrics.winRate != null ? `${Math.round(metrics.winRate * 1000) / 10}%` : '—'}
        />
        <Kpi
          label="累積R"
          value={metrics.totalReturnPct != null ? `${metrics.totalReturnPct}%` : '—'}
        />
        <Kpi label="資産" value={`$${metrics.equityUsd.toLocaleString('en-US')}`} />
      </View>
      <Text style={styles.line}>
        確定 {metrics.closedTradeCount}件 · オープン {metrics.openPositionCount}件
      </Text>

      <Text style={styles.section}>バックテストとの差異</Text>
      <Text style={styles.line}>
        Sharpe {fmt(metrics.sharpe)} vs {bt.sharpe} (Δ {fmtDelta(d.sharpe)})
      </Text>
      <Text style={styles.line}>
        MaxDD {fmtPct(metrics.maxDrawdownPct)} vs {bt.maxDrawdownPct}% (Δ {fmtDelta(d.maxDrawdownPct, '%')})
      </Text>
      <Text style={styles.line}>
        PF {fmt(metrics.profitFactor)} vs {bt.profitFactor} (Δ {fmtDelta(d.profitFactor)})
      </Text>
      <Text style={styles.line}>
        勝率 {fmtWin(metrics.winRate)} vs {Math.round(bt.winRate * 1000) / 10}% (Δ{' '}
        {d.winRate != null ? `${Math.round(d.winRate * 1000) / 10}pt` : '—'})
      </Text>
      <Text style={styles.muted}>{bt.labelJa}（比較専用・トレード非流用）</Text>

      {reports.length > 0 ? (
        <>
          <Text style={styles.section}>マイルストーンレポート</Text>
          {reports.map((report) => (
            <View key={report.triggerTradeCount} style={styles.reportBox}>
              <Text style={styles.reportTitle}>{report.triggerTradeCount}トレード到達</Text>
              <Text style={styles.reportBody}>{report.summaryJa}</Text>
              <Text style={styles.muted}>生成: {report.generatedAt.slice(0, 19).replace('T', ' ')} UTC</Text>
            </View>
          ))}
        </>
      ) : metrics.closedTradeCount > 0 ? (
        <Text style={styles.muted}>
          次レポート:{' '}
          {FORWARD_REPORT_MILESTONES.find((m) => m > metrics.closedTradeCount) ?? '—'} トレード
        </Text>
      ) : null}

      {recentSignals.length > 0 ? (
        <>
          <Text style={styles.section}>直近シグナル</Text>
          {futureSignals.length > 0 ? (
            <Text style={styles.errorLine}>⚠ 未来日シグナル {futureSignals.length} 件検出</Text>
          ) : null}
          {recentSignals.slice(0, 8).map((s) => (
            <Text key={s.id} style={styles.signalRow}>
              {s.date} {s.symbol} · ADX {s.adx14} · MACD {s.macdHistPct}% ·{' '}
              {s.entryPrice != null ? `$${s.entryPrice.toFixed(2)}` : '待機'} · {s.status}
            </Text>
          ))}
        </>
      ) : null}

      {audit ? (
        <>
          <Text style={styles.section}>監査サマリー</Text>
          <Text style={styles.muted}>{audit.storageSummaryJa}</Text>
          {audit.findings.map((f) => (
            <View key={f.id} style={styles.auditRow}>
              <Text
                style={[
                  styles.auditBadge,
                  f.status === 'pass' ? styles.auditPass : f.status === 'warn' ? styles.auditWarn : styles.auditFail,
                ]}
              >
                {formatAuditStatusJa(f.status)}
              </Text>
              <View style={styles.auditBody}>
                <Text style={styles.auditLabel}>{f.labelJa}</Text>
                <Text style={styles.muted}>{f.detailJa}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiVal}>{value}</Text>
    </View>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n}%`;
}

function fmtDelta(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}${suffix}`;
}

function fmtWin(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

function fmtSignedPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}%`;
}

function fmtIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 19).replace('T', ' ') + ' UTC';
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  kpi: { flex: 1 },
  kpiLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  kpiVal: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
  errorLine: { color: theme.colors.danger, fontSize: theme.fontSize.xs, lineHeight: 18 },
  warnTitle: { color: theme.colors.warning, fontSize: theme.fontSize.xs, fontWeight: '600', marginTop: 6 },
  reportBox: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
  },
  reportTitle: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.fontSize.sm },
  reportBody: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 6, lineHeight: 18 },
  signalRow: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  auditRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  auditBadge: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  auditPass: { backgroundColor: '#14532d', color: theme.colors.success },
  auditWarn: { backgroundColor: '#78350f', color: theme.colors.warning },
  auditFail: { backgroundColor: '#7f1d1d', color: theme.colors.danger },
  auditBody: { flex: 1 },
  auditLabel: { color: theme.colors.text, fontSize: theme.fontSize.xs, fontWeight: '600' },
});
