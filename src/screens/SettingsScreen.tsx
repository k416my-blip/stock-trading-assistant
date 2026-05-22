import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
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

export function SettingsScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, resetAllAppData } = useApp();
  const [clearApiKeys, setClearApiKeys] = useState(false);
  const [resetting, setResetting] = useState(false);

  const refreshLabel =
    PRICE_REFRESH_OPTIONS.find((o) => o.minutes === state.settings.priceRefreshMinutes)?.label ??
    '15分（おすすめ）';

  const runReset = async () => {
    setResetting(true);
    try {
      await resetAllAppData(clearApiKeys);
      stackNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }], index: 0 } }],
        }),
      );
      Alert.alert('リセットが完了しました');
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

  return (
    <Screen title="設定" subtitle="API・通知・市場など">
      <Card>
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
          仮想資金・保有・売買履歴・手動注文・通知履歴・学習履歴・アプリ設定を初期化します。
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>APIキーも削除する</Text>
          <Switch
            value={clearApiKeys}
            onValueChange={setClearApiKeys}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  switchLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm, flex: 1, marginRight: theme.spacing.sm },
});
