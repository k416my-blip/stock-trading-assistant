import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardApril2025ClusterExplainerAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardApril2025ClusterExplainerAuditReport | null;
  loading?: boolean;
};

export function ForwardApril2025ClusterExplainerAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4月クラスター説明力</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4月クラスター説明力</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>2025年4月クラスター 単独説明力</Text>
      <Text style={styles.subtitle}>{report.clusterCount}件</Text>

      <Text style={styles.insight}>{report.profitDriverInsightJa}</Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.sections.map((s) => (
          <View key={s.factorId} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.factorLabelJa}</Text>
            {s.groups
              .filter((g) => g.tradeCount > 0)
              .map((g) => (
                <View key={g.labelJa} style={styles.row}>
                  <Text style={styles.line}>
                    {g.labelJa}: {g.tradeCount}件 · {g.winRatePct}% · R{g.avgReturnPct ?? '—'}%
                  </Text>
                  <Text style={styles.muted}>
                    利確 {g.takeProfitRatePct}% · 満了 {g.maxHoldRatePct}%
                  </Text>
                </View>
              ))}
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  insight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  scroll: { maxHeight: 320, marginTop: theme.spacing.sm },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  row: { marginTop: 4 },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 1 },
});
