import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logAppMemorySnapshot } from '../../utils/appMemoryDiagnostics';
import { resolvePackagerStatusUrl } from '../../utils/resolvePackagerStatusUrl';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  manifestHost?: string | null;
};

export function AiActionCenterConnectionTest({ manifestHost }: Props) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [detail, setDetail] = useState<string>('未実行');

  const runTest = useCallback(async () => {
    const url = resolvePackagerStatusUrl();
    logAppMemorySnapshot('connection_test_start', { url });
    const started = Date.now();
    try {
      const res = await fetch(url, { method: 'GET' });
      const body = await res.text();
      const ms = Date.now() - started;
      if (res.ok && body.includes('packager-status')) {
        setStatus('ok');
        setDetail(`OK ${ms}ms · ${body.trim().slice(0, 40)}`);
        logAppMemorySnapshot('connection_test_done', { ok: true, ms, url });
      } else {
        setStatus('fail');
        setDetail(`HTTP ${res.status} ${ms}ms`);
        logAppMemorySnapshot('connection_test_done', { ok: false, ms, url, body: body.slice(0, 80) });
      }
    } catch (err) {
      const ms = Date.now() - started;
      setStatus('fail');
      setDetail(err instanceof Error ? err.message : String(err));
      logAppMemorySnapshot('connection_test_done', {
        ok: false,
        ms,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  return (
    <View style={styles.wrap} testID="portfolio-ai-connection-test">
      <Text style={styles.title}>接続テスト（Metro / トンネル）</Text>
      <SelectableText style={styles.detail}>{detail}</SelectableText>
      <Pressable onPress={() => void runTest()} style={styles.btn}>
        <Text style={styles.btnText}>接続テスト実行</Text>
      </Pressable>
      {status === 'ok' ? (
        <Text style={styles.ok}>接続 OK — バンドル取得可能</Text>
      ) : status === 'fail' ? (
        <Text style={styles.fail}>接続失敗 — Metro / トンネルを確認</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  title: { fontWeight: '600', fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 4 },
  detail: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 8 },
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: theme.fontSize.sm },
  ok: { marginTop: 6, color: theme.colors.success, fontSize: theme.fontSize.sm },
  fail: { marginTop: 6, color: theme.colors.danger, fontSize: theme.fontSize.sm },
});
