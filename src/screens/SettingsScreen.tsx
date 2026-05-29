import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsMenuRow } from '../components/ApiKeyPromoCard';
import { PersonalUseBanner } from '../components/PersonalUseBanner';
import { PlatformClarificationCard } from '../components/PlatformClarificationCard';
import { SettingsAdvancedDisclosureSection } from '../components/SettingsAdvancedDisclosureSection';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { PRICE_REFRESH_OPTIONS } from '../constants/marketData';
import {
  APP_MODE_LIVE_ANALYSIS_LABEL,
  APP_MODE_PRACTICE_LABEL,
} from '../constants/platformClarification';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import { deleteApiKey, hasUsableKey, loadAllApiKeys, maskApiKey, saveApiKey } from '../services/apiKeys';
import { testApiConnection, type ApiConnectionState } from '../services/apiHealth';
import { runOperationalApiTest, type OperationalApiTestReport } from '../services/operationalApiTest';

export function SettingsScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, resetAllAppData } = useApp();
  const [resetting, setResetting] = useState(false);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<SupportedApiProviderId, string>>({
    openai: '',
    twelve_data: '',
    newsapi: '',
    x: '',
    alpha_vantage: '',
    finnhub: '',
    polygon: '',
    fmp: '',
  });
  const [apiConnectionStates, setApiConnectionStates] = useState<Record<SupportedApiProviderId, ApiConnectionState>>({
    openai: 'idle',
    twelve_data: 'idle',
    newsapi: 'idle',
    x: 'idle',
    alpha_vantage: 'idle',
    finnhub: 'idle',
    polygon: 'idle',
    fmp: 'idle',
  });
  const [apiConnectionMessages, setApiConnectionMessages] = useState<Record<SupportedApiProviderId, string>>({
    openai: '未確認',
    twelve_data: '未確認',
    newsapi: '未確認',
    x: '未確認',
    alpha_vantage: '未確認',
    finnhub: '未確認',
    polygon: '未確認',
    fmp: '未確認',
  });
  const [operationalRunning, setOperationalRunning] = useState(false);
  const [operationalReport, setOperationalReport] = useState<OperationalApiTestReport | null>(null);
  const [apiBusy, setApiBusy] = useState<Record<SupportedApiProviderId, boolean>>({
    openai: false,
    twelve_data: false,
    newsapi: false,
    x: false,
    alpha_vantage: false,
    finnhub: false,
    polygon: false,
    fmp: false,
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await loadAllApiKeys();
      if (!mounted) return;
      setApiKeyInputs(loaded);
      setApiConnectionMessages((prev) => {
        const next = { ...prev };
        API_PROVIDERS.forEach((provider) => {
          next[provider.id] = hasUsableKey(loaded[provider.id]) ? 'キー保存済み（未テスト）' : '未登録';
        });
        return next;
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshLabel =
    PRICE_REFRESH_OPTIONS.find((o) => o.minutes === state.settings.priceRefreshMinutes)?.label ??
    '15分（おすすめ）';

  const runReset = async () => {
    setResetting(true);
    try {
      const result = await resetAllAppData(true);
      stackNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }], index: 0 } }],
        }),
      );
      if (result.failedKeys.length > 0) {
        Alert.alert('リセットが完了しました', `削除できなかったキー: ${result.failedKeys.join(', ')}`);
      } else {
        Alert.alert('リセットが完了しました');
      }
    } finally {
      setResetting(false);
    }
  };

  const onResetPress = () => {
    Alert.alert(
      'すべてリセット',
      '本当にすべてリセットしますか？\nこの操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続ける',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '最終確認',
              'すべてのデータが削除されます。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '本当に削除します',
                  style: 'destructive',
                  onPress: () => void runReset(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const updateKeyInput = (providerId: SupportedApiProviderId, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: value }));
  };

  const onSaveApiKey = async (providerId: SupportedApiProviderId) => {
    setApiBusy((prev) => ({ ...prev, [providerId]: true }));
    try {
      await saveApiKey(providerId, apiKeyInputs[providerId]);
      const normalized = apiKeyInputs[providerId].trim();
      setApiConnectionMessages((prev) => ({
        ...prev,
        [providerId]: normalized ? '保存しました' : '未登録',
      }));
      Alert.alert('保存しました', 'APIキーを安全に保存しました。');
    } finally {
      setApiBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const onDeleteApiKey = async (providerId: SupportedApiProviderId) => {
    setApiBusy((prev) => ({ ...prev, [providerId]: true }));
    try {
      await deleteApiKey(providerId);
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
      setApiConnectionStates((prev) => ({ ...prev, [providerId]: 'idle' }));
      setApiConnectionMessages((prev) => ({ ...prev, [providerId]: '削除しました' }));
      Alert.alert('削除しました', 'APIキーを削除しました。');
    } finally {
      setApiBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const onTestApiConnection = async (providerId: SupportedApiProviderId) => {
    setApiBusy((prev) => ({ ...prev, [providerId]: true }));
    setApiConnectionStates((prev) => ({ ...prev, [providerId]: 'testing' }));
    try {
      const testResult = await testApiConnection(providerId, apiKeyInputs[providerId]);
      setApiConnectionStates((prev) => ({ ...prev, [providerId]: testResult.ok ? 'ok' : 'error' }));
      setApiConnectionMessages((prev) => ({ ...prev, [providerId]: testResult.message }));
      Alert.alert(testResult.ok ? '接続テスト成功' : '接続テスト失敗', testResult.message);
    } finally {
      setApiBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const onRunOperationalTest = async () => {
    setOperationalRunning(true);
    setOperationalReport(null);
    try {
      const report = await runOperationalApiTest();
      setOperationalReport(report);
    } catch (e) {
      Alert.alert('実運用テスト失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setOperationalRunning(false);
    }
  };

  return (
    <Screen title="設定" subtitle="API・通知・市場など">
      <Card>
        <Text style={styles.sectionTitle}>APIキー管理（設定に集約）</Text>
        <Text style={styles.sectionHint}>
          すべて端末内の SecureStore に保存します。未登録APIがあってもアプリは動作します。
        </Text>
        {API_PROVIDERS.map((provider) => {
          const masked = maskApiKey(apiKeyInputs[provider.id]);
          const state = apiConnectionStates[provider.id];
          const stateColor =
            state === 'ok'
              ? theme.colors.success
              : state === 'error'
                ? theme.colors.danger
                : state === 'testing'
                  ? theme.colors.warning
                  : theme.colors.textMuted;
          const busy = apiBusy[provider.id];
          return (
            <View key={provider.id} style={styles.apiProviderBlock}>
              <Text style={styles.apiProviderTitle}>{provider.label}</Text>
              <Text style={styles.apiHelpText}>{provider.helpText}</Text>
              <Text style={styles.apiMaskText}>保存状態: {masked}</Text>
              <Text style={[styles.apiStatusText, { color: stateColor }]}>
                接続状態: {apiConnectionMessages[provider.id]}
              </Text>
              <TextInput
                style={styles.input}
                value={apiKeyInputs[provider.id]}
                onChangeText={(value) => updateKeyInput(provider.id, value)}
                placeholder={provider.placeholder}
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <View style={styles.apiActionsRow}>
                <Button label={busy ? '処理中…' : '保存'} onPress={() => void onSaveApiKey(provider.id)} disabled={busy} />
                <Button
                  label={busy ? '処理中…' : '削除'}
                  onPress={() => void onDeleteApiKey(provider.id)}
                  disabled={busy}
                  variant="ghost"
                />
                <Button
                  label={busy ? '処理中…' : '接続テスト'}
                  onPress={() => void onTestApiConnection(provider.id)}
                  disabled={busy}
                  variant="ghost"
                />
              </View>
            </View>
          );
        })}

        <View style={styles.operationalBlock}>
          <Text style={styles.sectionTitle}>実運用テスト</Text>
          <Text style={styles.sectionHint}>
            SecureStore のキーで株価・ニュース・OpenAI・X を一括取得します。結果は Metro にも出力されます。
          </Text>
          <Button
            label={operationalRunning ? 'テスト実行中…' : '実運用テスト実行'}
            onPress={() => void onRunOperationalTest()}
            disabled={operationalRunning}
          />
          {operationalReport ? (
            <View style={styles.operationalResults}>
              <Text style={styles.operationalSummary}>
                {operationalReport.displayRows.filter((r) => r.ok).length}/{operationalReport.displayRows.length} 成功
                {' · '}
                {new Date(operationalReport.generatedAt).toLocaleString('ja-JP')}
              </Text>
              <View style={styles.operationalTableHeader}>
                <Text style={[styles.operationalColApi, styles.operationalHeaderText]}>API名</Text>
                <Text style={[styles.operationalColStatus, styles.operationalHeaderText]}>結果</Text>
                <Text style={[styles.operationalColMs, styles.operationalHeaderText]}>応答(ms)</Text>
              </View>
              {operationalReport.displayRows.map((row, index) => (
                <View key={`${row.apiName}-${index}`} style={styles.operationalTableRow}>
                  <Text style={styles.operationalColApi} numberOfLines={2}>
                    {row.apiName}
                  </Text>
                  <Text
                    style={[
                      styles.operationalColStatus,
                      { color: row.ok ? theme.colors.success : theme.colors.danger },
                    ]}
                  >
                    {row.ok ? '成功' : '失敗'}
                  </Text>
                  <Text style={styles.operationalColMs}>{row.elapsedMs}</Text>
                </View>
              ))}
              {operationalReport.displayRows.some((r) => r.detail) ? (
                <View style={styles.operationalDetails}>
                  {operationalReport.displayRows
                    .filter((r) => r.detail)
                    .map((row, index) => (
                      <Text key={`detail-${row.apiName}-${index}`} style={styles.operationalDetailLine} selectable>
                        {row.apiName}: {row.detail}
                      </Text>
                    ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <SettingsMenuRow
          icon="key"
          title="APIキー設定"
          subtitle="Twelve Data · 株価の自動取得"
          onPress={() => stackNav.navigate('ApiKeySettings')}
        />
        <SettingsMenuRow
          icon="link-outline"
          title="API設定ウィザード"
          subtitle="OpenAI · News · 決算 · Reddit · X · 接続確認"
          onPress={() => stackNav.navigate('ApiSetupWizard')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="API接続診断"
          subtitle="全APIの実接続状態 · モック理由 · 一括テスト"
          onPress={() => stackNav.navigate('ApiConnectionDiagnostics')}
        />
        <SettingsMenuRow
          icon="logo-twitter"
          title="X API 利用量"
          subtitle="節約モード · 本日の使用量 · クレジット予測"
          onPress={() => stackNav.navigate('XApiUsage')}
        />
        <SettingsMenuRow
          icon="chatbubbles-outline"
          title="AI戦略アシスタント設定"
          subtitle="OpenAI互換API · モック切替 · 会話履歴"
          onPress={() => stackNav.navigate('AiSettings')}
        />
        <SettingsMenuRow
          icon="notifications"
          title="通知設定"
          subtitle="買付・売却・損切りなどのアラート"
          onPress={() => stackNav.navigate('NotificationSettings')}
        />
        <SettingsMenuRow
          icon="globe-outline"
          title="市場設定"
          subtitle={MARKET_LABEL[state.settings.selectedMarket]}
          onPress={() => stackNav.navigate('MarketSettings')}
        />
        <SettingsMenuRow
          icon="cash-outline"
          title="通貨設定"
          subtitle="表示は MYR · 各市場の取引通貨"
          onPress={() => stackNav.navigate('CurrencySettings')}
        />
        <SettingsMenuRow
          icon="school-outline"
          title="練習モード設定"
          subtitle={isPractice ? APP_MODE_PRACTICE_LABEL : APP_MODE_LIVE_ANALYSIS_LABEL}
          onPress={() => stackNav.navigate('PracticeModeSettings')}
        />
        <SettingsMenuRow
          icon="refresh-outline"
          title="更新頻度設定"
          subtitle={`保有銘柄の株価 · ${refreshLabel}`}
          onPress={() => stackNav.navigate('UpdateFrequencySettings')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="市場データ診断"
          subtitle="株価更新・API呼び出しの統計（開発確認用）"
          onPress={() => stackNav.navigate('MarketDataDiagnostics')}
        />
        <SettingsMenuRow
          icon="document-text-outline"
          title="執行照合"
          subtitle="ジャーナルと保有の不一致 · 未確定注文"
          onPress={() => stackNav.navigate('ExecutionReconciliation')}
        />
        <SettingsMenuRow
          icon="lock-closed-outline"
          title="セキュリティ"
          subtitle="ローカル保存 · 整合性 · 機密データの削除"
          onPress={() => stackNav.navigate('SecuritySettings')}
        />
        <SettingsMenuRow
          icon="medkit-outline"
          title="起動診断"
          subtitle="構造化ログ · 環境検証 · リリース準備"
          onPress={() => stackNav.navigate('StartupDiagnostics')}
        />
        <SettingsMenuRow
          icon="shield-checkmark-outline"
          title="個人用運用"
          subtitle="バックアップ · ヘルスチェック · 緊急停止 · 実機テスト"
          onPress={() => stackNav.navigate('PersonalProduction')}
        />
        <SettingsMenuRow
          icon="speedometer-outline"
          title="Production Dashboard"
          subtitle="API · memory · queue · AI負荷 · 本番準備チェックリスト"
          onPress={() => stackNav.navigate('ProductionDashboard')}
        />
        <SettingsMenuRow
          icon="analytics-outline"
          title="歴史シミュレーション検証"
          subtitle="ウォークフォワード・ストレステスト・Sharpe/Calmar"
          onPress={() => stackNav.navigate('HistoricalValidation')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="実市場データ・クオンツ検証"
          subtitle="OHLCV · モンテカルロ · テール · ギャップ · 心理ストレス"
          onPress={() => stackNav.navigate('RealQuantValidation')}
        />
        <SettingsMenuRow
          icon="pie-chart-outline"
          title="機関ポートフォリオ最適化"
          subtitle="共分散 · リスクパリティ · CVaR · Kelly · 頑健性スコア"
          onPress={() => stackNav.navigate('PortfolioOptimization')}
        />
        <SettingsMenuRow
          icon="stats-chart-outline"
          title="ベイズ動的配分"
          subtitle="Black-Litterman · EWMA · 感度 · 信頼区間 · 頑健性ランキング"
          onPress={() => stackNav.navigate('BayesianAllocation')}
        />
        <SettingsMenuRow
          icon="layers-outline"
          title="メタ配分・アンサンブル"
          subtitle="5エンジン · BMA · 不一致 · フェイルセーフ"
          onPress={() => stackNav.navigate('MetaAllocation')}
        />
        <SettingsMenuRow
          icon="shield-checkmark-outline"
          title="ガバナンス・説明・監査"
          subtitle="配分理由 · ヒステリシス · 取引停止 · 監査ログ"
          onPress={() => stackNav.navigate('Governance')}
        />
        <SettingsMenuRow
          icon="eye-outline"
          title="シャドー取引・現実校正"
          subtitle="端末内シミュレーション · 実ブローカー注文なし"
          onPress={() => stackNav.navigate('ShadowTrading')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="可視化・モニタリング"
          subtitle="エクイティ · ドローダウン · レジーム · OMSリプレイ · ヘルス"
          onPress={() => stackNav.navigate('Monitoring')}
        />
        <SettingsMenuRow
          icon="flash-outline"
          title="適応執行・アルファ"
          subtitle="ボラターゲット · スライス · シグナル品質 · シャドー学習"
          onPress={() => stackNav.navigate('AdaptiveExecution')}
        />
        <SettingsMenuRow
          icon="globe-outline"
          title="マーケット・インテリジェンス"
          subtitle="インターマーケット · 相関 · フロー · パニック検出"
          onPress={() => stackNav.navigate('MarketIntelligence')}
        />
        <SettingsMenuRow
          icon="shield-outline"
          title="データ整合性・市場信頼性"
          subtitle="OHLCV修復 · ステール検出 · バイアス · 不良ティック"
          onPress={() => stackNav.navigate('DataIntegrity')}
        />
        <SettingsMenuRow
          icon="warning-outline"
          title="ストレス・テールリスク"
          subtitle="相関ショック · VaR/ES · デレバレッジ · 執行ゲート"
          onPress={() => stackNav.navigate('PortfolioStress')}
        />
        <SettingsMenuRow
          icon="body-outline"
          title="行動・オペレーターリスク"
          subtitle="リベンジ · 過剰取引 · 連敗クーリング · 規律スコア"
          onPress={() => stackNav.navigate('BehavioralRisk')}
        />
        <SettingsMenuRow
          icon="git-branch-outline"
          title="モデル安定性・自己適応制御"
          subtitle="ドリフト · 学習率 · 隔離 · ロールバック"
          onPress={() => stackNav.navigate('ModelStability')}
        />
        <SettingsMenuRow
          icon="pie-chart-outline"
          title="メタ資本配分"
          subtitle="戦略間資本 · 相関 · 危機保全 · シャドー"
          onPress={() => stackNav.navigate('MetaCapital')}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>詳細設定</Text>
        <Text style={styles.sectionHint}>
          個人利用の説明・初心者ガイド・リスク告知はホームではなくここに集約しています。
        </Text>
        <PersonalUseBanner />
        <PlatformClarificationCard compact />
        <SettingsAdvancedDisclosureSection />
      </Card>

      <Card style={styles.resetCard}>
        <Text style={styles.resetTitle}>すべてリセット</Text>
        <Text style={styles.resetHint}>
          仮想資金・保有・売買履歴・手動注文・通知履歴・学習履歴・アプリ設定・APIキー・キャッシュを削除します。
        </Text>
        <Button
          label="すべてのデータをリセット"
          onPress={onResetPress}
          variant="ghost"
          disabled={resetting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  sectionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  resetCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  resetTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  resetHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.sm },
  apiProviderBlock: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  apiProviderTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  apiHelpText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  apiMaskText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  apiStatusText: { fontSize: theme.fontSize.sm, fontWeight: '600' },
  apiActionsRow: { marginTop: theme.spacing.xs, gap: theme.spacing.xs },
  operationalBlock: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  operationalResults: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  operationalSummary: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  operationalTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  operationalTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  operationalHeaderText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  operationalColApi: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    paddingRight: theme.spacing.xs,
  },
  operationalColStatus: {
    width: 52,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  operationalColMs: {
    width: 72,
    textAlign: 'right',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  operationalDetails: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  operationalDetailLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xs,
  },
});
