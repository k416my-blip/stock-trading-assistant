import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4OpsMonitorAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4OpsMonitorAuditReport | null;
  loading?: boolean;
};

const RISK_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
};

export function ForwardMalaysiaV4OpsMonitorAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その80 · v4運用監視</Text>
        <Text style={styles.muted}>{loading ? '監視設計実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const riskColor = RISK_COLORS[report.riskLevel] ?? theme.colors.textMuted;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その80 · v4運用監視設計</Text>
      <Text style={styles.subtitle}>{report.targetWeightsJa}</Text>
      <Text style={[styles.risk, { color: riskColor }]}>
        {report.riskLabelJa} · YTL依存{report.ytlDependencyPct}%
      </Text>
      <Text style={styles.line}>
        HHI{report.concentration.hhi} · 上位1位{report.concentration.top1ProfitContributionPct}% · 累積
        {report.portfolioCumulativeReturnPct}%
      </Text>
      <Text style={styles.verdict}>{report.rebalanceProposalJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  risk: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
