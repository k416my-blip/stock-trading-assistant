import { StyleSheet, Text, View } from 'react-native';
import { REACTIVE_UI_LABELS_JA } from '../../constants/reactiveEventOrchestration';
import type { ReactiveEventOrchestrationBundle } from '../../types/reactiveEventOrchestration';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ReactiveEventOrchestrationBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ReactiveEventDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.reactiveHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-reactive-event-panel">
      <Text style={styles.title}>{REACTIVE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{REACTIVE_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.reactiveHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.orchestrationSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label="recompute/s" value={String(bundle.recomputePerSec)} />
        <Metric label="rerender/s" value={String(bundle.rerenderPerSec)} />
        <Metric
          label="render budget"
          value={`${bundle.renderBudgetInFlight}/${bundle.renderBudgetMax}`}
        />
        <Metric label="latency ms" value={String(bundle.avgEventLatencyMs)} />
      </View>

      <SelectableText style={styles.note}>
        stale queue {bundle.staleQueueCount} · dropped {bundle.droppedTotal} · batched{' '}
        {bundle.batchedTotal}
        {bundle.visibilityPaused ? ' · 非表示で pause' : ''}
        {bundle.burstProtectionActive ? ' · burst 抑制' : ''}
      </SelectableText>

      {bundle.selectiveRecomputeActive ? (
        <SelectableText style={styles.note}>
          部分再計算: {bundle.pendingLayers.join(', ')}
        </SelectableText>
      ) : null}

      <Section title={REACTIVE_UI_LABELS_JA.active} lines={bundle.activeEvents.map(eventLine)} />
      <Section title={REACTIVE_UI_LABELS_JA.queued} lines={bundle.queuedEvents.map(eventLine)} />
      <Section
        title={REACTIVE_UI_LABELS_JA.dropped}
        lines={bundle.droppedEvents.map(
          (e) => `${e.type} — ${e.dropReasonJa ?? e.status}`,
        )}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{REACTIVE_UI_LABELS_JA.timeline}</Text>
        {bundle.timeline.slice(-6).map((e) => (
          <SelectableText key={e.id} style={styles.bullet}>
            · {e.at.slice(11, 19)} {e.type} ({e.status})
            {e.latencyMs != null ? ` ${e.latencyMs}ms` : ''}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{REACTIVE_UI_LABELS_JA.deps}</Text>
        {bundle.dependencyGraph.slice(0, 5).map((d) => (
          <SelectableText key={d.eventType} style={styles.bullet}>
            · {d.eventType} → {d.triggers.join(',')}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>{bundle.explainRuleBasisJa}</SelectableText>
    </View>
  );
}

function eventLine(e: ReactiveEventOrchestrationBundle['activeEvents'][0]): string {
  return `${e.type} [${e.priority}] ${e.dedupeKey}`;
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
  if (lines.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.slice(0, 5).map((line) => (
        <SelectableText key={line} style={styles.bullet}>
          · {line}
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
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '45%', padding: theme.spacing.xs, backgroundColor: theme.colors.background, borderRadius: theme.radius.sm },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  note: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
