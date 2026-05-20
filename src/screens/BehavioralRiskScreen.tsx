import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BehavioralRiskPanel } from '../components/BehavioralRiskPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  refreshBehavioralRiskAnalysis,
  runDemoBehavioralRisk,
} from '../services/behavioralRiskOrchestratorService';
import { clearOperatorBehaviorState } from '../services/behavioralRiskStorage';
import type { BehavioralRiskReport } from '../types/behavioralRisk';
import { theme } from '../theme';

export function BehavioralRiskScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, practiceStats } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BehavioralRiskReport | null>(null);

  const trades = useMemo(
    () => (isPractice ? state.practice.trades : state.trades),
    [isPractice, state.practice.trades, state.trades],
  );

  const portfolioValueMYR = isPractice
    ? practiceStats.portfolioValueMYR
    : state.settings.totalCapitalMYR;
  const totalCapitalMYR = isPractice
    ? practiceStats.virtualCapitalMYR
    : state.settings.totalCapitalMYR;

  const runAnalysis = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const r = demo
          ? runDemoBehavioralRisk()
          : await refreshBehavioralRiskAnalysis({
              trades,
              riskPerTradePct: state.settings.riskPerTradePct,
              totalCapitalMYR,
              portfolioValueMYR,
              practiceStats: isPractice ? practiceStats : undefined,
              suggestedAllocationPct: state.settings.riskPerTradePct * 3,
            });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : '行動リスク分析に失敗');
      } finally {
        setLoading(false);
      }
    },
    [
      trades,
      state.settings.riskPerTradePct,
      totalCapitalMYR,
      portfolioValueMYR,
      isPractice,
      practiceStats,
    ],
  );

  const onResetState = () => {
    Alert.alert('状態リセット', '連敗・クーリング・オーバーライド履歴を消去しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: () => {
          void clearOperatorBehaviorState().then(() => setReport(null));
        },
      },
    ]);
  };

  return (
    <Screen title="行動・オペレーターリスク" subtitle="心理統制 · 規律 · 疲労">
      <Card>
        <Text style={styles.note}>
          ヒューリスティックのみ（MLなし）。リベンジ・過剰取引・連敗クーリング等で執行規律を安定化します。
        </Text>
        <Button
          label="行動リスク分析（取引履歴）"
          onPress={() => void runAnalysis(false)}
          disabled={loading}
        />
        <Button
          label="デモ分析"
          onPress={() => void runAnalysis(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="ストレス・テールへ"
          onPress={() => navigation.navigate('PortfolioStress')}
          variant="ghost"
        />
        <Button label="オペレーター状態リセット" onPress={onResetState} variant="ghost" />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>行動指標を集計中…</Text>
        </Card>
      ) : null}

      {report ? <BehavioralRiskPanel report={report} /> : null}
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
