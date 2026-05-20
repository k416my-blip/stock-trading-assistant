import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../theme';
import { chartWidth, sparseLabels } from '../../utils/chartUtils';

type Props = {
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
};

function MemoLineChartInner({ labels, values, height = 200, color }: Props) {
  const width = chartWidth();
  const chartConfig = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      backgroundGradientFrom: theme.colors.surface,
      backgroundGradientTo: theme.colors.surface,
      decimalPlaces: 0,
      color: () => color ?? theme.colors.chartLine,
      labelColor: () => theme.colors.textMuted,
      propsForDots: { r: '2' },
    }),
    [color],
  );

  const data = useMemo(
    () => ({
      labels: sparseLabels(labels.map((l) => (l.length > 5 ? l.slice(5) : l))),
      datasets: [{ data: values.map((v) => (Number.isFinite(v) ? v : 0)) }],
    }),
    [labels, values],
  );

  return (
    <LineChart
      data={data}
      width={width}
      height={height}
      chartConfig={chartConfig}
      bezier
      style={styles.chart}
      withInnerLines
      fromZero={false}
    />
  );
}

export const MemoLineChart = memo(MemoLineChartInner);

const styles = StyleSheet.create({
  chart: { borderRadius: theme.radius.md, marginTop: theme.spacing.sm },
});
