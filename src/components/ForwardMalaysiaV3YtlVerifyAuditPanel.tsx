import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3YtlVerifyAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3YtlVerifyAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3YtlVerifyAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その75 · YTL廃止MC検証</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その75 · YTL廃止MC74%検証</Text>
      <Text style={styles.subtitle}>
        廃止YTL{report.delistYtlTradeCount}件 · 消失{report.delistDisappearedYtlCount} ·{' '}
        {report.verifyGrade}判定
      </Text>
      <Text style={styles.line}>
        バグ{report.implementationBugDetected ? 'あり' : 'なし'} · 依存{report.trueYtlDependencyPct}%
      </Text>
      <Text style={styles.verdict}>{report.verifyVerdictJa}</Text>
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
