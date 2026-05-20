import { StyleSheet, Text, View } from 'react-native';
import type { HistoricalValidationReport } from '../types/historicalSimulation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: HistoricalValidationReport;
};

export function HistoricalValidationPanel({ report }: Props) {
  const r = report.riskMetrics;
  const wf = report.walkForward;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>歴史シミュレーション・検証</Text>
      <Text style={styles.subtitle}>
        {report.tradingDays}営業日 · ユニバース {report.universeSize}銘柄 · ウォークフォワード
      </Text>

      <View
        style={[
          styles.verdict,
          report.improvesRiskAdjustedPreservation ? styles.verdictOk : styles.verdictWarn,
        ]}
      >
        <Text style={styles.verdictText}>{report.validationVerdictJa}</Text>
      </View>

      <Text style={styles.section}>リスク調整メトリクス</Text>
      <View style={styles.kpiRow}>
        <Kpi label="Sharpe" value={String(r.sharpe)} sub={`BM ${r.benchmarkSharpe}`} />
        <Kpi label="Sortino" value={String(r.sortino)} />
        <Kpi label="Calmar" value={String(r.calmar)} sub={`BM ${r.benchmarkCalmar}`} />
      </View>
      <Text style={styles.line}>
        年率リターン {r.annualizedReturnPct}% · ボラ {r.annualizedVolPct}%
      </Text>

      <Text style={styles.section}>最大ドローダウン</Text>
      <Text style={styles.line}>
        システム {report.maxDrawdown.maxDrawdownPct}%（{report.maxDrawdown.troughDate}）· 回復{' '}
        {report.maxDrawdown.recoveryDays}日
      </Text>
      <Text style={styles.line}>ベンチマーク {report.maxDrawdown.benchmarkMaxDrawdownPct}%</Text>

      <Text style={styles.section}>ウォークフォワード</Text>
      <Text style={styles.line}>
        {wf.windowCount}窓 · ヒット率 {wf.hitRatePct}% · 平均α {(
          wf.avgSystemReturnPct - wf.avgBenchmarkReturnPct
        ).toFixed(2)}%
      </Text>
      <Text style={styles.muted}>
        システム {wf.avgSystemReturnPct}% vs BM {wf.avgBenchmarkReturnPct}%
      </Text>

      <Text style={styles.section}>ストレス期間</Text>
      {report.stressTests.map((s) => (
        <View key={s.id} style={styles.stressRow}>
          <Text style={styles.stressLabel}>{s.labelJa}</Text>
          <Text style={styles.stressVal}>
            {s.slippageAdjustedReturnPct}% (DD {s.maxDrawdownPct}%)
          </Text>
        </View>
      ))}

      <Text style={styles.section}>ターンオーバー影響</Text>
      <Text style={styles.line}>{report.turnoverImpact.noteJa}</Text>
      <Text style={styles.muted}>
        総リターン {report.turnoverImpact.grossReturnPct}% → ネット{' '}
        {report.turnoverImpact.netReturnPct}%（ドラッグ {report.turnoverImpact.turnoverDragPct}%）
      </Text>

      <Text style={styles.section}>レジーム別パフォーマンス</Text>
      {report.regimePerformance.slice(0, 5).map((row) => (
        <Text key={row.regimeId} style={styles.muted}>
          {row.labelJa}: {row.returnPct}% · {row.days}日
        </Text>
      ))}

      <Text style={styles.section}>ファクター寄与</Text>
      {report.factorAttribution.map((f) => (
        <Text key={f.factor} style={styles.muted}>
          {f.labelJa}: {f.contributionPct}%
        </Text>
      ))}

      <Text style={styles.section}>サバイバル分析</Text>
      <Text style={styles.line}>{report.survivalAnalysis.noteJa}</Text>
      <Text style={styles.muted}>
        正リターン窓 {report.survivalAnalysis.windowsSurvivedPct}% · BM超過{' '}
        {report.survivalAnalysis.beatBenchmarkPct}% · 連続損失窓最大{' '}
        {report.survivalAnalysis.maxConsecutiveLossWindows}
      </Text>

      {report.exposureHeatTimeline.length > 0 ? (
        <>
          <Text style={styles.section}>エクスポージャー・ヒート（時系列）</Text>
          {report.exposureHeatTimeline.slice(-3).map((p) => (
            <Text key={p.date} style={styles.muted}>
              {p.date}: 総エクスポージャー {p.grossExposurePct}%
              {p.sectorWeights.length > 0
                ? ` · ${p.sectorWeights
                    .slice(0, 3)
                    .map((s) => `${s.sector} ${s.weightPct}%`)
                    .join(', ')}`
                : ''}
            </Text>
          ))}
        </>
      ) : null}
    </Card>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiVal}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  verdict: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  verdictOk: { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderWidth: 1, borderColor: theme.colors.success },
  verdictWarn: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: theme.colors.warning },
  verdictText: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: 4,
  },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  kpi: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  kpiLabel: { color: theme.colors.textMuted, fontSize: 10 },
  kpiVal: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  kpiSub: { color: theme.colors.textMuted, fontSize: 9 },
  line: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  stressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  stressLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, flex: 1 },
  stressVal: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
});
