import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3GamudaCapAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3GamudaCapAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3GamudaCapAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その72 · MY v3 GAMUDA上限</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const adopted = report.patterns.find((p) => p.patternId === report.adoptedPatternId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その72 · MY v3 GAMUDA上限</Text>
      <Text style={styles.subtitle}>
        基準廃止MC{report.baselineDelistBankruptcyPct}% · {report.adoptionGrade}評価 · 5%未満
        {report.delistMcUnder5Pct ? '達成' : '未達'}
      </Text>
      {adopted ? (
        <Text style={styles.line}>
          {adopted.labelJa} · 廃止MC{adopted.delist.bootstrap.bankruptcyRatePct}% · GAMUDA依存
          {adopted.gamudaDependencyPct}%
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
