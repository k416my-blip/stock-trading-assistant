import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { maskSecret } from '../utils/secretMask';
import { theme } from '../theme';

export function SecuritySettingsScreen() {
  const {
    twelveDataApiKey,
    analysisApiKeys,
    securityWarnings,
    bootMode,
    clearSensitiveLocalData,
  } = useApp();

  const onClearSensitive = () => {
    Alert.alert(
      '機密データを削除',
      'APIキーと執行ジャーナルをこの端末から削除します。ポートフォリオ本体は残ります。続行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void clearSensitiveLocalData().then(() => {
              Alert.alert('完了', 'ローカルの機密データを削除しました。');
            });
          },
        },
      ],
    );
  };

  return (
    <Screen title="セキュリティ" subtitle="ローカル保存・整合性・免責">
      {bootMode === 'safe' ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>安全モード</Text>
          <Text style={styles.warnBody}>
            復旧の繰り返し失敗を検出したため、最小構成で起動しています。設定からデータを確認してください。
          </Text>
        </Card>
      ) : null}

      {securityWarnings.length > 0 ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>保存データの警告</Text>
          {securityWarnings.map((w) => (
            <Text key={w} style={styles.warnBody}>
              · {w}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <View style={styles.row}>
          <Ionicons name="phone-portrait-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>ローカル専用ストレージ</Text>
        </View>
        <Text style={styles.body}>
          ポートフォリオ・設定・APIキーはこの端末のローカルストレージにのみ保存されます。クラウド同期や自動バックアップは行いません。
        </Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <Ionicons name="cloud-offline-outline" size={22} color={theme.colors.warning} />
          <Text style={styles.sectionTitle}>バックアップの制限</Text>
        </View>
        <Text style={styles.body}>
          端末の紛失・初期化・OSアップデートでデータが消える可能性があります。重要な記録は別途エクスポートしてください。
        </Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <Ionicons name="shield-outline" size={22} color={theme.colors.textMuted} />
          <Text style={styles.sectionTitle}>非ブローカー環境</Text>
        </View>
        <Text style={styles.body}>
          本アプリは証券会社・ブローカーAPIに接続しません。分析支援・記録・執行シミュレーションのみで、実際の注文は証券会社アプリ側でユーザー自身が行います。
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>保存中のキー（マスク表示）</Text>
        <Text style={styles.maskLine}>Twelve Data: {maskSecret(twelveDataApiKey)}</Text>
        <Text style={styles.maskLine}>News: {maskSecret(analysisApiKeys.newsApiKey)}</Text>
        <Text style={styles.maskLine}>SNS (legacy): {maskSecret(analysisApiKeys.snsApiKey)}</Text>
        <Text style={styles.maskLine}>Reddit: {maskSecret(analysisApiKeys.redditApiKey)}</Text>
        <Text style={styles.maskLine}>X: {maskSecret(analysisApiKeys.xApiKey)}</Text>
        <Text style={styles.maskLine}>Earnings: {maskSecret(analysisApiKeys.earningsApiKey)}</Text>
      </Card>

      <Card style={styles.dangerCard}>
        <Text style={styles.sectionTitle}>機密データの削除</Text>
        <Text style={styles.body}>
          APIキーと執行ジャーナルを削除します。アプリの再起動後もキーは空のままです。
        </Text>
        <View style={styles.action}>
          <Button label="ローカル機密データをすべて削除" onPress={onClearSensitive} variant="ghost" />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  body: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
  maskLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs, fontFamily: 'monospace' },
  warnCard: { borderColor: theme.colors.warning, borderWidth: 1 },
  warnTitle: { color: theme.colors.warning, fontWeight: '700', marginBottom: theme.spacing.xs },
  warnBody: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  dangerCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  action: { marginTop: theme.spacing.md },
});
