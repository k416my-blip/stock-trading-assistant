import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import type { RootStackParamList } from '../navigation/types';
import { HistoricalValidationPanel } from '../components/HistoricalValidationPanel';
import { PerformanceChart } from '../components/PerformanceChart';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { runHistoricalValidation } from '../services/historicalSimulationEngine';
import { theme } from '../theme';

export function HistoricalValidationScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const report = useMemo(() => runHistoricalValidation(), []);

  const chartData = useMemo(
    () =>
      report.systemEquityCurve.map((p) => ({
        date: p.date,
        portfolioValueMYR: p.value * 100_000,
      })),
    [report],
  );

  return (
    <Screen
      title="歴史検証"
      subtitle="ウォークフォワード・ストレステスト・リスク調整メトリクス（サンプルデータ）"
    >
      <Card>
        <Text style={styles.note}>
          拡張サンプル価格系列（約2年）上のルールベース・シミュレーションです。実績データ接続前のフレームワーク検証用であり、将来のリターンを保証しません。
        </Text>
      </Card>

      <HistoricalValidationPanel report={report} />

      <Text style={styles.chartTitle}>システム・エクイティ曲線（正規化×RM100,000）</Text>
      <PerformanceChart data={chartData} />
      <Button
        label="実市場データ・クオンツ検証へ"
        onPress={() => stackNav.navigate('RealQuantValidation')}
        variant="ghost"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  chartTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
});
