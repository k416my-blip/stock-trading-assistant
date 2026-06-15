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
import { loadAnalysisApiKeys } from '../services/analysisApiKeys';
import { isUsableApiKey } from '../services/apiKeyValidation';
import {
  formatConfiguredStatusLine,
  loadApiKeyConfiguredStatus,
} from '../services/apiKeyUiState';
import { maskSecret } from '../utils/secretMask';
import { theme } from '../theme';

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function formatAnalysisKeyStatus(key: string): string {
  return isUsableApiKey(key) ? `設定済み（${maskSecret(key)}）` : '未設定';
}

export function ApiKeySettingsScreen() {
  const { saveAnalysisApiKeys, reloadStoredApiKeys, saveAiApiKey, testAiApiConnection } = useApp();
  const { saveTwelveDataApiKey, testTwelveDataConnection } = usePriceSyncActions();

  const [openAiInput, setOpenAiInput] = useState('');
  const [twelveInput, setTwelveInput] = useState('');
  const [newsKey, setNewsKey] = useState('');
  const [redditKey, setRedditKey] = useState('');
  const [finnhubKey, setFinnhubKey] = useState('');
  const [xKey, setXKey] = useState('');

  const [openAiStatus, setOpenAiStatus] = useState('未設定');
  const [twelveStatus, setTwelveStatus] = useState('未設定');
  const [newsStatus, setNewsStatus] = useState('未設定');
  const [redditStatus, setRedditStatus] = useState('未設定');
  const [finnhubStatus, setFinnhubStatus] = useState('未設定');
  const [xStatus, setXStatus] = useState('未設定');

  const [openAiConn, setOpenAiConn] = useState<'未テスト' | '成功' | '失敗'>('未テスト');
  const [twelveConn, setTwelveConn] = useState<'未テスト' | '成功' | '失敗'>('未テスト');

  const [savingOpenAi, setSavingOpenAi] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [savingTwelve, setSavingTwelve] = useState(false);
  const [testingTwelve, setTestingTwelve] = useState(false);
  const [savingOptional, setSavingOptional] = useState(false);

  const refreshStatuses = async () => {
    const [openai, twelve, news, reddit, x, analysis] = await Promise.all([
      loadApiKeyConfiguredStatus('openai'),
      loadApiKeyConfiguredStatus('twelve_data'),
      loadApiKeyConfiguredStatus('newsapi'),
      loadApiKeyConfiguredStatus('reddit'),
      loadApiKeyConfiguredStatus('x'),
      loadAnalysisApiKeys(),
    ]);
    setOpenAiStatus(formatConfiguredStatusLine(openai));
    setTwelveStatus(formatConfiguredStatusLine(twelve));
    setNewsStatus(formatConfiguredStatusLine(news));
    setRedditStatus(formatConfiguredStatusLine(reddit));
    setXStatus(formatConfiguredStatusLine(x));
    setFinnhubStatus(formatAnalysisKeyStatus(analysis.earningsApiKey));
  };

  useEffect(() => {
    void refreshStatuses();
  }, []);

  const onSaveOpenAi = async () => {
    setSavingOpenAi(true);
    const saveResult = await saveAiApiKey(openAiInput);
    setSavingOpenAi(false);
    if (!saveResult.saved) {
      Alert.alert(
        '保存しませんでした',
        '空欄・マスク表示・10文字未満は保存されません。既存キーは保持されます。',
      );
      return;
    }
    setOpenAiInput('');
    await reloadStoredApiKeys();
    await refreshStatuses();
    setOpenAiConn('未テスト');
    Alert.alert('保存しました', 'OpenAI APIキーを端末に保存しました。');
  };

  const onTestOpenAi = async () => {
    setTestingOpenAi(true);
    const result = await testAiApiConnection();
    setTestingOpenAi(false);
    setOpenAiConn(result.ok ? '成功' : '失敗');
    Alert.alert(
      result.ok ? '接続テスト成功' : '接続テスト失敗',
      result.ok ? result.messageJa : result.messageJa || '実API接続失敗',
    );
  };

  const onSaveTwelve = async () => {
    setSavingTwelve(true);
    const saveResult = await saveTwelveDataApiKey(twelveInput);
    setSavingTwelve(false);
    if (!saveResult.saved) {
      Alert.alert(
        '保存しませんでした',
        '空欄・マスク表示・10文字未満は保存されません。既存キーは保持されます。',
      );
      return;
    }
    setTwelveInput('');
    await reloadStoredApiKeys();
    await refreshStatuses();
    setTwelveConn('未テスト');
    Alert.alert('保存しました', 'Twelve Data APIキーを端末に保存しました。');
  };

  const onTestTwelve = async () => {
    setTestingTwelve(true);
    const result = await testTwelveDataConnection();
    setTestingTwelve(false);
    setTwelveConn(result.ok ? '成功' : '失敗');
    Alert.alert(
      result.ok ? '接続テスト成功' : '接続テスト失敗',
      result.ok ? result.message : '実API接続失敗',
    );
  };

  const onSaveOptional = async () => {
    setSavingOptional(true);
    const { savedFields } = await saveAnalysisApiKeys({
      newsApiKey: newsKey,
      redditApiKey: redditKey,
      earningsApiKey: finnhubKey,
      xApiKey: xKey,
    });
    setSavingOptional(false);
    if (savedFields.length > 0) {
      setNewsKey('');
      setRedditKey('');
      setFinnhubKey('');
      setXKey('');
      await reloadStoredApiKeys();
      await refreshStatuses();
    }
    Alert.alert(
      savedFields.length > 0 ? '保存しました' : '保存しませんでした',
      savedFields.length > 0
        ? `保存した項目: ${savedFields.join(', ')}`
        : '無効な入力は保存されませんでした。既存キーは保持されます。',
    );
  };

  return (
    <Screen title="APIキー設定" subtitle="必須・任意 API の登録">
      <BeginnerWarningBanner />
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <Ionicons name="key" size={28} color={theme.colors.primary} />
          <Text style={styles.heroHint}>{API_KEY_SETTINGS.needKeyHint}</Text>
        </View>
        <Text style={styles.steps}>{API_KEY_SETTINGS.beginnerSteps}</Text>
      </Card>

      <Card>
        <SectionTitle>{API_KEY_SETTINGS.requiredSectionTitle}</SectionTitle>
        <Text style={styles.hint}>{API_KEY_SETTINGS.requiredSectionNote}</Text>

        <Text style={styles.label}>OpenAI API</Text>
        <Text style={styles.statusLine}>
          保存状態: {openAiStatus} · 接続状態: {openAiConn}
        </Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.openAiHint}</Text>
        <TextInput
          style={styles.input}
          value={openAiInput}
          onChangeText={setOpenAiInput}
          placeholder="新しい OpenAI キー（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={styles.actions}>
          <Button
            label={savingOpenAi ? '保存中…' : '保存'}
            onPress={() => void onSaveOpenAi()}
            disabled={savingOpenAi}
          />
          <Button
            label={testingOpenAi ? 'テスト中…' : '接続テスト'}
            onPress={() => void onTestOpenAi()}
            variant="ghost"
            disabled={testingOpenAi || savingOpenAi}
          />
          <Button
            label="OpenAI キー取得"
            onPress={() => void Linking.openURL(API_KEY_SETTINGS.openAiUrl)}
            variant="ghost"
          />
        </View>

        <Text style={[styles.label, styles.fieldGap]}>Twelve Data API</Text>
        <Text style={styles.statusLine}>
          保存状態: {twelveStatus} · 接続状態: {twelveConn}
        </Text>
        <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.twelveDataHint}</Text>
        <TextInput
          style={styles.input}
          value={twelveInput}
          onChangeText={setTwelveInput}
          placeholder="新しい Twelve Data キー（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={styles.actions}>
          <Button
            label={savingTwelve ? '保存中…' : '保存'}
            onPress={() => void onSaveTwelve()}
            disabled={savingTwelve}
          />
          <Button
            label={testingTwelve ? 'テスト中…' : '接続テスト'}
            onPress={() => void onTestTwelve()}
            variant="ghost"
            disabled={testingTwelve || savingTwelve}
          />
          <Button
            label={API_KEY_SETTINGS.getKeyButton}
            onPress={() => void Linking.openURL(API_KEY_SETTINGS.twelveDataUrl)}
            variant="ghost"
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>{API_KEY_SETTINGS.optionalSectionTitle}</SectionTitle>
        <Text style={styles.hint}>{API_KEY_SETTINGS.optionalSectionNote}</Text>

        <Text style={styles.subLabel}>NewsAPI</Text>
        <Text style={styles.statusLine}>保存状態: {newsStatus}</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.newsApiHint}</Text>
        <TextInput
          style={styles.input}
          value={newsKey}
          onChangeText={setNewsKey}
          placeholder="NewsAPI キー（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={styles.subLabel}>Reddit</Text>
        <Text style={styles.statusLine}>保存状態: {redditStatus}</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.redditHint}</Text>
        <TextInput
          style={styles.input}
          value={redditKey}
          onChangeText={setRedditKey}
          placeholder="Reddit Bearer トークン（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={styles.subLabel}>Finnhub APIキー</Text>
        <Text style={styles.statusLine}>保存状態: {finnhubStatus}</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.finnhubHint}</Text>
        <TextInput
          style={styles.input}
          value={finnhubKey}
          onChangeText={setFinnhubKey}
          placeholder="Finnhub トークン（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={styles.subLabel}>X API</Text>
        <Text style={styles.statusLine}>保存状態: {xStatus}</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.xApiHint}</Text>
        <TextInput
          style={styles.input}
          value={xKey}
          onChangeText={setXKey}
          placeholder="X Bearer Token（空欄保存=既存キー保持）"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />

        <View style={styles.actions}>
          <Button
            label={savingOptional ? '保存中…' : '任意キーを保存'}
            onPress={() => void onSaveOptional()}
            disabled={savingOptional}
            variant="ghost"
          />
          <Button
            label="Finnhub 登録"
            onPress={() => void Linking.openURL(API_KEY_SETTINGS.finnhubUrl)}
            variant="ghost"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderColor: theme.colors.primary, borderWidth: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  heroHint: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    lineHeight: 22,
  },
  steps: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  note: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.xs },
  label: { color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  fieldGap: { marginTop: theme.spacing.lg },
  statusLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  subLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: 4,
  },
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
