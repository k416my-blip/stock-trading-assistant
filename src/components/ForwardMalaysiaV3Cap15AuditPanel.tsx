import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3Cap15AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3Cap15AuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3Cap15AuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その73 · MY v3 GAMUDA15%実取引</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = [...report.symbolStats].sort((a, b) => b.totalPnlMYR - a.totalPnlMYR)[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その73 · MY v3 GAMUDA15% 実取引</Text>
      <Text style={styles.subtitle}>
        {report.tradeCount}件 · 累積{report.cumulativeReturnPct}% · {report.adoptionGrade}評価
      </Text>
      {top ? (
        <Text style={styles.line}>
          利益源1位{top.symbolNameJa} · GAMUDA依存{report.gamudaDependencyPct}% · 帳簿
          {report.ledgerReconciled ? '一致' : '不一致'}
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
