import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DataIntegrityPanel } from '../components/DataIntegrityPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  runDataIntegrityAudit,
  runDemoDataIntegrityAudit,
} from '../services/dataIntegrityOrchestratorService';
import type { DataIntegrityReport } from '../types/dataIntegrity';
import { theme } from '../theme';

export function DataIntegrityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, portfolioRevision } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DataIntegrityReport | null>(null);

  const portfolio = useMemo(() => {
    const raw = isPractice ? state.practice.portfolio : state.portfolio;
    return raw.filter((p) => p.shares > 0);
  }, [isPractice, state.practice.portfolio, state.portfolio, portfolioRevision]);

  const runAudit = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const r = demo
          ? await runDemoDataIntegrityAudit()
          : await runDataIntegrityAudit({
              portfolio,
              maxSymbols: 10,
            });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : '監査に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [portfolio],
  );

  return (
    <Screen
      title="データ整合性"
      subtitle="OHLCV修復 · ステール検出 · バイアス制御"
    >
      <Card>
        <Text style={styles.note}>
          機関投資家級のデータ衛生チェック。欠損ローソク修復、調整検証、ルックアヘッド防止、信頼度減衰を含みます。
        </Text>
        <Button
          label="整合性監査（保有+API）"
          onPress={() => void runAudit(false)}
          disabled={loading}
        />
        <Button
          label="デモ監査"
          onPress={() => void runAudit(true)}
          variant="ghost"
          disabled={loading}
        />
        <Button
          label="市場データ診断へ"
          onPress={() => navigation.navigate('MarketDataDiagnostics')}
          variant="ghost"
        />
        <Button
          label="マーケット・インテリジェンスへ"
          onPress={() => navigation.navigate('MarketIntelligence')}
          variant="ghost"
        />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>OHLCV · クォート · バイアス検査中…</Text>
        </Card>
      ) : null}

      {report ? <DataIntegrityPanel report={report} /> : null}
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
