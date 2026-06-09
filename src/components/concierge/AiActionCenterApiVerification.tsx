import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { testApiConnection } from '../../services/apiHealth';
import {
  isHybridPipelineActive,
  rawHybridSource,
  resolveActionCenterProviderStatuses,
} from '../../services/actionCenterProviderStatus';
import {
  buildOperationalCoreApiRows,
  runOperationalApiTest,
  type OperationalTestDisplayRow,
} from '../../services/operationalApiTest';
import { resolveTwelveDataKeyForTest } from '../../services/twelveDataConnectionTest';
import { loadApiKey } from '../../services/apiKeys';
import { normalizeStoredApiKey } from '../../services/apiKeyValidation';
import { logRealApiMode } from '../../constants/realApiMode';
import type { StrategyExecutionBundle } from '../../types/strategyExecution';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

const REAL_API_SUCCESS_JA = '実API接続成功';
const REAL_API_FAIL_JA = '実API接続失敗';

type Props = {
  bundle: StrategyExecutionBundle;
  batchSource: string;
};

export function AiActionCenterApiVerification({ bundle, batchSource }: Props) {
  const { apiHealthDashboard } = useApp();
  const raw = rawHybridSource(bundle);
  const hybridActive = isHybridPipelineActive(batchSource, raw);

  const [twelveManualOk, setTwelveManualOk] = useState<boolean | null>(null);
  const [newsManualOk, setNewsManualOk] = useState<boolean | null>(null);
  const [operationalRows, setOperationalRows] = useState<OperationalTestDisplayRow[] | null>(null);
  const [operationalRunning, setOperationalRunning] = useState(false);

  const statuses = resolveActionCenterProviderStatuses({
    bundle,
    batchSource,
    apiHealth: apiHealthDashboard,
    twelveManualOk,
    newsManualOk,
  });

  const runTwelve = useCallback(async () => {
    logRealApiMode('action_center_twelve_test');
    const key = await resolveTwelveDataKeyForTest('');
    const res = await testApiConnection('twelve_data', key);
    setTwelveManualOk(res.ok);
  }, []);

  const runNews = useCallback(async () => {
    logRealApiMode('action_center_news_test');
    const key = normalizeStoredApiKey(await loadApiKey('newsapi'));
    const res = await testApiConnection('newsapi', key);
    setNewsManualOk(res.ok);
  }, []);

  const runOperational = useCallback(async () => {
    setOperationalRunning(true);
    setOperationalRows(null);
    logRealApiMode('action_center_operational_test');
    try {
      const report = await runOperationalApiTest();
      setOperationalRows(buildOperationalCoreApiRows(report));
    } finally {
      setOperationalRunning(false);
    }
  }, []);

  const twelveLabel =
    twelveManualOk === true
      ? REAL_API_SUCCESS_JA
      : twelveManualOk === false
        ? REAL_API_FAIL_JA
        : statuses.twelve.labelJa;
  const newsLabel =
    newsManualOk === true
      ? REAL_API_SUCCESS_JA
      : newsManualOk === false
        ? REAL_API_FAIL_JA
        : statuses.news.labelJa;

  return (
    <View style={styles.wrap} testID="portfolio-ai-api-verification">
      <Text style={styles.title}>実 API 接続テスト</Text>
      <SelectableText style={styles.hint}>
        状態参照: analysisState=hybrid · apiHealth · 手動テスト
        {hybridActive ? ' · hybrid 実行済み' : ''}
      </SelectableText>

      <View style={styles.row}>
        <Text style={styles.provider}>Twelve Data</Text>
        <SelectableText style={statusColor(statuses.twelve.code, twelveManualOk)}>
          {twelveLabel}
        </SelectableText>
        <SelectableText style={styles.detail}>{statuses.twelve.detailJa}</SelectableText>
        <Pressable onPress={() => void runTwelve()} style={styles.btn}>
          <Text style={styles.btnText}>接続テスト</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.provider}>NewsAPI</Text>
        <SelectableText style={statusColor(statuses.news.code, newsManualOk)}>
          {newsLabel}
        </SelectableText>
        <SelectableText style={styles.detail}>{statuses.news.detailJa}</SelectableText>
        <Pressable onPress={() => void runNews()} style={styles.btn}>
          <Text style={styles.btnText}>接続テスト</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.provider}>OpenAI</Text>
        <SelectableText style={statusColor(statuses.openAi.code, null)}>
          {statuses.openAi.labelJa}
        </SelectableText>
        <SelectableText style={styles.detail}>{statuses.openAi.detailJa}</SelectableText>
      </View>

      <Pressable
        onPress={() => void runOperational()}
        style={[styles.btn, styles.operationalBtn]}
        disabled={operationalRunning}
      >
        <Text style={styles.btnText}>
          {operationalRunning ? '実運用テスト実行中…' : '実運用テスト（OpenAI / Twelve / News）'}
        </Text>
      </Pressable>

      {operationalRows ? (
        <View style={styles.opTable}>
          {operationalRows.map((row, index) => (
            <View key={`${row.apiName}-${index}`} style={styles.opRow}>
              <Text style={styles.opApi}>{row.apiName}</Text>
              <Text style={[styles.opStatus, { color: row.ok ? theme.colors.success : theme.colors.danger }]}>
                {row.ok ? '成功' : '失敗'}
              </Text>
              <Text style={styles.opMs}>{row.elapsedMs}ms</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function statusColor(
  code: 'executed' | 'idle' | 'failed' | 'skipped',
  manualOk: boolean | null,
): object {
  if (manualOk === true) return { color: theme.colors.success };
  if (manualOk === false) return { color: theme.colors.danger };
  if (code === 'executed') return { color: theme.colors.success };
  if (code === 'failed') return { color: theme.colors.danger };
  return { color: theme.colors.textMuted };
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  title: { fontWeight: '600', fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 4 },
  hint: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 8 },
  row: { marginBottom: theme.spacing.sm },
  provider: { fontWeight: '600', fontSize: theme.fontSize.sm, color: theme.colors.text },
  detail: { fontSize: 10, color: theme.colors.textMuted, marginVertical: 2 },
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  operationalBtn: { marginTop: theme.spacing.xs },
  btnText: { color: '#fff', fontWeight: '600', fontSize: theme.fontSize.sm },
  opTable: { marginTop: theme.spacing.sm },
  opRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  opApi: { flex: 1.2, fontSize: theme.fontSize.sm, color: theme.colors.text },
  opStatus: { flex: 0.6, fontSize: theme.fontSize.sm, fontWeight: '600' },
  opMs: { flex: 0.5, fontSize: theme.fontSize.sm, color: theme.colors.textMuted, textAlign: 'right' },
});
