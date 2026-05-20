import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { AdaptiveExecutionPanel } from '../components/AdaptiveExecutionPanel';
import { ShadowOmsPanel } from '../components/ShadowOmsPanel';
import { ShadowTradingPanel } from '../components/ShadowTradingPanel';
import { GovernanceDashboardPanel } from '../components/GovernanceDashboardPanel';
import { buildAdaptiveExecutionHints } from '../services/adaptiveExecutionEngine';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import {
  initializeShadowAccount,
  refreshShadowTradingDashboard,
} from '../services/shadowTradingOrchestratorService';
import { submitAndTickShadowOrder } from '../services/shadowTradingEngine';
import { loadShadowPortfolio } from '../services/shadowPortfolioStorage';
import { getNormalizedQuote } from '../services/normalizedMarketData';
import { portfolioMarketValueMYR } from '../services/portfolio';
import type { ShadowTradingReport } from '../types/shadowTrading';
import type { AdaptiveExecutionReport } from '../types/adaptiveExecution';
import type { PortfolioGovernanceReport } from '../types/governance';
import { theme } from '../theme';

export function ShadowTradingScreen() {
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
  const [report, setReport] = useState<ShadowTradingReport | null>(null);
  const [governance, setGovernance] = useState<PortfolioGovernanceReport | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveExecutionReport | null>(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [shares, setShares] = useState('10');

  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);

  const totalValue = isPractice
    ? practiceStats.portfolioValueMYR
    : portfolioMarketValueMYR(state) + buyingPower.buyingPowerMYR;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await refreshShadowTradingDashboard({
        apiKey: twelveDataApiKey,
        regime: marketRegime,
        runGovernance: true,
        portfolio,
        totalPortfolioValueMYR: totalValue,
      });
      setReport(result.report);
      setGovernance(result.governance);
      setAdaptive(result.adaptive);
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : 'シャドー更新に失敗');
    } finally {
      setLoading(false);
    }
  }, [twelveDataApiKey, marketRegime, portfolio, totalValue, portfolioRevision]);

  const onShadowBuy = async () => {
    const sh = parseInt(shares, 10);
    if (!Number.isFinite(sh) || sh <= 0) {
      Alert.alert('入力エラー', '株数を確認してください');
      return;
    }
    setLoading(true);
    try {
      const sym = symbol.trim().toUpperCase();
      let expectedPrice = 180;
      const normalized = await getNormalizedQuote('us', sym, {
        currency: 'USD',
        portfolio,
      });
      if (normalized?.price) expectedPrice = normalized.price;

      const shadowState = await loadShadowPortfolio();
      const priceBySymbol = new Map<string, { price: number; updatedAt: string }>();
      priceBySymbol.set(`us:${sym}`, {
        price: expectedPrice,
        updatedAt: new Date().toISOString(),
      });

      const adaptiveHints = adaptive ? buildAdaptiveExecutionHints(adaptive, 0) : undefined;
      const { report: r, orderRejected } = await submitAndTickShadowOrder({
        state: shadowState,
        order: {
          symbol: sym,
          market: 'us',
          currency: 'USD',
          side: 'buy',
          shares: sh,
          expectedPrice,
          priceUpdatedAt: new Date().toISOString(),
          volatilityProxyPct: marketRegime.indicators.volatilityProxyPct,
        },
        tick: {
          priceBySymbol,
          regime: marketRegime,
          governance,
        },
        adaptiveHints,
      });

      if (orderRejected) {
        Alert.alert('注文拒否', 'シャドーOMSが注文を拒否しました');
      }
      setReport(r);
      await refresh();
    } catch (e) {
      Alert.alert('注文エラー', e instanceof Error ? e.message : 'シャドー注文失敗');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    await initializeShadowAccount();
    setReport(null);
    setGovernance(null);
    setAdaptive(null);
    Alert.alert('リセット', 'シャドー口座を初期化しました');
  };

  return (
    <Screen title="シャドー取引" subtitle="現実校正 · ペーパー執行 · 資本保全">
      <Card>
        <Text style={styles.note}>
          実際のブローカー注文は送信しません。スリッページ・スプレッド・部分約定・遅延・ギャップ・流動性制限をシミュレートし、ガバナンスと連動した資本保全モードを検証します。
        </Text>
        <Button
          label={loading ? '更新中…' : 'シャドー・ダッシュボード更新'}
          onPress={() => void refresh()}
          disabled={loading}
        />
        <Button label="シャドー口座リセット" onPress={() => void onReset()} variant="ghost" />
      </Card>

      <Card>
        <Text style={styles.section}>テスト注文（US）</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={symbol}
            onChangeText={setSymbol}
            placeholder="銘柄"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={shares}
            onChangeText={setShares}
            placeholder="株数"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
        <Button
          label="シャドー買い（シミュレート）"
          onPress={() => void onShadowBuy()}
          variant="ghost"
          disabled={loading}
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
        </Card>
      ) : null}

      {report ? (
        <>
          <ShadowTradingPanel report={report} />
          <ShadowOmsPanel orders={report.recentOrders} fills={report.recentFills} />
        </>
      ) : null}

      {report && governance ? <GovernanceDashboardPanel report={governance} /> : null}
      {adaptive ? <AdaptiveExecutionPanel report={adaptive} /> : null}

      <Card>
        <Button
          label="適応執行・アルファ"
          onPress={() => navigation.navigate('AdaptiveExecution')}
          variant="ghost"
        />
        <Button
          label="可視化・モニタリングを開く"
          onPress={() => navigation.navigate('Monitoring')}
          variant="ghost"
        />
      </Card>
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
  section: { color: theme.colors.text, fontWeight: '600', marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.sm,
    color: theme.colors.text,
  },
});
