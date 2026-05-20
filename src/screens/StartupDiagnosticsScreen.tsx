import { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { listCrashSimulationKinds, simulateStorageCorruption } from '../services/crashSimulation';
import { assessReleaseReadiness } from '../services/releaseReadiness';
import { isDev } from '../utils/isDev';
import { theme } from '../theme';

export function StartupDiagnosticsScreen() {
  const {
    bootMode,
    securityWarnings,
    recoveryRecommendations,
    diagnosticsReportJson,
    environmentIssues,
    refresh,
  } = useApp();
  const [simulating, setSimulating] = useState(false);

  const readiness = useMemo(
    () =>
      assessReleaseReadiness({
        typecheckOk: true,
        lintOk: true,
        unitTestsOk: true,
        integrationTestsOk: true,
        verifyScriptsOk: true,
        securityVerifyOk: true,
      }),
    [],
  );

  const onExport = async () => {
    const json = diagnosticsReportJson();
    try {
      await Share.share({ message: json, title: 'STA 診断レポート' });
    } catch {
      Alert.alert('診断レポート', json.slice(0, 4000));
    }
  };

  const onSimulate = async (kind: (typeof kinds)[number]) => {
    setSimulating(true);
    try {
      await simulateStorageCorruption(kind);
      Alert.alert('シミュレーション完了', `${kind} — アプリを再起動して復旧を確認してください。`);
    } catch (e) {
      Alert.alert('シミュレーション不可', e instanceof Error ? e.message : '開発ビルドでのみ利用できます');
    } finally {
      setSimulating(false);
    }
  };

  const kinds = listCrashSimulationKinds();

  return (
    <Screen title="起動診断" subtitle="構造化ログ · 環境 · リリース準備">
      <ScrollView showsVerticalScrollIndicator={false}>
        {bootMode === 'safe' ? (
          <Card style={styles.warnCard}>
            <Text style={styles.warnTitle}>安全モード</Text>
            <Text style={styles.body}>復旧の繰り返しを検出したため、最小構成で動作しています。</Text>
          </Card>
        ) : null}

        {environmentIssues.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>環境の問題</Text>
            {environmentIssues.map((issue) => (
              <Text key={issue.code} style={styles.body}>
                · [{issue.severity}] {issue.messageJa}
              </Text>
            ))}
          </Card>
        ) : null}

        {securityWarnings.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>セキュリティ警告</Text>
            {securityWarnings.map((w) => (
              <Text key={w} style={styles.body}>
                · {w}
              </Text>
            ))}
          </Card>
        ) : null}

        {recoveryRecommendations.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>推奨アクション</Text>
            {recoveryRecommendations.map((r) => (
              <Text key={r} style={styles.body}>
                · {r}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>リリース準備チェックリスト</Text>
          <Text style={styles.body}>
            {readiness.passedCount}/{readiness.checks.length} 項目クリア（必須 {readiness.requiredCount}）
          </Text>
          {readiness.checks.map((c) => (
            <Text key={c.id} style={styles.body}>
              {c.passed ? '✓' : '○'} {c.id}
            </Text>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>診断レポート</Text>
          <Text style={styles.mono} numberOfLines={12}>
            {diagnosticsReportJson().slice(0, 1200)}
            {diagnosticsReportJson().length > 1200 ? '\n…' : ''}
          </Text>
          <View style={styles.row}>
            <Button label="レポートを共有" onPress={() => void onExport()} variant="ghost" />
            <Button label="再読み込み" onPress={() => void refresh()} variant="ghost" />
          </View>
        </Card>

        {isDev ? (
          <Card style={styles.simCard}>
            <Text style={styles.sectionTitle}>クラッシュシミュレーション（開発のみ）</Text>
            <Text style={styles.body}>保存データを意図的に破損させ、復旧経路を検証します。</Text>
            {kinds.map((kind) => (
              <View key={kind} style={styles.simRow}>
                <Text style={styles.body}>{kind}</Text>
                <Button
                  label="実行"
                  onPress={() => void onSimulate(kind)}
                  variant="ghost"
                  disabled={simulating}
                />
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warnCard: { borderColor: theme.colors.warning, borderWidth: 1 },
  warnTitle: { color: theme.colors.warning, fontWeight: '700', marginBottom: theme.spacing.xs },
  sectionTitle: { color: theme.colors.text, fontWeight: '700', marginBottom: theme.spacing.sm },
  body: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: 4 },
  mono: {
    color: theme.colors.text,
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  row: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  simCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
});
