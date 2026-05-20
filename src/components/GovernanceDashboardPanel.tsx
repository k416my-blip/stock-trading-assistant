import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioGovernanceReport, SystemHealthStatus } from '../types/governance';
import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import { GOVERNANCE_REASON_LABEL } from '../constants/governance';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH_STYLE: Record<SystemHealthStatus, { bg: string; label: string }> = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 正常' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 監視' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 制限' },
};

type Props = {
  report: PortfolioGovernanceReport;
};

export function GovernanceDashboardPanel({ report }: Props) {
  const h = HEALTH_STYLE[report.healthStatus];
  const d = report.dashboard;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ガバナンス・ダッシュボード</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.healthText}>{report.healthNoteJa}</Text>
        <Text style={styles.healthBadge}>{h.label}</Text>
      </View>

      <Text style={styles.verdict}>{report.verdictJa}</Text>

      {report.doNotTrade.active ? (
        <View style={styles.dnt}>
          <Text style={styles.dntTitle}>取引停止（Do Not Trade）</Text>
          {report.doNotTrade.reasons.map((r) => (
            <Text key={r} style={styles.dntLine}>
              · {r}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>現行モデル</Text>
      <Text style={styles.line}>
        {d.activeModelLabelJa}
        {d.previousModel
          ? ` ← ${ENSEMBLE_ALLOCATOR_LABEL[d.previousModel]}`
          : ''}
      </Text>
      <Text style={styles.muted}>{d.switchReasonJa}</Text>

      <Text style={styles.section}>メトリクス</Text>
      <Text style={styles.muted}>
        不一致 {d.disagreementScore} · エントロピー {d.entropyScore} · 信頼度{' '}
        {d.confidenceScore}% · メタ頑健性 {d.metaRobustnessScore}
      </Text>
      <Text style={styles.muted}>
        フェイルセーフ: {d.failSafeActive ? '発動中' : 'オフ'}
      </Text>

      <Text style={styles.section}>レジーム確率混合</Text>
      <Text style={styles.muted}>
        Risk-on {report.regimeMixture.riskOnPct}% · Risk-off {report.regimeMixture.riskOffPct}%
        · 高ボラ {report.regimeMixture.highVolPct}% · インフレ{' '}
        {report.regimeMixture.inflationPct}% · 危機 {report.regimeMixture.crisisPct}% · 遷移{' '}
        {report.regimeMixture.transitionPct}%
      </Text>
      <Text style={styles.muted}>{report.regimeMixture.noteJa}</Text>

      <Text style={styles.section}>ヒステリシス</Text>
      <Text style={styles.line}>{report.hysteresis.noteJa}</Text>
      <Text style={styles.muted}>
        平滑スコア:{' '}
        {report.hysteresis.smoothedScores
          .map((s) => `${ENSEMBLE_ALLOCATOR_LABEL[s.allocatorId]} ${s.score}`)
          .join(' · ')}
      </Text>

      <Text style={styles.section}>監査（直近）</Text>
      <Text style={styles.muted}>
        {new Date(report.auditEntry.timestamp).toLocaleString('ja-JP')}
      </Text>
      <Text style={styles.muted}>
        理由:{' '}
        {report.auditEntry.reasonCodes
          .map((c) => GOVERNANCE_REASON_LABEL[c] ?? c)
          .join(' · ')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  health: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthText: { color: theme.colors.text, fontSize: theme.fontSize.sm, flex: 1 },
  healthBadge: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.sm },
  verdict: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  dnt: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
  },
  dntTitle: { color: theme.colors.danger, fontWeight: '700', fontSize: theme.fontSize.sm },
  dntLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
