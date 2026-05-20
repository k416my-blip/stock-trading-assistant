import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModelStabilityPanel } from '../components/ModelStabilityPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  refreshModelStabilityAnalysis,
  runDemoModelStability,
} from '../services/modelStabilityOrchestratorService';
import { clearModelStabilityState, setControlMode } from '../services/modelStabilityStorage';
import type { ModelStabilityReport } from '../types/modelStability';
import { theme } from '../theme';

export function ModelStabilityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { aiLearningState, marketRegime, practiceStats, isPractice } = useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ModelStabilityReport | null>(null);

  const runAnalysis = useCallback(
    async (demo?: boolean) => {
      setLoading(true);
      try {
        const r = demo
          ? runDemoModelStability()
          : await refreshModelStabilityAnalysis({
              aiLearning: aiLearningState,
              regime: marketRegime,
              liveReturnEwmaPct: isPractice ? practiceStats.totalReturnPct : undefined,
            });
        setReport(r);
      } catch (e) {
        Alert.alert('エラー', e instanceof Error ? e.message : '安定性分析に失敗');
      } finally {
        setLoading(false);
      }
    },
    [aiLearningState, marketRegime, isPractice, practiceStats],
  );

  const onReset = () => {
    Alert.alert('制御状態リセット', 'スナップショット・隔離・フリーズ状態を消去しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: () => {
          void clearModelStabilityState().then(() => setReport(null));
        },
      },
    ]);
  };

  const onSafeMode = () => {
    Alert.alert('セーフモード', '学習を停止しベースライン復帰を推奨します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '有効化',
        onPress: () => {
          void setControlMode('safe').then(() => void runAnalysis(false));
        },
      },
    ]);
  };

  return (
    <Screen title="モデル安定性" subtitle="自己適応 · ドリフト · 学習隔離">
      <Card>
        <Text style={styles.note}>
          軽量統計制御のみ。暴走学習・過学習・フィードバックループを検出し、適応を安定化します。
        </Text>
        <Button label="安定性分析" onPress={() => void runAnalysis(false)} disabled={loading} />
        <Button label="デモ分析" onPress={() => void runAnalysis(true)} variant="ghost" disabled={loading} />
        <Button
          label="適応執行へ"
          onPress={() => navigation.navigate('AdaptiveExecution')}
          variant="ghost"
        />
        <Button
          label="行動リスクへ"
          onPress={() => navigation.navigate('BehavioralRisk')}
          variant="ghost"
        />
        <Button label="セーフモード有効化" onPress={onSafeMode} variant="ghost" />
        <Button label="制御状態リセット" onPress={onReset} variant="ghost" />
      </Card>

      {loading ? (
        <Card>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loading}>ドリフト · 学習率 · アンサンブルを評価中…</Text>
        </Card>
      ) : null}

      {report ? <ModelStabilityPanel report={report} /> : null}
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
