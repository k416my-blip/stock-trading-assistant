import { StyleSheet, Text, View } from 'react-native';
import type { BehavioralRiskReport } from '../types/behavioralRisk';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 規律良好' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 抑制' },
};

type Props = { report: BehavioralRiskReport };

export function BehavioralRiskPanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>行動・オペレーターリスク</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          規律 {report.disciplineScore} · ストレス {report.operatorStress.score} · 執行{' '}
          {report.tradingAllowed ? '許可' : '抑制'}
        </Text>
      </View>

      {report.alerts.length > 0 ? (
        <>
          <Text style={styles.section}>アラート</Text>
          {report.alerts.map((a) => (
            <Text key={a.id} style={styles.line}>
              [{a.severity}] {a.titleJa}: {a.detailJa}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>リベンジ · 過剰取引 · FOMO</Text>
      <Text style={styles.muted}>{report.revengeTrade.noteJa}</Text>
      <Text style={styles.muted}>{report.overtrading.noteJa}</Text>
      <Text style={styles.muted}>{report.fomoSpike.noteJa}</Text>

      <Text style={styles.section}>自信ドリフト · サイズ規律 · 連敗クーリング</Text>
      <Text style={styles.muted}>{report.confidenceDrift.noteJa}</Text>
      <Text style={styles.muted}>{report.positionDiscipline.noteJa}</Text>
      <Text style={styles.muted}>{report.lossStreakCooling.noteJa}</Text>

      <Text style={styles.section}>頻度 · リスク許容 · ルール違反</Text>
      <Text style={styles.muted}>{report.tradeFrequency.noteJa}</Text>
      <Text style={styles.muted}>{report.riskTolerance.noteJa}</Text>
      {report.ruleBreaks.map((r) => (
        <Text key={r.ruleId} style={styles.line}>
          {r.labelJa} ×{r.count}
        </Text>
      ))}

      <Text style={styles.section}>感情ボラ · 疲労 · 意思決定品質</Text>
      <Text style={styles.muted}>{report.emotionalVolatility.noteJa}</Text>
      <Text style={styles.muted}>{report.sessionFatigue.noteJa}</Text>
      <Text style={styles.muted}>{report.decisionQuality.noteJa}</Text>

      <Text style={styles.section}>人間 vs モデル · 手動オーバーライド</Text>
      <Text style={styles.muted}>{report.modelDivergence.noteJa}</Text>
      <Text style={styles.muted}>{report.operatorStress.noteJa}</Text>
      {report.manualOverrides.slice(0, 5).map((o) => (
        <Text key={o.id} style={styles.line}>
          {o.labelJa} — {new Date(o.timestamp).toLocaleString('ja-JP')}
          {o.symbol ? ` (${o.symbol})` : ''}
        </Text>
      ))}
      {report.manualOverrides.length === 0 ? (
        <Text style={styles.muted}>オーバーライド履歴なし</Text>
      ) : null}
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
