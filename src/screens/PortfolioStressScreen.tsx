import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PortfolioStressPanel } from '../components/PortfolioStressPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  runDemoPortfolioStress,
  runPortfolioStressAnalysis,
} from '../services/portfolioStressOrchestratorService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { PortfolioStressReport } from '../types/portfolioStress';
import { theme } from '../theme';

export function PortfolioStressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    portfolioRevision,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PortfolioStressReport | null>(null);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  const performanceHistory = isPractice
    ? state.practice.performanceHistory
    : state.performanceHistory;

  const totalValue = useMemo(() => {
    if (isPractice) return practiceStats.portfolioValueMYR;
    return portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;
  }, [isPractice, practiceStats.portfolioValueMYR, state, buyingPower.buyingPowerMYR]);

  const cashBalance = buyingPower.buyingPowerMYR;

  const runStress = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const r = demo
          ? runDemoPortfolioStress()
          : runPortfolioStressAnalysis({
              portfolio,
              totalPortfolioValueMYR: totalValue,
              cashBalanceMYR: cashBalance,
              regime: marketRegime,
              performanceHistory,
            });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : 'ストレス分析に失敗');
      } finally {
        setLoading(false);
      }
    },
    [portfolio, totalValue, cashBalance, marketRegime, performanceHistory],
  );

  return (
    <Screen title="ストレス・テールリスク" subtitle="極端レジーム · 集中 · デレバレッジ">
      <Card>
        <Text style={styles.note}>
          軽量モンテカルロと相関ショックのみ。危機時は執行ゲートと現金バッファを推奨します。
        </Text>
        <Button
          label="ストレス分析（保有）"
          onPress={() => void runStress(false)}
          disabled={loading || portfolio.length === 0}
        />
        <Button
          label="デモ分析"
          onPress={() => void runStress(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="ポートフォリオ構築へ"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })}
          variant="ghost"
        />
        <Button
          label="データ整合性へ"
          onPress={() => navigation.navigate('DataIntegrity')}
          variant="ghost"
        />
        <Button
          label="行動・オペレーターリスクへ"
          onPress={() => navigation.navigate('BehavioralRisk')}
          variant="ghost"
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>相関 · テール · 流動性シミュレーション中…</Text>
        </Card>
      ) : null}

      {report ? <PortfolioStressPanel report={report} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  loading: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
