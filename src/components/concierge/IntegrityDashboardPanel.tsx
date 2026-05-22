import { StyleSheet, Text, View } from 'react-native';
import { TEMPORAL_UI_LABELS_JA } from '../../constants/stateIntegrityTemporalConsistency';
import type { StateIntegrityTemporalConsistencyBundle } from '../../types/stateIntegrityTemporalConsistency';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: StateIntegrityTemporalConsistencyBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function IntegrityDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.stateHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-integrity-dashboard-panel">
      <Text style={styles.title}>{TEMPORAL_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{TEMPORAL_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.stateHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.integritySummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={TEMPORAL_UI_LABELS_JA.version} value={bundle.globalStateVersionLabelJa} />
        <Metric label={TEMPORAL_UI_LABELS_JA.consistency} value={`${bundle.consistencyScore}`} />
        <Metric label={TEMPORAL_UI_LABELS_JA.trace} value={`${bundle.traceConsistencyScore}`} />
        <Metric label={TEMPORAL_UI_LABELS_JA.drift} value={`${bundle.driftScore}`} />
      </View>

      <SelectableText style={styles.note}>
        {TEMPORAL_UI_LABELS_JA.governanceAge}:{' '}
        {bundle.governanceAgeMs != null ? `${Math.round(bundle.governanceAgeMs / 1000)}s` : 'n/a'}
        {bundle.governanceFresh ? ' (fresh)' : ' (STALE)'} · {TEMPORAL_UI_LABELS_JA.replay}:{' '}
        {bundle.replayFreshnessJa}
        {bundle.emergencyStateFreeze ? ` · ${TEMPORAL_UI_LABELS_JA.freeze}` : ''}
        {bundle.rollbackApplied ? ' · rollback' : ''}
      </SelectableText>

      <Section
        title={TEMPORAL_UI_LABELS_JA.stale}
        lines={
          bundle.staleStatesJa.length > 0
            ? bundle.staleStatesJa.map((s) => `· ${s}`)
            : ['· なし']
        }
      />
      <Section
        title={TEMPORAL_UI_LABELS_JA.async}
        lines={
          bundle.asyncConflictsJa.length > 0
            ? bundle.asyncConflictsJa.map((s) => `· ${s}`)
            : ['· なし']
        }
      />

      <SelectableText style={styles.note}>
        {TEMPORAL_UI_LABELS_JA.snapshots}: {bundle.snapshotCount} · zombie{' '}
        {bundle.zombieStatesJa.length} · timeline gaps {bundle.timelineGapCount}
      </SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{TEMPORAL_UI_LABELS_JA.rollback}</Text>
        {bundle.rollbackPoints.slice(-3).map((p) => (
          <SelectableText key={p.id} style={styles.bullet}>
            · v{p.version} {p.at.slice(11, 19)} {p.rollbackSafe ? 'safe' : 'unsafe'}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} — {bundle.explainRuleBasisJa}
      </SelectableText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Section({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line) => (
        <SelectableText key={line} style={styles.bullet}>
          {line}
        </SelectableText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  note: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
