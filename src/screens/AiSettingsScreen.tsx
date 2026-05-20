import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AI_EXPLANATION_LEVEL_HINTS_JA,
  AI_EXPLANATION_LEVEL_LABELS_JA,
  AI_EXPLANATION_LEVEL_ORDER,
  type AiExplanationLevel,
} from '../constants/aiExplanationLevel';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { AI_SETTINGS } from '../constants/aiSettings';
import { AI_PERSONAL_SAFETY_FOOTER } from '../constants/aiStrategyBriefing';
import { statusLabelJa } from '../services/apiConnectionStatusMapper';
import { useApp } from '../context/AppContext';
import type { ApiConnectionStatus } from '../types/apiConnection';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function AiSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    aiApiKey,
    aiPreferences,
    saveAiApiKey,
    saveAiPreferences,
    clearAiChatHistory,
    testAiApiConnection,
    apiHealthDashboard,
  } = useApp();
  const [keyInput, setKeyInput] = useState(aiApiKey);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus>('not_configured');
  const [connectionMessage, setConnectionMessage] = useState('');

  const syncStatusFromDashboard = useCallback(() => {
    const row = apiHealthDashboard.providers.openai;
    if (!aiApiKey.trim()) {
      setConnectionStatus('not_configured');
      setConnectionMessage('APIキー未設定');
      return;
    }
    if (!row.lastCheckedAt) {
      setConnectionStatus('key_saved_unverified');
      setConnectionMessage(AI_SETTINGS.keySavedUnverified);
      return;
    }
    if (row.outcome === 'success') {
      setConnectionStatus('connected');
      setConnectionMessage(AI_SETTINGS.connectionTestSuccess);
      return;
    }
    if (row.outcome === 'invalid_key') {
      setConnectionStatus('auth_error');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'rate_limited') {
      setConnectionStatus('rate_limited');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'timeout') {
      setConnectionStatus('timeout');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'parse_error') {
      setConnectionStatus('parse_error');
      setConnectionMessage(row.messageJa);
      return;
    }
    setConnectionStatus('network_error');
    setConnectionMessage(row.messageJa);
  }, [aiApiKey, apiHealthDashboard.providers.openai]);

  useEffect(() => {
    setKeyInput(aiApiKey);
    syncStatusFromDashboard();
  }, [aiApiKey, syncStatusFromDashboard]);

  const onSaveKey = async () => {
    setSaving(true);
    await saveAiApiKey(keyInput);
    setSaving(false);
    syncStatusFromDashboard();
    Alert.alert('保存しました', AI_SETTINGS.savedKey);
  };

  const onTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('checking');
    setConnectionMessage(AI_SETTINGS.connectionTesting);
    try {
      const result = await testAiApiConnection();
      setConnectionStatus(result.connectionStatus);
      setConnectionMessage(result.messageJa);
      Alert.alert(result.ok ? '接続成功' : '接続失敗', result.messageJa);
    } finally {
      setTesting(false);
    }
  };

  const onToggleEnabled = async (value: boolean) => {
    await saveAiPreferences({ aiEnabled: value });
  };

  const onToggleMockOnly = async (value: boolean) => {
    await saveAiPreferences({ mockOnly: value });
  };

  const onSelectExplanationLevel = async (level: AiExplanationLevel) => {
    await saveAiPreferences({ aiExplanationLevel: level });
  };

  const selectedLevel = aiPreferences.aiExplanationLevel;

  const onClearHistory = () => {
    Alert.alert('会話履歴のクリア', AI_SETTINGS.clearHistoryConfirm, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'クリア',
        style: 'destructive',
        onPress: () => {
          void clearAiChatHistory().then(() => {
            Alert.alert(AI_SETTINGS.clearHistoryDone);
          });
        },
      },
    ]);
  };

  return (
    <Screen title={AI_SETTINGS.screenTitle} subtitle={AI_SETTINGS.screenSubtitle}>
      <BeginnerWarningBanner />
      <Card>
        <Text style={styles.badge}>{AI_SETTINGS.personalLabel}</Text>
        <Text style={styles.footer}>{AI_PERSONAL_SAFETY_FOOTER}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.aiEnabledLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.aiEnabledHint}</Text>
          </View>
          <Switch
            value={aiPreferences.aiEnabled}
            onValueChange={(v) => void onToggleEnabled(v)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.mockOnlyLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.mockOnlyHint}</Text>
          </View>
          <Switch
            value={aiPreferences.mockOnly}
            onValueChange={(v) => void onToggleMockOnly(v)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.apiKeyLabel}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.apiKeyHint}</Text>
        <TextInput
          style={styles.input}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder={AI_SETTINGS.apiKeyPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.statusLine}>
          {AI_SETTINGS.connectionStatusLabel}: {statusLabelJa(connectionStatus)}
        </Text>
        {connectionMessage ? <Text style={styles.statusDetail}>{connectionMessage}</Text> : null}
        <Button label={saving ? '保存中…' : AI_SETTINGS.saveKey} onPress={onSaveKey} disabled={saving} />
        <View style={styles.btnGap} />
        <Button
          label={testing ? AI_SETTINGS.connectionTesting : AI_SETTINGS.connectionTestButton}
          onPress={() => void onTestConnection()}
          disabled={testing || saving}
          variant="ghost"
        />
        <View style={styles.btnGap} />
        <Button
          label={AI_SETTINGS.openDiagnostics}
          onPress={() => navigation.navigate('ApiConnectionDiagnostics')}
          variant="ghost"
        />
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.explanationLevelLabel}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.explanationLevelHint}</Text>
        <Text style={styles.currentSelection}>
          {AI_SETTINGS.explanationLevelCurrent}: {AI_EXPLANATION_LEVEL_LABELS_JA[selectedLevel]}
        </Text>
        {AI_EXPLANATION_LEVEL_ORDER.map((level, index) => (
          <Pressable
            key={level}
            onPress={() => void onSelectExplanationLevel(level)}
            style={({ pressed }) => [
              styles.optionRow,
              index < AI_EXPLANATION_LEVEL_ORDER.length - 1 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              selectedLevel === level && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[styles.optionLabel, selectedLevel === level && styles.optionLabelSelected]}
              >
                {AI_EXPLANATION_LEVEL_LABELS_JA[level]}
              </Text>
              <Text style={styles.optionHint}>{AI_EXPLANATION_LEVEL_HINTS_JA[level]}</Text>
            </View>
            {selectedLevel === level ? <Text style={styles.check}>✓</Text> : <View style={styles.radioOff} />}
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.dataTitle}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.dataBody}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.voiceEnabledLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.voiceEnabledHint}</Text>
          </View>
          <Switch
            value={aiPreferences.voiceEnabled}
            onValueChange={(v) => void saveAiPreferences({ voiceEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.voiceAutoReadLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.voiceAutoReadHint}</Text>
          </View>
          <Switch
            value={aiPreferences.voiceAutoRead}
            onValueChange={(v) => void saveAiPreferences({ voiceAutoRead: v })}
            disabled={!aiPreferences.voiceEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <Text style={styles.label}>{AI_SETTINGS.voiceRateLabel}</Text>
        <View style={styles.rateRow}>
          {(
            [
              { rate: 0.75, label: AI_SETTINGS.voiceRateSlow },
              { rate: 1, label: AI_SETTINGS.voiceRateNormal },
              { rate: 1.35, label: AI_SETTINGS.voiceRateFast },
            ] as const
          ).map(({ rate, label }) => (
            <Pressable
              key={label}
              onPress={() => void saveAiPreferences({ voiceSpeechRate: rate })}
              style={({ pressed }) => [
                styles.rateChip,
                aiPreferences.voiceSpeechRate === rate && styles.rateChipActive,
                pressed && styles.optionRowPressed,
              ]}
            >
              <Text
                style={[
                  styles.rateChipText,
                  aiPreferences.voiceSpeechRate === rate && styles.rateChipTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.urgentAlertsTitle}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.urgentAlertsHint}</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.urgentVibrationLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.urgentVibrationHint}</Text>
          </View>
          <Switch
            value={aiPreferences.urgentVibrationEnabled}
            onValueChange={(v) => void saveAiPreferences({ urgentVibrationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.urgentSoundLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.urgentSoundHint}</Text>
          </View>
          <Switch
            value={aiPreferences.urgentSoundEnabled}
            onValueChange={(v) => void saveAiPreferences({ urgentSoundEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Button label={AI_SETTINGS.clearHistory} onPress={onClearHistory} variant="ghost" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  footer: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rowText: { flex: 1 },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statusLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  statusDetail: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4, marginBottom: theme.spacing.sm },
  btnGap: { height: theme.spacing.xs },
  currentSelection: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  optionRowPressed: { opacity: 0.88 },
  optionRowSelected: {
    backgroundColor: theme.colors.surfaceElevated,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  optionBody: { flex: 1 },
  optionLabel: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  optionLabelSelected: { color: theme.colors.primary },
  optionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  radioOff: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  check: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.lg },
  rateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  rateChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  rateChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  rateChipText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  rateChipTextActive: { color: theme.colors.primary },
});
