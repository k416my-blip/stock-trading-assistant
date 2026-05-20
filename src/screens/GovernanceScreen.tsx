import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { AllocationExplainPanel } from '../components/AllocationExplainPanel';
import { GovernanceAuditLogPanel } from '../components/GovernanceAuditLogPanel';
import { GovernanceDashboardPanel } from '../components/GovernanceDashboardPanel';
import { MetaAllocationPanel } from '../components/MetaAllocationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { analyzePortfolioConstruction } from '../services/portfolioConstructionEngine';
import {
  runDemoPortfolioGovernance,
  runPortfolioGovernance,
} from '../services/portfolioGovernanceOrchestratorService';
import { clearGovernanceAuditLog } from '../services/governanceAuditService';
import { clearGovernanceState } from '../services/allocatorHysteresisService';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { PortfolioGovernanceReport } from '../types/governance';
import { theme } from '../theme';

export function GovernanceScreen() {
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
  const [report, setReport] = useState<PortfolioGovernanceReport | null>(null);
  const [auditKey, setAuditKey] = useState(0);

  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);

  const totalValue = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;

  const runGovernance = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const drawdown =
          !demo && state.settings.totalCapitalMYR > 0 && totalValue < state.settings.totalCapitalMYR
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
          ? await runDemoPortfolioGovernance({
              apiKey: twelveDataApiKey,
              regime: marketRegime,
            })
          : await runPortfolioGovernance({
              apiKey: twelveDataApiKey,
              portfolio,
              totalPortfolioValueMYR: totalValue,
              regime: marketRegime,
              constructionReport,
            });
        setReport(result);
        setAuditKey((k) => k + 1);
      } catch (e) {
        Alert.alert(
          'ガバナンスエラー',
          e instanceof Error ? e.message : 'ガバナンス実行に失敗しました',
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

  const onClearGovernance = async () => {
    await clearGovernanceState();
    await clearGovernanceAuditLog();
    setAuditKey((k) => k + 1);
    Alert.alert('リセット', 'ガバナンス状態と監査ログをクリアしました');
  };

  const hasHoldings = portfolio.length > 0;

  return (
    <Screen
      title="ガバナンス・説明"
      subtitle="説明 · ヒステリシス · 監査 · 取引停止"
    >
      <Card>
        <Text style={styles.note}>
          メタ配分の上に説明・確率レジーム・ヒステリシス・監査・ヘルスステータスを重ねます。単一最適化への依存を減らし、機関向けの説明可能な運用にします。
        </Text>
        <Button
          label={loading ? '実行中…' : 'ガバナンス分析を実行'}
          onPress={() => void runGovernance(false)}
          disabled={loading || !hasHoldings}
        />
        <Button
          label="デモで実行"
          onPress={() => void runGovernance(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="ガバナンス状態をリセット"
          onPress={() => void onClearGovernance()}
          variant="ghost"
        />
        <Button
          label="シャドー取引へ"
          onPress={() => navigation.navigate('ShadowTrading')}
          variant="ghost"
        />
        <Button
          label="可視化・モニタリング"
          onPress={() => navigation.navigate('Monitoring')}
          variant="ghost"
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>メタ配分 · 説明 · 監査記録中…</Text>
        </Card>
      ) : null}

      {report ? (
        <>
          <GovernanceDashboardPanel report={report} />
          <AllocationExplainPanel report={report} />
          <MetaAllocationPanel report={report.meta} />
          <GovernanceAuditLogPanel key={auditKey} />
        </>
      ) : (
        <GovernanceAuditLogPanel key={auditKey} />
      )}
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
  },
});
