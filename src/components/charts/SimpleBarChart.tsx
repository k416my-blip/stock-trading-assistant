import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { theme } from '../../theme';
import { chartWidth } from '../../utils/chartUtils';
import type { ChartSeriesPoint } from '../../types/monitoring';

type Props = {
  data: ChartSeriesPoint[];
  height?: number;
  barColor?: string;
  horizontal?: boolean;
};

function SimpleBarChartInner({
  data,
  height = 160,
  barColor = theme.colors.primary,
  horizontal = false,
}: Props) {
  const width = chartWidth();
  const padding = { l: 8, r: 8, t: 8, b: horizontal ? 48 : 24 };
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;

  const { bars, maxVal } = useMemo(() => {
    const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
    const n = data.length;
    const gap = 4;
    const barW = Math.max(4, (innerW - gap * (n - 1)) / n);
    const bars = data.map((d, i) => {
      const h = (Math.abs(d.value) / maxVal) * innerH;
      const x = padding.l + i * (barW + gap);
      const y = padding.t + innerH - h;
      return { x, y, w: barW, h, label: d.label, value: d.value };
    });
    return { bars, maxVal };
  }, [data, innerW, innerH]);

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {bars.map((b, i) => (
          <Rect
            key={`${b.label}-${i}`}
            x={b.x}
            y={b.y}
            width={b.w}
            height={Math.max(2, b.h)}
            fill={barColor}
            rx={2}
          />
        ))}
        {horizontal
          ? bars.map((b, i) => (
              <SvgText
                key={`t-${i}`}
                x={b.x + b.w / 2}
                y={height - 6}
                fill={theme.colors.textMuted}
                fontSize={9}
                textAnchor="middle"
                rotation={-35}
                origin={`${b.x + b.w / 2}, ${height - 6}`}
              >
                {b.label.length > 8 ? b.label.slice(0, 7) + '…' : b.label}
              </SvgText>
            ))
          : null}
      </Svg>
    </View>
  );
}

export const SimpleBarChart = memo(SimpleBarChartInner);

const styles = StyleSheet.create({
  wrap: { marginTop: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
});
