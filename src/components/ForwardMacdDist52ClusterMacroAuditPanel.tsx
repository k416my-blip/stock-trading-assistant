import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52ClusterMacroAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52ClusterMacroAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52ClusterMacroAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4〜5月マクロ比較</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4〜5月マクロ比較</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>4〜5月クラスタ vs その他</Text>
      <Text style={styles.subtitle}>
        {report.cluster.tradeCount} / {report.other.tradeCount}件
      </Text>
      {report.comparisons.map((c) => (
        <Text key={c.metricId} style={styles.line}>
          {c.labelJa}: {c.clusterAvg ?? '—'}
          {c.unit} vs {c.otherAvg ?? '—'}
          {c.unit}
        </Text>
      ))}
      <Text style={styles.muted} numberOfLines={4}>
        {report.insightJa}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 10, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: theme.spacing.xs },
});
