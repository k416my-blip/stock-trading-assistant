import { StyleSheet, Text, View } from 'react-native';
import type { InstitutionalRiskReport } from '../types/institutionalRisk';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: InstitutionalRiskReport;
  compact?: boolean;
};

export function InstitutionalRiskPanel({ report, compact }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>執行・リスク統制</Text>
      <Text style={styles.subtitle}>段階的エントリー · 出口 · ターンオーバー · リスク予算</Text>

      <View style={styles.kpiRow}>
        <Kpi label="ターンオーバー" value={`${report.turnover.turnoverPct30d}%`} warn={!report.turnover.withinLimit} />
        <Kpi label="現金" value={`${report.cashManagement.currentCashPct}%`} />
        <Kpi label="エクスポージャー" value={`${report.exposureThrottle.currentExposurePct}%`} warn={report.exposureThrottle.blocked} />
      </View>

      <Text style={styles.line}>{report.cashManagement.noteJa}</Text>
      <Text style={styles.line}>{report.exposureThrottle.noteJa}</Text>
      <Text style={styles.line}>{report.riskBudget.noteJa}</Text>

      {report.signalDecay ? (
        <>
          <Text style={styles.section}>シグナル減衰</Text>
          <Text style={[styles.line, report.signalDecay.stale && styles.warn]}>
            スコア {report.signalDecay.score} · {report.signalDecay.labelJa}
          </Text>
        </>
      ) : null}

      {report.entryPlan && report.entryPlan.stages.length > 0 && !compact ? (
        <>
          <Text style={styles.section}>段階的エントリー</Text>
          <Text style={styles.muted}>{report.entryPlan.rationaleJa}</Text>
          {report.entryPlan.stages.map((s) => (
            <Text key={s.stageId} style={styles.stage}>
              {s.labelJa}: {s.shares}株 @ {s.limitPrice} ({s.sharePct}%)
            </Text>
          ))}
        </>
      ) : null}

      {report.transactionCost && !compact ? (
        <>
          <Text style={styles.section}>取引コスト（推定）</Text>
          <Text style={styles.line}>{report.transactionCost.noteJa}</Text>
          <Text style={styles.muted}>
            手数料 RM{report.transactionCost.explicitFeeMYR} + スプレッド RM
            {report.transactionCost.spreadCostEstimateMYR} + スリッページ RM
            {report.transactionCost.slippageEstimateMYR}
          </Text>
        </>
      ) : null}

      {report.exitRecommendations.some((e) => e.active) ? (
        <>
          <Text style={styles.section}>出口シグナル</Text>
          {report.exitRecommendations
            .filter((e) => e.active)
            .map((e) => (
              <View key={e.triggerId} style={styles.exitItem}>
                <Text style={styles.exitTitle}>{e.labelJa}</Text>
                <Text style={styles.muted}>{e.suggestedActionJa}</Text>
              </View>
            ))}
        </>
      ) : null}

      {report.rebalancePlan && !compact && report.rebalancePlan.actions.length > 0 ? (
        <>
          <Text style={styles.section}>リバランス（推奨）</Text>
          <Text style={styles.muted}>{report.rebalancePlan.rationaleJa}</Text>
          {report.rebalancePlan.actions.slice(0, 5).map((a) => (
            <Text key={a.symbol} style={styles.stage}>
              {a.symbol}: {a.action} Δ{a.deltaWeightPct}% → 目標 {a.targetWeightPct}%
            </Text>
          ))}
        </>
      ) : null}
    </Card>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiVal, warn && styles.warn]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  kpi: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  kpiLabel: { color: theme.colors.textMuted, fontSize: 10 },
  kpiVal: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: 4,
  },
  line: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  stage: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  exitItem: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  exitTitle: { color: theme.colors.warning, fontWeight: '600', fontSize: theme.fontSize.sm },
  warn: { color: theme.colors.warning },
});
