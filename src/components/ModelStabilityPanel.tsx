import { StyleSheet, Text, View } from 'react-native';
import type { ModelStabilityReport } from '../types/modelStability';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 適応安定' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 抑制' },
};

const MODE_LABEL: Record<ModelStabilityReport['controlMode'], string> = {
  normal: '通常',
  freeze: 'フリーズ',
  quarantine: '隔離',
  safe: 'セーフ',
};

type Props = { report: ModelStabilityReport };

export function ModelStabilityPanel({ report }: Props) {
  const h = HEALTH[report.healthStatus];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>モデル安定性・自己適応制御</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.badge}>{h.label}</Text>
        <Text style={styles.muted}>
          モード {MODE_LABEL[report.controlMode]} · 学習{' '}
          {report.learningAllowed ? '許可' : '抑制'} · 安定 {report.stabilityScore.score}
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

      <Text style={styles.section}>ドリフト · 学習率 · フリーズ</Text>
      <Text style={styles.muted}>{report.parameterDrift.noteJa}</Text>
      <Text style={styles.muted}>{report.learningRateGovernor.noteJa}</Text>
      <Text style={styles.muted}>{report.adaptiveFreeze.reasonJa}</Text>

      <Text style={styles.section}>過学習 · レジーム記憶 · 安定性</Text>
      <Text style={styles.muted}>{report.overfitting.noteJa}</Text>
      <Text style={styles.muted}>{report.regimeMemoryDecay.noteJa}</Text>
      <Text style={styles.muted}>{report.stabilityScore.noteJa}</Text>

      <Text style={styles.section}>アンサンブル · フィードバック · 自己確認</Text>
      <Text style={styles.muted}>{report.ensembleConsistency.noteJa}</Text>
      <Text style={styles.muted}>{report.feedbackLoop.noteJa}</Text>
      <Text style={styles.muted}>{report.selfConfirmationBias.noteJa}</Text>

      <Text style={styles.section}>シャドー/ライブ · 隔離 · 変異率</Text>
      <Text style={styles.muted}>{report.shadowLiveDivergence.noteJa}</Text>
      <Text style={styles.muted}>{report.learningQuarantine.reasonJa}</Text>
      <Text style={styles.muted}>{report.mutationRateCap.noteJa}</Text>
      <Text style={styles.muted}>{report.memoryBalance.noteJa}</Text>

      <Text style={styles.section}>ロールバック · セーフモード</Text>
      <Text style={styles.muted}>{report.safeMode.noteJa}</Text>
      {report.rollbackSnapshots.slice(0, 4).map((s) => (
        <Text key={s.id} style={styles.line}>
          {s.labelJa} — {new Date(s.capturedAt).toLocaleString('ja-JP')}
        </Text>
      ))}
      {report.rollbackSnapshots.length === 0 ? (
        <Text style={styles.muted}>スナップショットなし</Text>
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
