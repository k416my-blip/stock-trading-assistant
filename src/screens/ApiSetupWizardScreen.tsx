import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { ApiSetupWizardCard } from '../components/ApiSetupWizardCard';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import {
  API_SETUP_WIZARD,
  API_WIZARD_PROVIDERS,
  API_HEALTH_STATUS_LABELS_JA,
} from '../constants/apiSetupWizard';
import { useApp } from '../context/AppContext';
import type { ApiProviderId } from '../types/apiSetup';
import { theme } from '../theme';

export function ApiSetupWizardScreen() {
  const { apiHealthDashboard, refreshApiHealth, saveWizardApiKeyAndVerify, verifyWizardApiProvider } =
    useApp();
  const [keys, setKeys] = useState<Record<ApiProviderId, string>>({
    openai: '',
    news: '',
    earnings: '',
    reddit: '',
    x: '',
  });
  const [busyId, setBusyId] = useState<ApiProviderId | null>(null);

  const loadKeys = useCallback(async () => {
    const { loadAllWizardKeys } = await import('../services/apiSetupWizardService');
    const loaded = await loadAllWizardKeys();
    setKeys(loaded);
  }, []);

  useEffect(() => {
    void loadKeys();
    void refreshApiHealth();
  }, [loadKeys, refreshApiHealth]);

  const runSaveAndVerify = async (providerId: ApiProviderId) => {
    setBusyId(providerId);
    try {
      const health = await saveWizardApiKeyAndVerify(providerId, keys[providerId]);
      await refreshApiHealth();
      Alert.alert(
        health.status === 'ok' ? '接続成功' : '接続確認',
        `${API_HEALTH_STATUS_LABELS_JA[health.status]} — ${health.messageJa}`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const runVerifyOnly = async (providerId: ApiProviderId) => {
    setBusyId(providerId);
    try {
      const health = await verifyWizardApiProvider(providerId, keys[providerId]);
      await refreshApiHealth();
      Alert.alert('接続確認', `${API_HEALTH_STATUS_LABELS_JA[health.status]} — ${health.messageJa}`);
    } finally {
      setBusyId(null);
    }
  };

  const dash = apiHealthDashboard;

  return (
    <Screen title={API_SETUP_WIZARD.screenTitle} subtitle={API_SETUP_WIZARD.screenSubtitle}>
      <Card style={styles.noticeCard}>
        <Text style={styles.notice}>{API_SETUP_WIZARD.safetyNotice}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{API_SETUP_WIZARD.healthDashboardTitle}</Text>
        <Text style={styles.sectionHint}>{API_SETUP_WIZARD.healthDashboardHint}</Text>
        <Text style={styles.summary}>{dash.summaryJa}</Text>
        {dash.anyQuotaLimited ? (
          <Text style={styles.warn}>quota低下が検出されています。利用量を確認してください。</Text>
        ) : null}
        {dash.anyStaleWarning ? (
          <Text style={styles.warn}>stale: 接続確認が古いAPIがあります。再検証をおすすめします。</Text>
        ) : null}
        {dash.degradedByApis ? (
          <Text style={styles.warn}>
            一部API不調時はモック応答・キャッシュ・stale警告にフォールバックします（投資ロジックは変更しません）。
          </Text>
        ) : null}
      </Card>

      {API_WIZARD_PROVIDERS.map((config) => (
        <ApiSetupWizardCard
          key={config.id}
          config={config}
          health={dash.providers[config.id]}
          keyValue={keys[config.id]}
          onChangeKey={(value) => setKeys((prev) => ({ ...prev, [config.id]: value }))}
          onSaveAndVerify={() => void runSaveAndVerify(config.id)}
          onVerifyOnly={() => void runVerifyOnly(config.id)}
          busy={busyId === config.id}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeCard: { borderColor: theme.colors.border },
  notice: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
  sectionTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  sectionHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  summary: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    fontFamily: 'monospace',
  },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.sm },
});
