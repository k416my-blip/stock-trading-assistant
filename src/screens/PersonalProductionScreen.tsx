import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { DeviceSmokeTestPanel } from '../components/DeviceSmokeTestPanel';
import { PlatformClarificationCard } from '../components/PlatformClarificationCard';
import { useApp } from '../context/AppContext';
import type { HealthLevel } from '../services/dailyHealthCheckService';
import { confirmDestructiveAction } from '../utils/confirmDestructive';
import { theme } from '../theme';

function statusColor(level: HealthLevel): string {
  if (level === 'critical') return theme.colors.danger;
  if (level === 'warning') return theme.colors.warning;
  return theme.colors.success;
}

function overallLabelJa(level: HealthLevel): string {
  if (level === 'critical') return '重大';
  if (level === 'warning') return '注意';
  return '正常';
}

export function PersonalProductionScreen() {
  const {
    killSwitches,
    setKillSwitch,
    runHealthCheck,
    healthReport,
    exportBackupJson,
    importBackupFromJson,
    restoreLastHealthySnapshot,
    resetRequestQueue,
    readOnlyBlockedMessage,
  } = useApp();

  const [checking, setChecking] = useState(false);
  const [importText, setImportText] = useState('');

  const onHealthCheck = async () => {
    setChecking(true);
    try {
      await runHealthCheck();
    } finally {
      setChecking(false);
    }
  };

  const onExport = async () => {
    const json = await exportBackupJson();
    try {
      await Share.share({ message: json, title: 'STA バックアップ' });
    } catch {
      Alert.alert('バックアップ', `書き出しデータ（先頭）:\n${json.slice(0, 500)}…`);
    }
  };

  const onImport = () => {
    if (!importText.trim()) {
      Alert.alert('インポート', 'バックアップ JSON を貼り付けてください。');
      return;
    }
    void importBackupFromJson(importText.trim()).then((result) => {
      if (result.ok) {
        Alert.alert('完了', 'バックアップをインポートしました。');
        setImportText('');
        return;
      }
      Alert.alert('インポート失敗', result.error ?? '不明なエラー');
    });
  };

  return (
    <Screen title="個人用運用" subtitle="実運用分析のバックアップ · 診断 · 緊急停止（注文送信なし）">
      <ScrollView showsVerticalScrollIndicator={false}>
        <PlatformClarificationCard compact />
        <Card>
          <Text style={styles.sectionTitle}>ヘルスチェック</Text>
          <Text style={styles.body}>毎日1回、端末の状態を確認します。</Text>
          <Button label={checking ? '確認中…' : 'ヘルスチェック実行'} onPress={() => void onHealthCheck()} />
          {healthReport ? (
            <View style={styles.healthBox}>
              <Text style={[styles.overall, { color: statusColor(healthReport.overall) }]}>
                総合: {overallLabelJa(healthReport.overall)}
              </Text>
              {healthReport.items.map((item) => (
                <Text key={item.id} style={styles.healthLine}>
                  [{overallLabelJa(item.status)}] {item.labelJa}: {item.messageJa}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>バックアップ</Text>
          <Text style={styles.body}>
            ポートフォリオ・ウォッチリスト（手動注文）・執行ジャーナル・設定を JSON で書き出し/復元します。
          </Text>
          <Button label="エクスポート" onPress={() => void onExport()} />
          <TextInput
            style={styles.importInput}
            value={importText}
            onChangeText={setImportText}
            placeholder="インポート用 JSON を貼り付け"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <Button
            label="インポート（要確認）"
            onPress={() =>
              confirmDestructiveAction({
                title: 'バックアップをインポート',
                message: '現在のポートフォリオ・設定・ジャーナルが上書きされます。破損ファイルは拒否されます。',
                confirmLabel: 'インポート',
                onConfirm: onImport,
              })
            }
            variant="ghost"
          />
        </Card>

        <Card style={styles.dangerCard}>
          <Text style={styles.sectionTitle}>緊急停止</Text>
          <KillRow
            label="読み取り専用モード"
            hint="売買・編集・インポートをブロック"
            value={killSwitches.readOnlyMode}
            onChange={(v) => void setKillSwitch({ readOnlyMode: v })}
          />
          <KillRow
            label="株価自動更新を停止"
            value={killSwitches.disableMarketRefresh}
            onChange={(v) => void setKillSwitch({ disableMarketRefresh: v })}
          />
          <KillRow
            label="アプリ内の売買記録を停止"
            hint="証券会社への注文ではなく、端末内の記録・シミュレーション送信をブロック"
            value={killSwitches.disableTradeSubmission}
            onChange={(v) => void setKillSwitch({ disableTradeSubmission: v })}
          />
          <View style={styles.row}>
            <Button label="要求キューをリセット" onPress={resetRequestQueue} variant="ghost" />
            <Button
              label="健全スナップショット復元"
              onPress={() =>
                confirmDestructiveAction({
                  title: '健全スナップショット復元',
                  message: '最後の健全な保有スナップショットで上書きします。現在の破損データは失われる可能性があります。',
                  confirmLabel: '復元する',
                  onConfirm: () => {
                    void restoreLastHealthySnapshot().then((r) => {
                      Alert.alert(r.ok ? '復元完了' : '復元できません', r.message);
                    });
                  },
                })
              }
              variant="ghost"
            />
          </View>
          {readOnlyBlockedMessage ? (
            <Text style={styles.warn}>{readOnlyBlockedMessage}</Text>
          ) : null}
        </Card>

        <Card>
          <DeviceSmokeTestPanel />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function KillRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md, marginBottom: theme.spacing.sm },
  body: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: theme.spacing.sm },
  row: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  healthBox: { marginTop: theme.spacing.md, gap: 4 },
  overall: { fontWeight: '700', fontSize: theme.fontSize.md, marginBottom: theme.spacing.xs },
  healthLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  dangerCard: { borderColor: theme.colors.warning, borderWidth: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  switchText: { flex: 1, marginRight: theme.spacing.sm },
  switchLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  importInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    minHeight: 80,
    marginVertical: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    textAlignVertical: 'top',
  },
});
