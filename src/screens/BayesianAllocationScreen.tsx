import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { BayesianAllocationPanel } from '../components/BayesianAllocationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import {
  runDemoBayesianAllocation,
  runRobustBayesianAllocation,
} from '../services/robustBayesianAllocationService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { BayesianAllocationReport } from '../types/bayesianAllocation';
import { theme } from '../theme';

export function BayesianAllocationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    twelveDataApiKey,
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    portfolioRevision,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BayesianAllocationReport | null>(null);

  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);

  const totalValue = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;

  const runAllocation = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const drawdown =
          !demo && state.settings.totalCapitalMYR > 0 && totalValue < state.settings.totalCapitalMYR
            ? ((state.settings.totalCapitalMYR - totalValue) / state.settings.totalCapitalMYR) * 100
            : 0;

        const constructionReport = !demo
          ? analyzePortfolioConstruction({
              portfolio,
              totalPortfolioValueMYR: totalValue,
              regime: marketRegime,
              portfolioDrawdownPct: drawdown,
            })
          : undefined;

        const result = demo
          ? await runDemoBayesianAllocation({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
            })
          : await runRobustBayesianAllocation({
              apiKey: twelveDataApiKey,
              portfolio,
              totalPortfolioValueMYR: totalValue,
              regime: marketRegime,
              constructionReport,
            });
        setReport(result);
      } catch (e) {
        Alert.alert(
          '配分エラー',
          e instanceof Error ? e.message : 'ベイズ動的配分に失敗しました',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      twelveDataApiKey,
      portfolio,
      totalValue,
      marketRegime,
      state.settings.totalCapitalMYR,
      portfolioRevision,
    ],
  );

  const hasHoldings = portfolio.length > 0;

  return (
    <Screen
      title="ベイズ動的配分"
      subtitle="Black-Litterman · EWMA · 収縮 · 感度 · 持続性 · 信頼区間"
    >
      <Card>
        <Text style={styles.note}>
          最適化の脆弱性を低減するベイズ・動的配分層です。EWMAとローリング収縮共分散、Black-Litterman事後リターン、フラクショナルKelly、レジーム持続性、動的不確実性スケール、感度分析、安定性ペナルティ、信頼区間、頑健性ランキングを統合します。
        </Text>
        <Button
          label={loading ? '計算中…' : '保有ポートフォリオで配分'}
          onPress={() => void runAllocation(false)}
          disabled={loading || !hasHoldings}
        />
        <Button
          label="デモユニバースで配分"
          onPress={() => void runAllocation(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="メタ配分・アンサンブルへ"
          onPress={() => navigation.navigate('MetaAllocation')}
          variant="ghost"
        />
      </Card>

      {!hasHoldings ? (
        <Card>
          <Text style={styles.hint}>保有がない場合はデモユニバースをご利用ください。</Text>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>共分散・BL・感度・CI計算中…</Text>
        </Card>
      ) : null}

      {report ? <BayesianAllocationPanel report={report} /> : null}
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
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
});
