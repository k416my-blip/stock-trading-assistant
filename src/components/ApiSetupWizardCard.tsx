import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  API_HEALTH_STATUS_LABELS_JA,
  API_SETUP_WIZARD,
  API_VERIFICATION_RESULT_LABELS_JA,
  type ApiWizardProviderConfig,
} from '../constants/apiSetupWizard';
import type { ApiProviderHealth } from '../types/apiSetup';
import { maskSecret } from '../utils/secretMask';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  config: ApiWizardProviderConfig;
  health: ApiProviderHealth;
  keyValue: string;
  onChangeKey: (value: string) => void;
  onSaveAndVerify: () => void;
  onVerifyOnly: () => void;
  busy: boolean;
};

function statusColor(status: ApiProviderHealth['status']): string {
  switch (status) {
    case 'ok':
      return theme.colors.success;
    case 'rate_limited':
      return theme.colors.warning;
    case 'connecting':
      return theme.colors.primary;
    case 'error':
      return theme.colors.danger;
    default:
      return theme.colors.textMuted;
  }
}

export function ApiSetupWizardCard({
  config,
  health,
  keyValue,
  onChangeKey,
  onSaveAndVerify,
  onVerifyOnly,
  busy,
}: Props) {
  const [visible, setVisible] = useState(false);
  const statusLabel = API_HEALTH_STATUS_LABELS_JA[health.status];
  const resultLabel = API_VERIFICATION_RESULT_LABELS_JA[health.outcome];

  const openPortal = () => {
    void Linking.openURL(config.portalUrl);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{config.nameJa}</Text>
        <View style={[styles.statusPill, { borderColor: statusColor(health.status) }]}>
          <Text style={[styles.statusText, { color: statusColor(health.status) }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.desc}>{config.descriptionJa}</Text>
      <Text style={styles.hint}>{config.keyHintJa}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>接続確認結果</Text>
        <Text style={styles.metaValue}>{resultLabel}</Text>
      </View>
      {health.lastCheckedAt ? (
        <Text style={styles.metaLine}>
          最終接続確認: {new Date(health.lastCheckedAt).toLocaleString('ja-JP')}
        </Text>
      ) : null}
      {health.quotaNoteJa ? <Text style={styles.quota}>quota: {health.quotaNoteJa}</Text> : null}
      {health.staleNoteJa ? <Text style={styles.stale}>stale: {health.staleNoteJa}</Text> : null}
      {health.pingSummaryJa ? <Text style={styles.ping}>{health.pingSummaryJa}</Text> : null}
      {keyValue.trim() ? (
        <Text style={styles.masked}>登録済み: {maskSecret(keyValue)}</Text>
      ) : null}

      <Button label={API_SETUP_WIZARD.openPortalButton} onPress={openPortal} variant="ghost" />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={keyValue}
          onChangeText={onChangeKey}
          placeholder={API_SETUP_WIZARD.keyPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!visible}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={visible ? API_SETUP_WIZARD.hideKey : API_SETUP_WIZARD.showKey}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button
          label={busy ? '確認中…' : API_SETUP_WIZARD.saveAndVerifyButton}
          onPress={onSaveAndVerify}
          disabled={busy}
        />
        <Button
          label={busy ? '確認中…' : API_SETUP_WIZARD.verifyButton}
          onPress={onVerifyOnly}
          variant="ghost"
          disabled={busy || !keyValue.trim()}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md, flex: 1 },
  statusPill: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: theme.fontSize.sm, fontWeight: '600' },
  desc: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  metaLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  metaValue: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  metaLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  quota: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
  stale: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
  ping: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  masked: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  input: {
    flex: 1,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
  eyeBtn: { padding: theme.spacing.sm },
  actions: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
});
