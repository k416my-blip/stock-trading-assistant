import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import {
  FREE_NEWS_FALLBACK_SOURCES_JA,
  X_API_OPTIONAL_MODE_DESC_JA,
  X_API_OPTIONAL_MODE_LABEL,
  X_HTTP_402_USER_MESSAGE_JA,
  X_PAID_FEATURES_JA,
} from '../constants/xApiOptional';
import { X_CONSERVATION_MODE_LABEL, X_CONSERVATION_RULES_JA } from '../constants/xApiConservation';
import {
  loadXApiOptionalState,
  setXApiOptionalModeEnabled,
  type XApiOptionalState,
} from '../services/xApiOptionalModeStorage';
import { runXApiBearerFetchTest, type XApiDebugTestResult } from '../services/xApiDebug';
import { buildXBearerEnvSnapshot, logXBearerEnvAtStartup } from '../services/xBearerToken';
import { getXApiUsageDashboard } from '../services/xApiUsageStorage';
import type { XApiUsageDashboard } from '../types/xApi';
import { theme } from '../theme';

export function XApiUsageScreen() {
  const { analysisApiKeys } = useApp();
  const [dash, setDash] = useState<XApiUsageDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugResult, setDebugResult] = useState<XApiDebugTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [optionalState, setOptionalState] = useState<XApiOptionalState | null>(null);
  const envSnap = buildXBearerEnvSnapshot();

  const refresh = useCallback(async () => {
    setLoading(true);
    const [next, opt] = await Promise.all([getXApiUsageDashboard(), loadXApiOptionalState()]);
    setDash(next);
    setOptionalState(opt);
    setLoading(false);
  }, []);

  useEffect(() => {
    logXBearerEnvAtStartup();
    void refresh();
  }, [refresh]);

  const onRunDebugTest = async () => {
    setTesting(true);
    try {
      const stored = analysisApiKeys.xApiKey.trim() || analysisApiKeys.snsApiKey.trim();
      const result = await runXApiBearerFetchTest(stored);
      setDebugResult(result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen title="X API 利用量" subtitle={X_CONSERVATION_MODE_LABEL}>
      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>{X_API_OPTIONAL_MODE_LABEL}</Text>
            <Text style={styles.meta}>{X_API_OPTIONAL_MODE_DESC_JA}</Text>
          </View>
          <Switch
            value={optionalState?.optionalModeEnabled ?? false}
            onValueChange={(v) => {
              void setXApiOptionalModeEnabled(v).then(setOptionalState);
            }}
          />
        </View>
        {optionalState?.paidSearchDisabled ? (
          <Text style={styles.err}>
            {optionalState.paidSearchDisabledReasonJa ?? X_HTTP_402_USER_MESSAGE_JA}
          </Text>
        ) : null}
        <Text style={styles.meta}>無効化中の有料機能:</Text>
        {X_PAID_FEATURES_JA.map((f) => (
          <Text key={f} style={styles.rule}>
            · {f}
          </Text>
        ))}
        <Text style={[styles.meta, { marginTop: theme.spacing.sm }]}>無料フォールバック:</Text>
        {FREE_NEWS_FALLBACK_SOURCES_JA.map((s) => (
          <Text key={s} style={styles.rule}>
            · {s}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Bearer 認証デバッグ</Text>
        <Text style={styles.stat}>
          .env トークン: {envSnap.tokenPresent ? `あり（長さ ${envSnap.tokenLength}）` : 'なし'}
        </Text>
        <Text style={styles.meta}>
          X_BEARER_TOKEN 定義: {envSnap.xBearerTokenEnvDefined ? 'はい' : 'いいえ（undefined または空）'}
        </Text>
        <Text style={styles.meta}>先頭5文字: {envSnap.first5}</Text>
        <Text style={styles.meta}>
          アプリ内キー:{' '}
          {analysisApiKeys.xApiKey.trim()
            ? `設定済（長さ ${analysisApiKeys.xApiKey.trim().length}）`
            : '未設定 → .env またはウィザードで設定'}
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button
            label={testing ? '接続テスト中…' : 'search/recent 接続テスト（Apple）'}
            onPress={() => void onRunDebugTest()}
            disabled={testing}
          />
        </View>
        {debugResult ? (
          <View style={styles.debugBox}>
            <Text style={[styles.stat, debugResult.ok ? styles.ok : styles.err]}>
              {debugResult.messageJa}
            </Text>
            {debugResult.status != null ? (
              <Text style={styles.meta}>HTTP {debugResult.status}</Text>
            ) : null}
            <Text style={styles.meta}>{debugResult.diagnosisJa}</Text>
            <Text style={styles.meta} selectable>
              {debugResult.responseBody
                ? `body: ${debugResult.responseBody.slice(0, 500)}${debugResult.responseBody.length > 500 ? '…' : ''}`
                : 'body: (空)'}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>節約モードのルール</Text>
        {X_CONSERVATION_RULES_JA.map((rule) => (
          <Text key={rule} style={styles.rule}>
            · {rule}
          </Text>
        ))}
      </Card>

      {loading || !dash ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
      ) : (
        <ScrollView>
          <Card>
            <Text style={styles.sectionTitle}>本日の使用量（{dash.dateKey}）</Text>
            <Text style={styles.stat}>検索 API: {dash.searchCalls} 回</Text>
            <Text style={styles.stat}>接続検証: {dash.verifyCalls} 回</Text>
            <Text style={styles.stat}>推定クレジット: {dash.creditsUsed}</Text>
            <Text style={styles.stat}>
              本日の残り目安: {dash.remainingToday} / ソフトリミット {dash.dailySoftLimit}
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>クレジット消費予測</Text>
            <Text style={styles.forecast}>{dash.forecastJa}</Text>
            <Text style={styles.meta}>
              月末予測 約{dash.projectedMonthCredits} クレジット · 月間想定上限{' '}
              {dash.monthlyBudget}
            </Text>
          </Card>

          <Card>
            <Text style={styles.note}>
              X API が停止・未設定でもアプリ全体は通常動作します。SNS分析は推定値またはキャッシュ要約を使用します。
            </Text>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  rule: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  stat: {
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: 6,
  },
  forecast: {
    color: theme.colors.primary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  note: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  debugBox: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ok: {
    color: theme.colors.primary,
  },
  err: {
    color: theme.colors.warning,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  rowText: {
    flex: 1,
  },
});
