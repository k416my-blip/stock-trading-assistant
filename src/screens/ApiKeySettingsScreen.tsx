import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { API_KEY_SETTINGS } from '../constants/apiSettings';
import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import { useApp } from '../context/AppContext';
import { usePriceSyncActions } from '../context/PriceSyncContext';
import {
  formatConfiguredStatusLine,
  loadApiKeyConfiguredStatus,
} from '../services/apiKeyUiState';
import { theme } from '../theme';

export function ApiKeySettingsScreen() {
  const { saveAnalysisApiKeys, reloadStoredApiKeys } = useApp();
  const { saveTwelveDataApiKey, testTwelveDataConnection } = usePriceSyncActions();
  const [input, setInput] = useState('');
  const [newsKey, setNewsKey] = useState('');
  const [redditKey, setRedditKey] = useState('');
  const [snsKey, setSnsKey] = useState('');
  const [earningsKey, setEarningsKey] = useState('');
  const [twelveStatus, setTwelveStatus] = useState('未設定');
  const [newsStatus, setNewsStatus] = useState('未設定');
  const [redditStatus, setRedditStatus] = useState('未設定');
  const [twelveConn, setTwelveConn] = useState<'未テスト' | '成功' | '失敗'>('未テスト');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  const refreshStatuses = async () => {
    const [twelve, news, reddit] = await Promise.all([
      loadApiKeyConfiguredStatus('twelve_data'),
      loadApiKeyConfiguredStatus('newsapi'),
      loadApiKeyConfiguredStatus('reddit'),
    ]);
    setTwelveStatus(formatConfiguredStatusLine(twelve));
    setNewsStatus(formatConfiguredStatusLine(news));
    setRedditStatus(formatConfiguredStatusLine(reddit));
  };

  useEffect(() => {
    void refreshStatuses();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const saveResult = await saveTwelveDataApiKey(input);
    setSaving(false);
    if (!saveResult.saved) {
      Alert.alert(
        '保存しませんでした',
        '空欄・マスク表示・10文字未満は保存されません。既存キーは保持されます。',
      );
      return;
    }
    setInput('');
    await reloadStoredApiKeys();
    await refreshStatuses();
    setTwelveConn('未テスト');
    Alert.alert('保存しました', 'Twelve Data APIキーを端末に保存しました。');
  };

  const onTest = async () => {
    setTesting(true);
    const result = await testTwelveDataConnection();
    setTesting(false);
    setTwelveConn(result.ok ? '成功' : '失敗');
    Alert.alert(
      result.ok ? '接続テスト成功' : '接続テスト失敗',
      result.ok ? result.message : '実API接続失敗',
    );
  };

  const openTwelveData = () => {
    void Linking.openURL(API_KEY_SETTINGS.twelveDataUrl);
  };

  return (
    <Screen title="APIキー設定" subtitle="Twelve Data（株価・為替の参考データ）">
      <BeginnerWarningBanner />
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <Ionicons name="settings" size={28} color={theme.colors.primary} />
          <Text style={styles.heroHint}>{API_KEY_SETTINGS.needKeyHint}</Text>
        </View>
        <Text style={styles.steps}>{API_KEY_SETTINGS.beginnerSteps}</Text>
        <Button label={API_KEY_SETTINGS.getKeyButton} onPress={openTwelveData} variant="ghost" />
      </Card>

      <Card>
        <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
        <Text style={styles.hint}>
          Twelve Dataの無料APIキーを取得して入力してください。キーはこの端末にのみ保存され、Rakuten
          Tradeには接続しません。
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>Twelve Data APIキー</Text>
        <Text style={styles.statusLine}>
          保存状態: {twelveStatus} · 接続状態: {twelveConn}
        </Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="新しいAPIキーを入力（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={styles.actions}>
          <Button label={saving ? '保存中…' : '保存'} onPress={() => void onSave()} disabled={saving} />
          <Button
            label={testing ? 'テスト中…' : '接続テスト'}
            onPress={() => void onTest()}
            variant="ghost"
            disabled={testing || saving}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>分析用APIキー（任意）</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.analysisOptionalNote}</Text>
        <Text style={styles.statusLine}>NewsAPI: {newsStatus}</Text>
        <Text style={styles.statusLine}>Reddit: {redditStatus}</Text>
        <Text style={styles.subLabel}>ニュースAPIキー</Text>
        <TextInput
          style={styles.input}
          value={newsKey}
          onChangeText={setNewsKey}
          placeholder="新しいキーを入力（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.subLabel}>Reddit Bearerトークン</Text>
        <Text style={styles.hint}>
          任意。未設定でも材料分析は Reddit RSS で話題を取得します（API登録不要）。
        </Text>
        <TextInput
          style={styles.input}
          value={redditKey}
          onChangeText={setRedditKey}
          placeholder="新しいトークンを入力（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.subLabel}>決算APIキー</Text>
        <TextInput
          style={styles.input}
          value={earningsKey}
          onChangeText={setEarningsKey}
          placeholder="新しいキーを入力（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.subLabel}>SNS APIキー</Text>
        <TextInput
          style={styles.input}
          value={snsKey}
          onChangeText={setSnsKey}
          placeholder="新しいキーを入力（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Button
          label={savingAnalysis ? '保存中…' : '分析用キーを保存'}
          onPress={async () => {
            setSavingAnalysis(true);
            const { savedFields } = await saveAnalysisApiKeys({
              newsApiKey: newsKey,
              redditApiKey: redditKey,
              earningsApiKey: earningsKey,
              snsApiKey: snsKey,
            });
            setSavingAnalysis(false);
            if (savedFields.length > 0) {
              setNewsKey('');
              setRedditKey('');
              setEarningsKey('');
              setSnsKey('');
              await reloadStoredApiKeys();
              await refreshStatuses();
            }
            Alert.alert(
              savedFields.length > 0 ? '保存しました' : '保存しませんでした',
              savedFields.length > 0
                ? '分析用APIキーを端末に保存しました。'
                : '無効な入力は保存されませんでした。既存キーは保持されます。',
            );
          }}
          disabled={savingAnalysis}
          variant="ghost"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderColor: theme.colors.primary, borderWidth: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  heroHint: { flex: 1, color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600', lineHeight: 22 },
  steps: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.md },
  note: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: '600', marginBottom: theme.spacing.sm },
  statusLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  subLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  actions: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
});
