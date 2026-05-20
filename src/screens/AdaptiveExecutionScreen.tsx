import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdaptiveExecutionPanel } from '../components/AdaptiveExecutionPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import {
  runAdaptiveExecutionAnalysis,
  runDemoAdaptiveExecution,
} from '../services/adaptiveExecutionOrchestratorService';
import { clearAdaptiveLearningState } from '../services/adaptiveExecutionStorage';
import {
  runDemoPortfolioGovernance,
  runPortfolioGovernance,
} from '../services/portfolioGovernanceOrchestratorService';
import { calculatePositionSize } from '../services/positionSizingEngine';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { AdaptiveExecutionReport } from '../types/adaptiveExecution';
import { theme } from '../theme';

export function AdaptiveExecutionScreen() {
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
  const [report, setReport] = useState<AdaptiveExecutionReport | null>(null);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  const totalValue = useMemo(() => {
    if (isPractice) return practiceStats.portfolioValueMYR;
    return portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;
  }, [isPractice, practiceStats.portfolioValueMYR, state, buyingPower.buyingPowerMYR]);

  const runAnalysis = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        if (demo) {
          const r = await runDemoAdaptiveExecution({ regime: marketRegime });
          setReport(r);
          return;
        }

        const drawdown =
          state.settings.totalCapitalMYR > 0 && totalValue < state.settings.totalCapitalMYR
            ? ((state.settings.totalCapitalMYR - totalValue) / state.settings.totalCapitalMYR) * 100
            : 0;

        let governance = null;
        try {
          const constructionReport = analyzePortfolioConstruction({
            portfolio,
            totalPortfolioValueMYR: totalValue,
            regime: marketRegime,
            portfolioDrawdownPct: drawdown,
          });
          governance = await runPortfolioGovernance({
            apiKey: twelveDataApiKey,
            portfolio,
            totalPortfolioValueMYR: totalValue,
            regime: marketRegime,
            constructionReport,
          });
        } catch {
          try {
            governance = await runDemoPortfolioGovernance({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
            });
          } catch {
            governance = null;
          }
        }

        const first = portfolio[0];
        const baseSizing =
          first && portfolio.length > 0
            ? calculatePositionSize({
                stock: {
                  symbol: first.symbol,
                  name: first.symbol,
                  market: first.market,
                  currency: first.currency,
                  price: first.currentPrice || first.averageBuyPrice,
                  dividendYield: 0,
                  per: 0,
                  volume: 1_000_000,
                  marketCap: 1e9,
                  category: 'growth',
                },
                buyingPowerMYR: buyingPower.buyingPowerMYR,
                accountType: state.settings.accountType,
                regime: marketRegime,
                portfolio,
                totalCapitalMYR: totalValue,
                portfolioDrawdownPct: drawdown,
                riskPerTradePct: state.settings.riskPerTradePct,
              })
            : null;

        const { report: r } = await runAdaptiveExecutionAnalysis({
          regime: marketRegime,
          governance,
          portfolio,
          totalPortfolioValueMYR: totalValue,
          portfolioDrawdownPct: drawdown,
          baseSizing,
          signalScore: governance?.meta.confidenceBlend.effectiveConfidence,
          persistLearning: true,
        });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : '適応執行の実行に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [
      marketRegime,
      portfolio,
      totalValue,
      state,
      twelveDataApiKey,
      buyingPower.buyingPowerMYR,
    ],
  );

  const onClearLearning = useCallback(async () => {
    await clearAdaptiveLearningState();
    Alert.alert('完了', 'オンライン学習状態をリセットしました');
  }, []);

  return (
    <Screen
      title="適応執行・アルファ"
      subtitle="サイズ · ボラターゲット · タイミング · シャドー学習"
    >
      <Card>
        <Text style={styles.note}>
          軽量統計/確率手法のみ。シャドー約定から EWMA 学習し、執行ドラッグを最小化します。
        </Text>
        <Button
          label="適応執行を実行"
          onPress={() => void runAnalysis(false)}
          disabled={loading}
        />
        <Button
          label="デモ実行"
          onPress={() => void runAnalysis(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="学習状態をリセット"
          onPress={() => void onClearLearning()}
          variant="ghost"
        />
        <Button
          label="シャドー取引へ"
          onPress={() => navigation.navigate('ShadowTrading')}
          variant="ghost"
        />
        <Button
          label="マーケット・インテリジェンス"
          onPress={() => navigation.navigate('MarketIntelligence')}
          variant="ghost"
        />
        <Button
          label="モニタリングへ"
          onPress={() => navigation.navigate('Monitoring')}
          variant="ghost"
        />
        <Button
          label="モデル安定性へ"
          onPress={() => navigation.navigate('ModelStability')}
          variant="ghost"
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>レジーム · マクロ · 執行最適化中…</Text>
        </Card>
      ) : null}

      {report ? <AdaptiveExecutionPanel report={report} /> : null}
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
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
