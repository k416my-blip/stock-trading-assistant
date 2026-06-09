import { StyleSheet, Text, View } from 'react-native';
import type { ForwardAdxAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdxAuditReport | null;
  loading?: boolean;
};

export function ForwardAdxAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>ADX詳細監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>ADX詳細監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const maxCount = Math.max(...report.distribution.map((b) => b.count), 1);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ADX詳細監査</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · 評価 {report.totalEvaluations}件
      </Text>

      <Text style={styles.section}>ADX分布（全期間）</Text>
      {report.distribution.map((b) => (
        <View key={b.label} style={styles.barRow}>
          <Text style={styles.barLabel}>{b.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(b.count / maxCount) * 100}%` }]} />
          </View>
          <Text style={styles.barVal}>
            {b.count} ({b.pct}%)
          </Text>
        </View>
      ))}

      <View style={styles.kpiRow}>
        <Kpi
          label={`ADX不足 ${report.adxPrimaryFailCount}件`}
          value={report.adxPrimaryFailMean != null ? `均 ${report.adxPrimaryFailMean}` : '—'}
        />
        <Kpi
          label={`適合 ${report.passedCount}件`}
          value={report.passedMean != null ? `均 ${report.passedMean}` : '—'}
        />
      </View>

      <Text style={styles.section}>ETF別 ADX平均</Text>
      {report.perEtf.map((e) => (
        <Text key={e.symbol} style={styles.etfLine}>
          {e.symbol}: 全期 {e.adxMeanAll ?? '—'} · ADX失格 {e.adxFailCount}件(均{e.adxFailMean ?? '—'}) ·
          適合 {e.passedCount}件(均{e.passedMean ?? '—'})
        </Text>
      ))}

      <Text style={styles.section}>レポート</Text>
      <Text style={styles.reportBody}>{report.humanSummaryJa}</Text>
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

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  barLabel: { width: 36, color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: theme.colors.primary },
  barVal: { width: 72, textAlign: 'right', color: theme.colors.text, fontSize: theme.fontSize.xs },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  kpi: { flex: 1 },
  kpiLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  kpiVal: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  etfLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  reportBody: { color: theme.colors.text, fontSize: theme.fontSize.xs, lineHeight: 18, fontFamily: 'monospace' },
});
