import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { API_CONNECTION_DIAGNOSTICS } from '../constants/apiConnection';
import { statusLabelJa } from '../services/apiConnectionStatusMapper';
import { buildApiRegistry } from '../services/apiRegistryService';
import { testAllApiRegistryConnections, testApiRegistryConnection } from '../services/apiConnectionTestService';
import type { ApiRegistryEntry, ApiRegistryId } from '../types/apiConnection';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function ApiConnectionDiagnosticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<ApiRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<ApiRegistryId | 'all' | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await buildApiRegistry();
    setEntries(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onTestOne = async (id: ApiRegistryId) => {
    setTestingId(id);
    await testApiRegistryConnection(id);
    await refresh();
    setTestingId(null);
  };

  const onTestAll = async () => {
    setTestingId('all');
    await testAllApiRegistryConnections();
    await refresh();
    setTestingId(null);
  };

  const onEdit = (id: ApiRegistryId) => {
    if (id === 'openai') {
      navigation.navigate('AiSettings');
      return;
    }
    if (id === 'twelve_data') {
      navigation.navigate('ApiKeySettings');
      return;
    }
    navigation.navigate('ApiSetupWizard');
  };

  return (
    <Screen title={API_CONNECTION_DIAGNOSTICS.screenTitle} subtitle={API_CONNECTION_DIAGNOSTICS.screenSubtitle}>
      <Card>
        <Button
          label={testingId === 'all' ? API_CONNECTION_DIAGNOSTICS.checking : API_CONNECTION_DIAGNOSTICS.testAll}
          onPress={() => void onTestAll()}
          disabled={testingId !== null}
        />
      </Card>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
      ) : (
        entries.map((row) => (
          <Card key={row.id} style={styles.rowCard}>
            <Text style={styles.name}>{row.displayName}</Text>
            <Text style={styles.status}>{statusLabelJa(row.status)}</Text>
            <Text style={styles.meta}>
              {API_CONNECTION_DIAGNOSTICS.lastChecked}:{' '}
              {row.lastCheckedAt ?? API_CONNECTION_DIAGNOSTICS.neverChecked}
            </Text>
            <Text style={styles.meta}>
              {API_CONNECTION_DIAGNOSTICS.lastSuccess}: {row.lastSuccessAt ?? '—'}
            </Text>
            {row.lastErrorMessage ? (
              <Text style={styles.error}>{row.lastErrorMessage}</Text>
            ) : null}
            {row.usesMockFallback ? (
              <Text style={styles.warn}>{API_CONNECTION_DIAGNOSTICS.mockInUse}</Text>
            ) : null}
            {row.quotaStatus ? (
              <Text style={styles.meta}>
                {API_CONNECTION_DIAGNOSTICS.quota}: {row.quotaStatus}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                onPress={() => void onTestOne(row.id)}
                disabled={testingId !== null}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>
                  {testingId === row.id
                    ? API_CONNECTION_DIAGNOSTICS.checking
                    : API_CONNECTION_DIAGNOSTICS.testOne}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onEdit(row.id)}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>{API_CONNECTION_DIAGNOSTICS.editKey}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowCard: { marginBottom: theme.spacing.sm },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  status: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: 4 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: 4 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  actionText: { color: theme.colors.primary, fontSize: theme.fontSize.sm },
  pressed: { opacity: 0.8 },
});
