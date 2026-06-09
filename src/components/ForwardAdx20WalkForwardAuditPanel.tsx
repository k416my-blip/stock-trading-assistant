import { StyleSheet, Text } from 'react-native';
import type { ForwardAdx20WalkForwardAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdx20WalkForwardAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  adx20_adoption_valid: 'ADX20採用妥当',
  overfit_suspected: '過剰最適化疑い',
  adx25_preferred: 'ADX25優先',
  mixed: '混合',
};

export function ForwardAdx20WalkForwardAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その22 · ADX20 WF</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その22 · ADX20 WF</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 推奨 ADX&gt;
        {report.recommendedAdxThreshold}
      </Text>
      <Text style={styles.line}>
        学習: 20={report.trainAdx20.cumulativeReturnPct}% vs 25=
        {report.trainAdx25.cumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        テスト: 20={report.testAdx20.cumulativeReturnPct}% vs 25=
        {report.testAdx25.cumulativeReturnPct}% · ADX20のみ{report.testOnlyAdx20Trades.length}件
      </Text>
      <Text style={styles.verdict}>{report.answer1Ja}</Text>
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
