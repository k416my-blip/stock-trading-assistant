import { StyleSheet, Text, View } from 'react-native';
import type { ShadowTradingReport } from '../types/shadowTrading';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.15)', label: '正常' },
  yellow: { bg: 'rgba(234, 179, 8, 0.15)', label: '監視' },
  red: { bg: 'rgba(239, 68, 68, 0.15)', label: '制限' },
};

type Props = { report: ShadowTradingReport };

export function ShadowTradingPanel({ report }: Props) {
  const s = report.snapshot;
  const h = HEALTH[report.executionHealth.shadowPortfolioHealth];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>シャドー・ポートフォリオ（シミュレーション）</Text>
      <Text style={styles.subtitle}>実ブローカー注文なし · 端末内ペーパー執行 · 現金台帳</Text>

      <View style={[styles.banner, { backgroundColor: h.bg }]}>
        <Text style={styles.bannerText}>{report.verdictJa}</Text>
      </View>

      {report.capitalPreservation.active ? (
        <View style={styles.cp}>
          <Text style={styles.cpTitle}>資本保全モード</Text>
          <Text style={styles.cpLine}>{report.capitalPreservation.noteJa}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>PnL</Text>
      <Text style={styles.muted}>
        総資産 RM{s.portfolioValueMYR.toLocaleString('ja-JP')} · 現金 RM
        {s.cashBalanceMYR.toLocaleString('ja-JP')}
      </Text>
      <Text style={styles.muted}>
        含み損益 RM{s.unrealizedPnLMYR.toLocaleString('ja-JP')} · 実現 RM
        {s.realizedPnLMYR.toLocaleString('ja-JP')} · リターン {s.totalReturnPct}%
      </Text>
      <Text style={styles.muted}>ドローダウン {s.drawdownPct}%</Text>

      <Text style={styles.section}>執行ヘルス</Text>
      <Text style={styles.line}>{report.executionHealth.noteJa}</Text>
      <Text style={styles.muted}>
        約定信頼性 {report.executionHealth.fillReliabilityPct}% · 市場ストレス{' '}
        {HEALTH[report.executionHealth.marketStressState].label}
      </Text>

      <Text style={styles.section}>モデル乖離</Text>
      <Text style={styles.line}>{report.divergence.noteJa}</Text>

      <Text style={styles.section}>行動的生存性</Text>
      <Text style={styles.muted}>{report.behavioral.noteJa}</Text>
      <Text style={styles.muted}>
        苦痛指数 {report.behavioral.drawdownPainIndex} · 離脱リスク{' '}
        {report.behavioral.userAbandonmentRisk}
      </Text>

      <Text style={styles.section}>パス分析</Text>
      <Text style={styles.line}>{report.pathAnalysis.noteJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },
  banner: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: 8 },
  bannerText: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  cp: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  cpTitle: { color: theme.colors.danger, fontWeight: '700' },
  cpLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
