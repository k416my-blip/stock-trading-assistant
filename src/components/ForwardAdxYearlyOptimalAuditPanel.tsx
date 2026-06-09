import { StyleSheet, Text } from 'react-native';
import type { ForwardAdxYearlyOptimalAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdxYearlyOptimalAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  multi_year_adx20: '複数年ADX20',
  year_2020_only: '2020年のみ',
  adx25_dominant: 'ADX25優位',
  mixed: '混合',
};

export function ForwardAdxYearlyOptimalAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その21 · 年度別ADX</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const y2020 = report.yearlyRows.find((r) => r.year === '2020');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その21 · 年度別ADX</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · ADX20優位
        {report.adx20SuperiorYearCount}年 / ADX25優位{report.adx25SuperiorYearCount}年
      </Text>
      {y2020 ? (
        <Text style={styles.line}>
          2020: 20={y2020.adx20.cumulativeReturnPct}% vs 25={y2020.adx25.cumulativeReturnPct}% (Δ
          {y2020.cumulativeDelta20Minus25}%)
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.verdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
