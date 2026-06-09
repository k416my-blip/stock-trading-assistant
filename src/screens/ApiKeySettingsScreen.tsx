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
import { hasSavedKey } from '../services/apiKeys';
import { safeGetApiKey } from '../services/safeApiKey';
import { theme } from '../theme';

export function ApiKeySettingsScreen() {
  const { twelveDataApiKey, analysisApiKeys, saveAnalysisApiKeys } = useApp();
  const { saveTwelveDataApiKey, testTwelveDataConnection } = usePriceSyncActions();
  const [input, setInput] = useState(twelveDataApiKey);
  const [newsKey, setNewsKey] = useState(analysisApiKeys.newsApiKey);
  const [redditKey, setRedditKey] = useState(analysisApiKeys.redditApiKey);
  const [snsKey, setSnsKey] = useState(analysisApiKeys.snsApiKey);
  const [earningsKey, setEarningsKey] = useState(analysisApiKeys.earningsApiKey);
  const [twelveSaved, setTwelveSaved] = useState(false);
  const [newsSaved, setNewsSaved] = useState(false);
  const [redditSaved, setRedditSaved] = useState(false);
  const [twelveConn, setTwelveConn] = useState<'未テスト' | '成功' | '失敗'>('未テスト');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  useEffect(() => {
    void (async () => {
      const twelve = await safeGetApiKey('twelve_data');
      const news = await safeGetApiKey('newsapi');
      const reddit = await safeGetApiKey('reddit');
      setTwelveSaved(hasSavedKey('twelve_data', twelve));
      setNewsSaved(hasSavedKey('newsapi', news));
      setRedditSaved(hasSavedKey('reddit', reddit));
      if (twelve) setInput(twelve);
      if (news) setNewsKey(news);
      if (reddit) setRedditKey(reddit);
    })();
  }, [twelveDataApiKey, analysisApiKeys.newsApiKey, analysisApiKeys.redditApiKey]);

  useEffect(() => {
    setInput(twelveDataApiKey);
  }, [twelveDataApiKey]);

  useEffect(() => {
    setNewsKey(analysisApiKeys.newsApiKey);
    setRedditKey(analysisApiKeys.redditApiKey);
    setSnsKey(analysisApiKeys.snsApiKey);
    setEarningsKey(analysisApiKeys.earningsApiKey);
  }, [analysisApiKeys]);

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
    setTwelveSaved(true);
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
          保存状態: {twelveSaved ? '保存済み' : '未保存'} · 接続状態: {twelveConn}
        </Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="APIキーを入力"
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
        <Text style={styles.statusLine}>NewsAPI 保存状態: {newsSaved ? '保存済み' : '未保存'}</Text>
        <Text style={styles.statusLine}>Reddit 保存状態: {redditSaved ? '保存済み' : '未保存'}</Text>
        <Text style={styles.subLabel}>ニュースAPIキー</Text>
        <TextInput
          style={styles.input}
          value={newsKey}
          onChangeText={setNewsKey}
          placeholder="未設定の場合は参考推定"
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
          placeholder="未設定の場合は材料分析でReddit未接続"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.subLabel}>決算APIキー</Text>
        <TextInput
          style={styles.input}
          value={earningsKey}
          onChangeText={setEarningsKey}
          placeholder="未設定の場合は参考推定"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.subLabel}>SNS APIキー</Text>
        <TextInput
          style={styles.input}
          value={snsKey}
          onChangeText={setSnsKey}
          placeholder="未設定の場合は参考推定"
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
            if (savedFields.includes('newsApiKey')) setNewsSaved(true);
            if (savedFields.includes('redditApiKey')) setRedditSaved(true);
            Alert.alert(
              savedFields.length > 0 ? '保存しました' : '保存しませんでした',
              savedFields.length > 0
                ? '分析用APIキーを端末に保存しました。'
                : '無効な入力は保存されませんでした。',
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
