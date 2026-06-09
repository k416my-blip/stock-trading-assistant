import { ScrollView, StyleSheet, Text } from 'react-native';
import type { ForwardFiveFactorSweepAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardFiveFactorSweepAuditReport | null;
  loading?: boolean;
};

export function ForwardFiveFactorSweepAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>5条件スイープ</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = [...report.allRows].sort((a, b) => b.matchCount - a.matchCount).slice(0, 6);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>5条件 単独/2/3 比較</Text>
      <Text style={styles.subtitle}>25パターン · 96件</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {top.map((r) => (
          <Text key={`${r.tierJa}-${r.comboLabelJa}`} style={styles.line}>
            {r.comboLabelJa} ({r.matchCount}): {r.winRatePct}% · R{r.avgReturnPct ?? '—'}%
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  scroll: { maxHeight: 160, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
