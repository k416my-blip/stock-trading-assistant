import { StyleSheet, Text } from 'react-native';
import type { ForwardOperationalAllocationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardOperationalAllocationAuditReport | null;
  loading?: boolean;
};

export function ForwardOperationalAllocationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その8 · 資金配分</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const a = report.schemes.find((s) => s.schemeId === 'A');
  const b = report.schemes.find((s) => s.schemeId === 'B');
  const c = report.schemes.find((s) => s.schemeId === 'C');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その8 · 資金配分</Text>
      <Text style={styles.subtitle}>
        基準 {report.baselineTradeCount}件 · WR{report.baselineWinRatePct}%
      </Text>
      <Text style={styles.line}>
        A均等: 累積{a?.cumulativeReturnPct ?? '—'}% · DD{a?.maxDrawdownPct ?? '—'}%
      </Text>
      <Text style={styles.line}>
        B1/1.5/2: 累積{b?.cumulativeReturnPct ?? '—'}% · DD{b?.maxDrawdownPct ?? '—'}%
      </Text>
      <Text style={styles.line}>
        C1/2/3: 累積{c?.cumulativeReturnPct ?? '—'}% · DD{c?.maxDrawdownPct ?? '—'}%
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
