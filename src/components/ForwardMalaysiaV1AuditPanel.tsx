import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV1AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV1AuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV1AuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その64 · Malaysia v1</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = report.symbolRows.slice(0, 3).map((r) => `${r.nameJa}(${r.grade})`).join(' · ');
  const best = report.bestPortfolioBySize[report.bestPortfolioBySize.length - 1];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その64 · Malaysia v1</Text>
      <Text style={styles.subtitle}>
        {report.fromDate}〜{report.toDate} · {report.adoptionGrade}評価
      </Text>
      <Text style={styles.line}>上位: {top}</Text>
      {best ? (
        <Text style={styles.line}>
          最適PF: {best.symbols.join('/')} · 累積{best.cumulativeReturnPct}%
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.adoptionVerdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
