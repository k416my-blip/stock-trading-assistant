import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { MetaAllocationPanel } from '../components/MetaAllocationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import {
  runDemoMetaEnsembleAllocation,
  runMetaEnsembleAllocation,
} from '../services/metaAllocationOrchestratorService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { MetaAllocationReport } from '../types/metaAllocation';
import { theme } from '../theme';

export function MetaAllocationScreen() {
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
  const [report, setReport] = useState<MetaAllocationReport | null>(null);

  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);

  const totalValue = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;

  const runMeta = useCallback(
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
          ? await runDemoMetaEnsembleAllocation({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
            })
          : await runMetaEnsembleAllocation({
              apiKey: twelveDataApiKey,
              portfolio,
              totalPortfolioValueMYR: totalValue,
              regime: marketRegime,
              constructionReport,
            });
        setReport(result);
      } catch (e) {
        Alert.alert(
          'メタ配分エラー',
          e instanceof Error ? e.message : 'アンサンブル配分に失敗しました',
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
      title="メタ配分・アンサンブル"
      subtitle="BL · RP · CVaR · MinVar · 安定性 · BMA · フェイルセーフ"
    >
      <Card>
        <Text style={styles.note}>
          5つのアロケーション・エンジンをアンサンブルし、レジーム依存の動的重み付け・不一致スコア・信頼度ブレンド・ベイズモデル平均で統合。単一最適化フレームワークへの依存を低減します。
        </Text>
        <Button
          label={loading ? '計算中…' : 'メタ配分を実行'}
          onPress={() => void runMeta(false)}
          disabled={loading || !hasHoldings}
        />
        <Button
          label="デモユニバースで実行"
          onPress={() => void runMeta(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="ガバナンス・説明へ"
          onPress={() => navigation.navigate('Governance')}
          variant="ghost"
        />
        <Button
          label="メタ資本配分へ"
          onPress={() => navigation.navigate('MetaCapital')}
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
          <Text style={styles.loadingText}>5エンジン · BMA · メタ頑健性計算中…</Text>
        </Card>
      ) : null}

      {report ? <MetaAllocationPanel report={report} /> : null}
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
