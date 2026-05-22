import { StyleSheet, Text, View } from 'react-native';
import { MEMORY_COMPRESSION_UI_LABELS_JA } from '../../constants/recursiveMemoryCompressionStrategicAbstraction';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from '../../types/recursiveMemoryCompressionStrategicAbstraction';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: RecursiveMemoryCompressionStrategicAbstractionBundle;
};

function pctColor(pct: number, invert = false) {
  const v = invert ? 100 - pct : pct;
  if (v >= 75) return theme.colors.danger;
  if (v >= 50) return theme.colors.warning;
  return theme.colors.success;
}

export function MemoryCompressionDashboardPanel({ bundle }: Props) {
  const satColor = pctColor(bundle.memorySaturationPct);

  return (
    <View style={styles.wrap} testID="concierge-memory-compression-dashboard-panel">
      <Text style={styles.title}>{MEMORY_COMPRESSION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <SelectableText style={styles.summary}>{bundle.compressionSummaryJa}</SelectableText>
      <SelectableText style={styles.abstract}>{bundle.abstractedNarrativeJa}</SelectableText>

      {bundle.cognitiveStabilityFreeze ? (
        <SelectableText style={styles.warn}>
          {MEMORY_COMPRESSION_UI_LABELS_JA.freeze}: active
        </SelectableText>
      ) : null}
      {bundle.replayIsolated ? (
        <SelectableText style={styles.warn}>Replay isolated</SelectableText>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric
          label={MEMORY_COMPRESSION_UI_LABELS_JA.saturation}
          value={`${bundle.memorySaturationPct}%`}
          color={satColor}
        />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.contextLoad} value={`${bundle.contextLoadPct}%`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.ratio} value={`${bundle.compressionRatioPct}%`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.abstraction} value={`L${bundle.abstractionLevel}`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.depth} value={`${bundle.recursiveDepth}`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.entropy} value={`${bundle.timelineEntropyPct}%`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.replaySize} value={`${bundle.replaySizeBytes}B`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.semanticDensity} value={`${bundle.semanticDensityPct}%`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.snapshots} value={`${bundle.snapshotCount}`} />
        <Metric label={MEMORY_COMPRESSION_UI_LABELS_JA.recovery} value={`${bundle.recoveryHealthPct}%`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compressed timeline</Text>
        {bundle.compressedTimeline.slice(-3).map((c) => (
          <SelectableText key={c.id} style={styles.bullet}>
            · {c.periodJa}: {c.summaryJa.slice(0, 80)} (e {c.entropyBefore}→{c.entropyAfter})
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} — {bundle.explainRuleBasisJa}
      </SelectableText>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
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
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.xs },
  abstract: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '30%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
