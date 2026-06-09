import { StyleSheet, Text, View } from 'react-native';
import type { ForwardConditionBlockAuditReport, ForwardConditionBlockPeriodStats } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardConditionBlockAuditReport | null;
  loading?: boolean;
};

export function ForwardConditionBlockAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>条件別失格率監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>条件別失格率監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>条件別失格率監査</Text>
      <Text style={styles.subtitle}>第一失格原因（相互排他）· ルール変更なし</Text>

      <PeriodBlock title={`全期間 ${report.fullPeriod.fromDate} ～ ${report.fullPeriod.toDate}`} stats={report.fullPeriod} />
      <PeriodBlock
        title={`期間限定 ${report.gapPeriod.fromDate} ～ ${report.gapPeriod.toDate}`}
        stats={report.gapPeriod}
      />

      <Text style={styles.section}>サマリー</Text>
      <Text style={styles.reportBody}>{report.humanSummaryJa}</Text>
    </Card>
  );
}

function PeriodBlock({ title, stats }: { title: string; stats: ForwardConditionBlockPeriodStats }) {
  return (
    <View style={styles.periodBox}>
      <Text style={styles.periodTitle}>{title}</Text>
      <Text style={styles.muted}>
        評価 {stats.totalEvaluations}件 · 適合 {stats.rates.passedPct}% · 営業日 {stats.tradingDays}
      </Text>

      <View style={styles.rateRow}>
        <RateChip label="押し目不足" pct={stats.rates.pullbackPct} />
        <RateChip label="ADX不足" pct={stats.rates.adxPct} />
      </View>
      <View style={styles.rateRow}>
        <RateChip label="MACD不足" pct={stats.rates.macdPct} />
        <RateChip label="レジーム不足" pct={stats.rates.regimePct} />
      </View>

      <Text style={styles.rankTitle}>阻害ランキング</Text>
      {stats.ranking.slice(0, 4).map((r) => (
        <Text key={`${title}-${r.category}`} style={styles.rankLine}>
          {r.rank}. {r.labelJa} — {r.rateOfAllPct}%（{r.count}件）
        </Text>
      ))}
    </View>
  );
}

function RateChip({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipVal}>{pct}%</Text>
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
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  periodBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
  },
  periodTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  rateRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  chip: { flex: 1, padding: theme.spacing.xs, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
  chipLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  chipVal: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  rankTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.xs, marginTop: theme.spacing.sm },
  rankLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  reportBody: { color: theme.colors.text, fontSize: theme.fontSize.xs, lineHeight: 18, fontFamily: 'monospace' },
});
