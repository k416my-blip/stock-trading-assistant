import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import type { RootStackParamList } from '../navigation/types';
import { TermHint } from '../components/TermHint';
import { PerformanceChart } from '../components/PerformanceChart';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { portfolioMarketValueMYR } from '../services/portfolio';
import { theme } from '../theme';

export function PerformanceScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, practiceStats } = useApp();
  const currentMYR = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state);
  const history = isPractice ? state.practice.performanceHistory : state.performanceHistory;

  return (
    <Screen
      title="成績"
      subtitle={isPractice ? '練習モードのシミュレーション成績' : 'ポートフォリオ評価額の推移（MYR・端末内データ）'}
    >
      {isPractice ? (
        <>
          <PracticeModeBadge />
          <PracticeSummaryCard stats={practiceStats} />
        </>
      ) : (
        <Card>
          <TermHint term="portfolio" />
          <Text style={styles.label}>いまの評価額（概算）</Text>
          <Text style={styles.value}>RM{currentMYR.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}</Text>
          <TermHint term="returnPct" />
        </Card>
      )}
      <PerformanceChart data={history} />
      <Button
        label="リアルタイム前向き検証"
        onPress={() => stackNav.navigate('ForwardValidation')}
        variant="ghost"
      />
      <Button
        label="歴史シミュレーション検証"
        onPress={() => stackNav.navigate('HistoricalValidation')}
        variant="ghost"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  value: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', marginTop: 4 },
});
