import { StyleSheet, Text, View } from 'react-native';
import { RESOURCE_UI_LABELS_JA } from '../../constants/adaptiveResourceComputeBudget';
import type { AdaptiveResourceComputeBudgetBundle } from '../../types/adaptiveResourceComputeBudget';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: AdaptiveResourceComputeBudgetBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ResourceDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.resourceHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-resource-dashboard-panel">
      <Text style={styles.title}>{RESOURCE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{RESOURCE_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.resourceHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.resourceSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric
          label={RESOURCE_UI_LABELS_JA.renderBudget}
          value={`${bundle.renderBudgetInFlight}/${bundle.renderBudgetMax}`}
        />
        <Metric label={RESOURCE_UI_LABELS_JA.aiLoad} value={`${bundle.aiLoadPct}%`} />
        <Metric
          label={RESOURCE_UI_LABELS_JA.memory}
          value={`${bundle.memoryPressurePct}% (${bundle.memoryPressureLevel})`}
        />
        <Metric label={RESOURCE_UI_LABELS_JA.battery} value={bundle.batteryModeJa} />
      </View>

      <SelectableText style={styles.note}>
        {RESOURCE_UI_LABELS_JA.thermal}: {bundle.thermalStateJa} · イベント圧力 {bundle.eventPressureScore} ·
        refresh {Math.round(bundle.adaptiveRefreshIntervalMs / 1000)}s
        {bundle.emergencyComputeCut ? ' · 緊急遮断' : ''}
        {bundle.aiSleepMode ? ' · AIスリープ' : ''}
      </SelectableText>

      <Section
        title={RESOURCE_UI_LABELS_JA.active}
        lines={bundle.activeLayers.slice(0, 8).map((l) => `· ${l}`)}
      />
      <Section
        title={RESOURCE_UI_LABELS_JA.sleeping}
        lines={
          bundle.sleepingLayers.length > 0
            ? bundle.sleepingLayers.slice(0, 8).map((l) => `· ${l}`)
            : ['· なし']
        }
      />

      <SelectableText style={styles.note}>
        {RESOURCE_UI_LABELS_JA.throttled}: {bundle.throttledEvents} · {RESOURCE_UI_LABELS_JA.dropped}:{' '}
        {bundle.droppedRecomputes} · render cost {bundle.renderCostScore}
      </SelectableText>
      <SelectableText style={styles.note}>
        {RESOURCE_UI_LABELS_JA.trace}: {bundle.traceSizeBytes}B
        {bundle.explainabilitySamplingActive ? ` (圧縮 ${bundle.traceCompressionRatioPct}%)` : ''} ·{' '}
        {RESOURCE_UI_LABELS_JA.replay}: {bundle.replaySizeBytes}B
      </SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{RESOURCE_UI_LABELS_JA.timeline}</Text>
        {bundle.computeTimeline.slice(-5).map((p) => (
          <SelectableText key={p.at} style={styles.bullet}>
            · {p.at.slice(11, 19)} CPU {p.cpuLoadPct}% · MEM {p.memoryPressurePct}%
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>{bundle.explainRuleBasisJa}</SelectableText>
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
