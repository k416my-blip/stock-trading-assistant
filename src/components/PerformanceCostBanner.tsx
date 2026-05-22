import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PERFORMANCE_COST_LABELS_JA } from '../constants/performanceCost';
import { usePerformanceCostOptional } from '../context/PerformanceCostContext';
import { useProductionStabilityOptional } from '../context/ProductionStabilityContext';
import { theme } from '../theme';

function PerformanceCostBannerInner() {
  const perf = usePerformanceCostOptional();
  const stability = useProductionStabilityOptional();
  if (!perf) return null;

  const { runtime } = perf;
  const lines: string[] = [];
  if (stability && stability.snapshot.emergencyLevel > 0) {
    lines.push(
      `緊急セーフモード L${stability.snapshot.emergencyLevel}${stability.snapshot.emergencyReasonJa ? ` — ${stability.snapshot.emergencyReasonJa}` : ''}`,
    );
  }
  if (runtime.offlineMode) lines.push(PERFORMANCE_COST_LABELS_JA.offline);
  else if (!runtime.appForeground) lines.push(PERFORMANCE_COST_LABELS_JA.backgroundPaused);
  if (runtime.batterySaverActive) lines.push(PERFORMANCE_COST_LABELS_JA.batterySaver);

  if (lines.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {lines.map((line) => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export const PerformanceCostBanner = memo(PerformanceCostBannerInner);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  text: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
  },
});
