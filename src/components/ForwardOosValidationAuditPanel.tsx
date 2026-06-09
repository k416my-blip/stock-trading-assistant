import { StyleSheet, Text } from 'react-native';
import type { ForwardOosValidationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardOosValidationAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  none: '過剰適合なし',
  mild: '軽度の乖離',
  suspected: '過剰適合の疑い',
  clear: '過剰適合（強）',
};

export function ForwardOosValidationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その9 · OOS検証</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const { inSample: is, outOfSample: oos } = report;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その9 · OOS検証</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.overfitVerdict] ?? report.overfitVerdict}
      </Text>
      <Text style={styles.line}>
        IS {is.tradeCount}件 WR{is.winRatePct}% 累積{is.cumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        OOS {oos.tradeCount}件 WR{oos.winRatePct}% 累積{oos.cumulativeReturnPct}%
      </Text>
      {report.oosYearly
        .filter((y) => y.tradeCount > 0)
        .map((y) => (
          <Text key={y.year} style={styles.line}>
            {y.year}: {y.tradeCount}件 WR{y.winRatePct}% 累積{y.cumulativeReturnPct}%
          </Text>
        ))}
      <Text style={styles.verdict}>{report.overfitVerdictJa}</Text>
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
