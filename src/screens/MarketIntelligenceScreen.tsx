import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MarketIntelligencePanel } from '../components/MarketIntelligencePanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { runMarketIntelligenceAnalysis } from '../services/marketIntelligenceOrchestratorService';
import { clearMarketIntelligenceSnapshot } from '../services/marketIntelligenceStorage';
import type { MarketIntelligenceReport } from '../types/marketIntelligence';
import { theme } from '../theme';

export function MarketIntelligenceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { marketRegime } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MarketIntelligenceReport | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const r = await runMarketIntelligenceAnalysis({ regime: marketRegime, persistSnapshot: true });
      setReport(r);
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : '分析に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [marketRegime]);

  const onClearSnapshot = useCallback(async () => {
    await clearMarketIntelligenceSnapshot();
    Alert.alert('完了', '相関スナップショットをリセットしました');
  }, []);

  return (
    <Screen
      title="マーケット・インテリジェンス"
      subtitle="フロー · 相関 · レジーム · 構造変化"
    >
      <Card>
        <Text style={styles.note}>
          債券/株/コモディティ/FXの軽量代理指標のみ。相関ブレイクは前回スナップショットと比較します。
        </Text>
        <Button label="インテリジェンス分析" onPress={() => void runAnalysis()} disabled={loading} />
        <Button
          label="相関ベースラインをリセット"
          onPress={() => void onClearSnapshot()}
          variant="ghost"
        />
        <Button
          label="適応執行へ"
          onPress={() => navigation.navigate('AdaptiveExecution')}
          variant="ghost"
        />
        <Button
          label="モニタリングへ"
          onPress={() => navigation.navigate('Monitoring')}
          variant="ghost"
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>相関 · フロー · レジーム算出中…</Text>
        </Card>
      ) : null}

      {report ? <MarketIntelligencePanel report={report} /> : null}
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
