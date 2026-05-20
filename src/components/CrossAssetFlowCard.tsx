import { StyleSheet, Text, View } from 'react-native';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import type { CrossAssetFlowSnapshot } from '../types/crossAssetFlow';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  flow: CrossAssetFlowSnapshot;
  compact?: boolean;
};

export function CrossAssetFlowCard({ flow, compact }: Props) {
  const ind = flow.indicators;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>クロスアセット・流動性</Text>
      {!compact ? (
        <Text style={styles.subtitle}>{flow.summaryJa}</Text>
      ) : null}

      <View style={styles.kpiRow}>
        <Metric label="DXY" value={ind.dxyProxy.toFixed(1)} />
        <Metric label="US10Y" value={`${ind.us10yProxy}`} />
        <Metric label="VIX" value={ind.vixProxy.toFixed(1)} />
      </View>
      {!compact ? (
        <View style={styles.kpiRow}>
          <Metric label="MOVE" value={ind.moveProxy.toFixed(1)} />
          <Metric label="HY" value={`${ind.hySpreadProxy}%`} />
          <Metric label="流動性" value={`${flow.liquidityScore}`} />
        </View>
      ) : null}

      <View style={styles.tagRow}>
        <Tag label={flow.liquidityLabelJa} tone={flow.liquidityRegime === 'contraction' ? 'warn' : 'ok'} />
        <Tag label={flow.capitalFlowLabelJa} tone={flow.capitalFlow === 'risk_off' ? 'warn' : 'ok'} />
        {!compact ? (
          <Tag label={flow.factorRotationLabelJa} tone="neutral" />
        ) : null}
      </View>

      {!compact && flow.sectorLeadership.length > 0 ? (
        <Text style={styles.lead}>
          主導: {flow.sectorLeadership.map((s) => SECTOR_THEME_LABEL[s]).join(' · ')}
        </Text>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

function Tag({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'neutral' }) {
  const bg =
    tone === 'warn'
      ? 'rgba(245, 158, 11, 0.2)'
      : tone === 'ok'
        ? 'rgba(59, 130, 246, 0.15)'
        : theme.colors.surfaceElevated;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  metric: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  metricLabel: { color: theme.colors.textMuted, fontSize: 10 },
  metricVal: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.spacing.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm },
  tagText: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  lead: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
