import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { PerformancePoint } from '../types';
import { theme } from '../theme';

type Props = { data: PerformancePoint[] };

const MAX_CHART_POINTS = 48;

function downsamplePoints(data: PerformancePoint[]): PerformancePoint[] {
  if (data.length <= MAX_CHART_POINTS) return data;
  const step = Math.ceil(data.length / MAX_CHART_POINTS);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

function PerformanceChartInner({ data }: Props) {
  const sampled = useMemo(() => downsamplePoints(data), [data]);

  if (sampled.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>売買を記録すると成績グラフ（MYR）が表示されます。</Text>
      </View>
    );
  }

  const labels = sampled.map((p) => p.date.slice(5));
  const values = sampled.map((p) => p.portfolioValueMYR);

  return (
    <LineChart
      data={{
        labels: labels.length > 6 ? labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0) : labels,
        datasets: [{ data: values }],
      }}
      width={Dimensions.get('window').width - 32}
      height={220}
      chartConfig={{
        backgroundColor: theme.colors.surface,
        backgroundGradientFrom: theme.colors.surface,
        backgroundGradientTo: theme.colors.surface,
        decimalPlaces: 0,
        color: () => theme.colors.chartLine,
        labelColor: () => theme.colors.textMuted,
        propsForDots: { r: '3' },
      }}
      bezier={sampled.length >= 8}
      style={styles.chart}
    />
  );
}

export const PerformanceChart = memo(PerformanceChartInner);

const styles = StyleSheet.create({
  chart: { borderRadius: theme.radius.md },
  empty: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: theme.spacing.md },
});
