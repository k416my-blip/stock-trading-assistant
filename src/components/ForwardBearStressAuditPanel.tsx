import { StyleSheet, Text } from 'react-native';
import type { ForwardBearStressAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardBearStressAuditReport | null;
  loading?: boolean;
};

export function ForwardBearStressAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その33 · 暴落ストレス</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その33 · 暴落ストレス</Text>
      <Text style={styles.subtitle}>
        耐性{report.resilienceGrade} · 専用ルール{report.bearSpecificRuleNeeded ? 'YES' : 'NO'}
      </Text>
      <Text style={styles.line}>{report.answer1Ja}</Text>
      <Text style={styles.line}>{report.answer4Ja}</Text>
      <Text style={styles.verdict}>{report.answer9Ja}</Text>
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
