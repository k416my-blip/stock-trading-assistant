import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MetaCapitalPanel } from '../components/MetaCapitalPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  refreshMetaCapitalAnalysis,
  runDemoMetaCapital,
} from '../services/metaCapitalOrchestratorService';
import { clearMetaCapitalState } from '../services/metaCapitalStorage';
import type { MetaCapitalReport } from '../types/metaCapital';
import { theme } from '../theme';

export function MetaCapitalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, practiceStats, buyingPower, marketRegime } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MetaCapitalReport | null>(null);

  const totalCapitalMYR = isPractice
    ? practiceStats.virtualCapitalMYR
    : state.settings.totalCapitalMYR;
  const cashBalanceMYR = isPractice ? practiceStats.cashBalanceMYR : buyingPower.buyingPowerMYR;

  const portfolioDrawdownPct = useMemo(() => {
    if (isPractice) {
      const peak = practiceStats.virtualCapitalMYR;
      return peak > 0
        ? Math.max(0, ((peak - practiceStats.portfolioValueMYR) / peak) * 100)
        : 0;
    }
    const cap = state.settings.totalCapitalMYR;
    const val = buyingPower.buyingPowerMYR;
    return cap > val ? ((cap - val) / cap) * 100 : 0;
  }, [isPractice, practiceStats, state.settings.totalCapitalMYR, buyingPower.buyingPowerMYR]);

  const runAnalysis = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const r = demo
          ? await runDemoMetaCapital(marketRegime)
          : await refreshMetaCapitalAnalysis({
              totalCapitalMYR,
              cashBalanceMYR,
              regime: marketRegime,
              practiceStats: isPractice ? practiceStats : undefined,
              portfolioDrawdownPct,
            });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : 'メタ資本配分に失敗');
      } finally {
        setLoading(false);
      }
    },
    [
      marketRegime,
      totalCapitalMYR,
      cashBalanceMYR,
      isPractice,
      practiceStats,
      portfolioDrawdownPct,
    ],
  );

  const onReset = () => {
    Alert.alert('リセット', '配分スナップショットを消去しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: () => {
          void clearMetaCapitalState().then(() => setReport(null));
        },
      },
    ]);
  };

  return (
    <Screen title="メタ資本配分" subtitle="戦略間資本 · レジーム · 保全">
      <Card>
        <Text style={styles.note}>
          戦略レベルで資本を配分。軽量統計のみ — 単一エッジ依存を抑え、レジーム変化に耐える成長を目指します。
        </Text>
        <Button label="メタ資本分析" onPress={() => void runAnalysis(false)} disabled={loading} />
        <Button label="デモ分析" onPress={() => void runAnalysis(true)} variant="ghost" disabled={loading} />
        <Button
          label="メタ配分（銘柄）へ"
          onPress={() => navigation.navigate('MetaAllocation')}
          variant="ghost"
        />
        <Button
          label="ベイズ配分へ"
          onPress={() => navigation.navigate('BayesianAllocation')}
          variant="ghost"
        />
        <Button label="スナップショットリセット" onPress={onReset} variant="ghost" />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>戦略配分 · 相関 · 保全を計算中…</Text>
        </Card>
      ) : null}

      {report ? <MetaCapitalPanel report={report} /> : null}
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
