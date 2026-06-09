import { ScrollView, StyleSheet, Text } from 'react-native';
import type { ForwardVix25MaeWorst10AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25MaeWorst10AuditReport | null;
  loading?: boolean;
};

export function ForwardVix25MaeWorst10AuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MAEワースト10</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MAEワースト10</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥25 MAEワースト10</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.worst10.map((r) => (
          <Text key={`${r.rank}-${r.signalDate}-${r.symbol}`} style={styles.line}>
            {r.rank}. {r.signalDate} {r.symbol} MAE{r.maePct}% → {r.returnPct}%
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  scroll: { maxHeight: 200, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 3 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
