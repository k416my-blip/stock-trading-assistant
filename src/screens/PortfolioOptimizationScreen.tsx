import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { PortfolioOptimizationPanel } from '../components/PortfolioOptimizationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { computePortfolioDrawdownPct } from '../services/crossAssetLiquidityFlowEngine';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import {
  runDemoPortfolioOptimization,
  runInstitutionalPortfolioOptimization,
} from '../services/institutionalPortfolioOptimizationService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { PortfolioOptimizationReport } from '../types/portfolioOptimization';
import { theme } from '../theme';

export function PortfolioOptimizationScreen() {
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
  const [report, setReport] = useState<PortfolioOptimizationReport | null>(null);

  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);

  const totalValue = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;

  const runOptimize = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const drawdown = isPractice
          ? computePortfolioDrawdownPct(
              state.practice.performanceHistory,
              practiceStats.portfolioValueMYR,
            )
          : state.settings.totalCapitalMYR > 0 && totalValue < state.settings.totalCapitalMYR
            ? ((state.settings.totalCapitalMYR - totalValue) / state.settings.totalCapitalMYR) *
              100
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
          ? await runDemoPortfolioOptimization({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
            })
          : await runInstitutionalPortfolioOptimization({
              apiKey: twelveDataApiKey,
              portfolio,
              totalPortfolioValueMYR: totalValue,
              regime: marketRegime,
              constructionReport,
            });
        setReport(result);
      } catch (e) {
        Alert.alert(
          '最適化エラー',
          e instanceof Error ? e.message : 'ポートフォリオ最適化に失敗しました',
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
      isPractice,
      state.practice.performanceHistory,
      state.performanceHistory,
      portfolioRevision,
    ],
  );

  const hasHoldings = portfolio.length > 0;

  return (
    <Screen
      title="機関ポートフォリオ最適化"
      subtitle="共分散 · リスクパリティ · CVaR · Kelly · レジーム · ターンオーバー"
    >
      <Card>
        <Text style={styles.note}>
          収縮共分散（Ledoit-Wolf）に基づき、リスクパリティ・最小分散・CVaR・Kelly制約・レジーム配分・流動性・ターンオーバー・エクスポージャー中立化を統合。モンテカルロで頑健性をスコアリングします。
        </Text>
        <Button
          label={loading ? '最適化実行中…' : '保有ポートフォリオを最適化'}
          onPress={() => void runOptimize(false)}
          disabled={loading || !hasHoldings}
        />
        <Button
          label="デモユニバースで最適化"
          onPress={() => void runOptimize(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="ベイズ動的配分へ"
          onPress={() => navigation.navigate('BayesianAllocation')}
          variant="ghost"
        />
      </Card>

      {!hasHoldings ? (
        <Card>
          <Text style={styles.hint}>
            保有銘柄がない場合は「デモユニバースで最適化」をご利用ください。
          </Text>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>共分散推定・最適化・MCスコア計算中…</Text>
        </Card>
      ) : null}

      {report ? <PortfolioOptimizationPanel report={report} /> : null}
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
