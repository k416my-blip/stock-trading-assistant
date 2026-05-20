import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { RealQuantValidationPanel } from '../components/RealQuantValidationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { refreshOHLCVCache } from '../services/marketDataService';
import { clearOHLCVCache } from '../services/ohlcvCacheService';
import { runRealMarketValidation } from '../services/realMarketValidationEngine';
import type { RealQuantValidationReport } from '../types/quantValidation';
import { theme } from '../theme';

export function RealQuantValidationScreen() {
  const { twelveDataApiKey } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RealQuantValidationReport | null>(null);

  const runValidation = useCallback(
    async (forceRefresh?: boolean) => {
      setLoading(true);
      try {
        if (forceRefresh && twelveDataApiKey.trim()) {
          await refreshOHLCVCache(twelveDataApiKey, { maxSymbols: 12, forceRefresh: true });
        }
        const result = await runRealMarketValidation({ maxSymbols: 12 });
        setReport(result);
      } catch (e) {
        Alert.alert(
          '検証エラー',
          e instanceof Error ? e.message : '実市場データの取得に失敗しました',
        );
      } finally {
        setLoading(false);
      }
    },
    [twelveDataApiKey],
  );

  const onClearCache = async () => {
    await clearOHLCVCache();
    Alert.alert('キャッシュ削除', 'OHLCVキャッシュをクリアしました');
  };

  return (
    <Screen
      title="実市場検証"
      subtitle="OHLCV · モンテカルロ · テール · ギャップ · 心理ストレス"
    >
      <Card>
        <Text style={styles.note}>
          Twelve Dataから日次OHLCVを取得（分割・配当調整済み）。APIキー未設定時はキャッシュまたは合成データで検証します。サバイバーシップ・バイアスに注意してください。
        </Text>
        <Button
          label={loading ? '検証実行中…' : '実市場データで検証'}
          onPress={() => void runValidation(false)}
          disabled={loading}
        />
        <Button
          label="データを再取得"
          onPress={() => void runValidation(true)}
          variant="ghost"
          disabled={loading || !twelveDataApiKey.trim()}
        />
        <Button label="OHLCVキャッシュ削除" onPress={() => void onClearCache()} variant="ghost" />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>OHLCV取得・シミュレーション実行中…</Text>
        </Card>
      ) : null}

      {report ? <RealQuantValidationPanel report={report} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: theme.spacing.sm },
  loadingText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
