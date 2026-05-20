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
import { theme } from '../theme';

export function ApiKeySettingsScreen() {
  const { twelveDataApiKey, saveTwelveDataApiKey, testTwelveDataConnection, analysisApiKeys, saveAnalysisApiKeys } =
    useApp();
  const [input, setInput] = useState(twelveDataApiKey);
  const [newsKey, setNewsKey] = useState(analysisApiKeys.newsApiKey);
  const [snsKey, setSnsKey] = useState(analysisApiKeys.snsApiKey);
  const [earningsKey, setEarningsKey] = useState(analysisApiKeys.earningsApiKey);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  useEffect(() => {
    setInput(twelveDataApiKey);
  }, [twelveDataApiKey]);

  useEffect(() => {
    setNewsKey(analysisApiKeys.newsApiKey);
    setSnsKey(analysisApiKeys.snsApiKey);
    setEarningsKey(analysisApiKeys.earningsApiKey);
  }, [analysisApiKeys]);

  const onSave = async () => {
    setSaving(true);
    await saveTwelveDataApiKey(input);
    setSaving(false);
    Alert.alert('保存しました', 'Twelve Data APIキーを端末に保存しました。');
  };

  const onTest = async () => {
    if (!input.trim()) {
      Alert.alert('APIキー未入力', MARKET_DATA_MESSAGES.checkApiKey);
      return;
    }
    setTesting(true);
    await saveTwelveDataApiKey(input);
    const result = await testTwelveDataConnection();
    setTesting(false);
    Alert.alert(result.ok ? '接続テスト成功' : '接続テスト失敗', result.message);
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
          <Button label={saving ? '保存中…' : '保存'} onPress={onSave} disabled={saving} />
          <Button
            label={testing ? 'テスト中…' : '接続テスト'}
            onPress={onTest}
            variant="ghost"
            disabled={testing || saving}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>分析用APIキー（任意）</Text>
        <Text style={styles.hint}>{API_KEY_SETTINGS.analysisOptionalNote}</Text>
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
            await saveAnalysisApiKeys({
              newsApiKey: newsKey,
              earningsApiKey: earningsKey,
              snsApiKey: snsKey,
            });
            setSavingAnalysis(false);
            Alert.alert('保存しました', '分析用APIキーを端末に保存しました。');
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
