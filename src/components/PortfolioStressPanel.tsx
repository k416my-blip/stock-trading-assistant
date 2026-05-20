import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioStressReport } from '../types/portfolioStress';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — テール許容' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 危機' },
};

type Props = { report: PortfolioStressReport };

export function PortfolioStressPanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ストレス・テールリスク</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          システミック {report.systemicStressScore} · 執行ゲート{' '}
          {report.executionGateActive ? 'ON' : 'OFF'}
        </Text>
      </View>

      <Text style={styles.section}>相関ショック · テールMC</Text>
      <Text style={styles.muted}>{report.correlationShock.noteJa}</Text>
      <Text style={styles.muted}>{report.tailMonteCarlo.noteJa}</Text>
      <Text style={styles.muted}>{report.stressVarEs.noteJa}</Text>

      <Text style={styles.section}>セクター伝染 · 流動性</Text>
      <Text style={styles.muted}>{report.sectorContagion.noteJa}</Text>
      <Text style={styles.muted}>{report.liquidityCascade.noteJa}</Text>

      <Text style={styles.section}>集中 · 依存</Text>
      <Text style={styles.muted}>{report.hiddenFactors.noteJa}</Text>
      {report.exposureOverlaps.map((o) => (
        <Text key={o.groupLabelJa} style={styles.line}>
          {o.groupLabelJa}: {o.combinedWeightPct}% ({o.symbols.join(', ')})
        </Text>
      ))}
      <Text style={styles.muted}>{report.dependencyGraph.noteJa}</Text>

      <Text style={styles.section}>ボラ · ドローダウン · コンベクシティ</Text>
      <Text style={styles.muted}>{report.volatilityClustering.noteJa}</Text>
      <Text style={styles.muted}>{report.drawdownAcceleration.noteJa}</Text>
      <Text style={styles.muted}>{report.convexity.noteJa}</Text>

      <Text style={styles.section}>危機配分 · 現金 · デレバレッジ</Text>
      <Text style={styles.muted}>{report.crisisOverride.noteJa}</Text>
      <Text style={styles.muted}>{report.cashBuffer.noteJa}</Text>
      <Text style={styles.muted}>{report.deleveraging.noteJa}</Text>
      {report.deleveraging.actions.map((a) => (
        <Text key={a.symbol} style={styles.line}>
          #{a.priority} {a.symbol} −{a.trimWeightPct}% — {a.reasonJa}
        </Text>
      ))}

      <Text style={styles.section}>破産リスク</Text>
      <Text style={styles.muted}>{report.riskOfRuin.noteJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  health: { padding: theme.spacing.sm, borderRadius: theme.radius.sm, marginTop: theme.spacing.sm },
  verdict: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  badge: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
