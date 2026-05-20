import { StyleSheet, Text, View } from 'react-native';
import type { DataIntegrityReport } from '../types/dataIntegrity';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 衛生良好' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 汚染リスク' },
};

type Props = { report: DataIntegrityReport };

export function DataIntegrityPanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>データ整合性・市場信頼性</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          信頼度 {report.aggregateConfidence}% · バックテスト現実性 {report.backtestRealismScore} ·
          執行{report.executionSafe ? '安全' : '要注意'}
        </Text>
      </View>

      <Text style={styles.section}>API · サバイバーシップ</Text>
      <Text style={styles.muted}>{report.apiOutage.noteJa}</Text>
      {report.survivorship ? (
        <Text style={styles.muted}>{report.survivorship.warningJa}</Text>
      ) : null}

      {report.globalIssues.length > 0 ? (
        <>
          <Text style={styles.section}>グローバル問題</Text>
          {report.globalIssues.map((i) => (
            <Text key={i.id} style={styles.issue}>
              [{i.severity}] {i.titleJa}: {i.detailJa}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>銘柄別サマリー</Text>
      {report.symbols.map((s) => (
        <View key={`${s.market}:${s.symbol}`} style={styles.symbol}>
          <Text style={styles.line}>
            {s.symbol} — 信頼 {s.symbolConfidence}% · {s.missingCandleRepair.methodJa}
          </Text>
          <Text style={styles.muted}>{s.adjustmentValidation.noteJa}</Text>
          {s.staleQuote ? <Text style={styles.muted}>{s.staleQuote.noteJa}</Text> : null}
          {s.crossSource ? <Text style={styles.muted}>{s.crossSource.noteJa}</Text> : null}
          <Text style={styles.muted}>{s.gapClassification.noteJa}</Text>
          <Text style={styles.muted}>{s.badTickFilter.noteJa}</Text>
          <Text style={styles.muted}>
            {s.session.noteJa} · {s.holiday.noteJa}
          </Text>
          <Text style={styles.muted}>{s.confidence.noteJa}</Text>
          {s.issues.length > 0 ? (
            <Text style={styles.issue}>
              {s.issues.map((i) => i.titleJa).join(' · ')}
            </Text>
          ) : null}
        </View>
      ))}
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
  symbol: { marginTop: theme.spacing.sm, paddingLeft: theme.spacing.xs },
  issue: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 2 },
});
