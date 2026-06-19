import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsMenuRow } from '../components/ApiKeyPromoCard';
import { PersonalUseBanner } from '../components/PersonalUseBanner';
import { PlatformClarificationCard } from '../components/PlatformClarificationCard';
import { SettingsAdvancedDisclosureSection } from '../components/SettingsAdvancedDisclosureSection';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { PRICE_REFRESH_OPTIONS } from '../constants/marketData';
import {
  APP_MODE_LIVE_ANALYSIS_LABEL,
  APP_MODE_PRACTICE_LABEL,
} from '../constants/platformClarification';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import {
  deleteApiKey,
  deleteAllApiKeysUserConfirmed,
  hasSavedKey,
  saveApiKey,
} from '../services/apiKeys';
import {
  createEmptyApiKeyDrafts,
  formatConfiguredStatusLine,
  loadAllApiKeyConfiguredStatuses,
  type ApiKeyConfiguredStatus,
} from '../services/apiKeyUiState';
import { testApiConnection, type ApiConnectionState } from '../services/apiHealth';
import {
  buildOperationalCoreApiRows,
  runOperationalApiTest,
  type OperationalApiTestReport,
} from '../services/operationalApiTest';
import {
  runNewsApiEverythingTest,
  type NewsApiEverythingTestResult,
} from '../services/newsApiEverythingTest';
import { failureKindLabelJa } from '../services/newsApiConnectionDebug';
import {
  runXApiSearchRecentTest,
  type XApiSearchRecentTestResult,
} from '../services/xApiSearchRecentTest';

export function SettingsScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, isPractice, resetAllAppData, reloadStoredApiKeys, saveAnalysisApiKeys } = useApp();
  const [resetting, setResetting] = useState(false);
  const [apiKeyInputs, setApiKeyInputs] = useState(createEmptyApiKeyDrafts);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<SupportedApiProviderId, ApiKeyConfiguredStatus>>(
    () =>
      Object.fromEntries(
        API_PROVIDERS.map((p) => [
          p.id,
          { configured: false, statusLabelJa: '未設定' as const, maskedHint: '(未設定)' },
        ]),
      ) as Record<SupportedApiProviderId, ApiKeyConfiguredStatus>,
  );
  const [apiConnectionStates, setApiConnectionStates] = useState<Record<SupportedApiProviderId, ApiConnectionState>>({
    openai: 'idle',
    twelve_data: 'idle',
    newsapi: 'idle',
    x: 'idle',
    reddit: 'idle',
    alpha_vantage: 'idle',
    finnhub: 'idle',
    polygon: 'idle',
    fmp: 'idle',
  });
  const [apiConnectionMessages, setApiConnectionMessages] = useState<Record<SupportedApiProviderId, string>>({
    openai: '未確認',
    twelve_data: '未確認',
    newsapi: '未確認',
    x: '未確認',
    reddit: '未確認',
    alpha_vantage: '未確認',
    finnhub: '未確認',
    polygon: '未確認',
    fmp: '未確認',
  });
  const [operationalRunning, setOperationalRunning] = useState(false);
  const [operationalReport, setOperationalReport] = useState<OperationalApiTestReport | null>(null);
  const [newsApiTestRunning, setNewsApiTestRunning] = useState(false);
  const [newsApiTestResult, setNewsApiTestResult] = useState<NewsApiEverythingTestResult | null>(null);
  const [xApiTestRunning, setXApiTestRunning] = useState(false);
  const [xApiTestResult, setXApiTestResult] = useState<XApiSearchRecentTestResult | null>(null);
  const [apiKeySaved, setApiKeySaved] = useState<Record<SupportedApiProviderId, boolean>>({
    openai: false,
    twelve_data: false,
    newsapi: false,
    x: false,
    reddit: false,
    alpha_vantage: false,
    finnhub: false,
    polygon: false,
    fmp: false,
  });
  const [apiBusy, setApiBusy] = useState<Record<SupportedApiProviderId, boolean>>({
    openai: false,
    twelve_data: false,
    newsapi: false,
    x: false,
    reddit: false,
    alpha_vantage: false,
    finnhub: false,
    polygon: false,
    fmp: false,
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const statuses = await loadAllApiKeyConfiguredStatuses();
      if (!mounted) return;
      setApiKeyStatus(statuses);
      setApiKeySaved(
        Object.fromEntries(
          API_PROVIDERS.map((p) => [p.id, statuses[p.id].configured]),
        ) as Record<SupportedApiProviderId, boolean>,
      );
      setApiConnectionMessages((prev) => {
        const next = { ...prev };
        API_PROVIDERS.forEach((provider) => {
          next[provider.id] = statuses[provider.id].configured ? '未テスト' : '未テスト';
        });
        return next;
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshLabel =
    PRICE_REFRESH_OPTIONS.find((o) => o.minutes === state.settings.priceRefreshMinutes)?.label ??
    '15分（おすすめ）';

  const refreshApiKeyStatuses = async () => {
    const statuses = await loadAllApiKeyConfiguredStatuses();
    setApiKeyStatus(statuses);
    setApiKeySaved(
      Object.fromEntries(
        API_PROVIDERS.map((p) => [p.id, statuses[p.id].configured]),
      ) as Record<SupportedApiProviderId, boolean>,
    );
  };

  const runReset = async () => {
    setResetting(true);
    try {
      const result = await resetAllAppData(false);
      stackNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }], index: 0 } }],
        }),
      );
      if (result.failedKeys.length > 0) {
        Alert.alert('リセットが完了しました', `削除できなかったキー: ${result.failedKeys.join(', ')}`);
      } else {
        Alert.alert('リセットが完了しました');
      }
    } finally {
      setResetting(false);
    }
  };

  const onResetPress = () => {
    Alert.alert(
      'すべてリセット',
      '本当にすべてリセットしますか？\nAPIキーは保持されます（別途「すべてのAPIキーを削除」から削除可能）。\nこの操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続ける',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '最終確認',
              'すべてのデータが削除されます。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '本当に削除します',
                  style: 'destructive',
                  onPress: () => void runReset(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const updateKeyInput = (providerId: SupportedApiProviderId, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: value }));
  };

  const onSaveApiKey = async (providerId: SupportedApiProviderId) => {
    setApiBusy((prev) => ({ ...prev, [providerId]: true }));
    try {
      const saveResult = await saveApiKey(providerId, apiKeyInputs[providerId]);
      if (!saveResult.saved) {
        Alert.alert(
          '保存しませんでした',
          `無効な入力のため既存キーを保持しました（reason: ${saveResult.reason}）。空欄・マスク表示・10文字未満は保存されません。`,
        );
        return;
      }
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
      await refreshApiKeyStatuses();
      setApiConnectionMessages((prev) => ({
        ...prev,
        [providerId]: '未テスト',
      }));
      setApiConnectionStates((prev) => ({ ...prev, [providerId]: 'idle' }));
      await reloadStoredApiKeys();
      await refreshApiKeyStatuses();
      Alert.alert('保存しました', 'APIキーを安全に保存しました。');
    } finally {
      setApiBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const onDeleteApiKey = (providerId: SupportedApiProviderId) => {
    const provider = API_PROVIDERS.find((p) => p.id === providerId);
    Alert.alert(
      'APIキー削除',
      `本当に${provider?.label ?? providerId}のAPIキーを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => void (async () => {
            setApiBusy((prev) => ({ ...prev, [providerId]: true }));
            try {
              await deleteApiKey(providerId, true);
              setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
              await refreshApiKeyStatuses();
              setApiConnectionStates((prev) => ({ ...prev, [providerId]: 'idle' }));
              setApiConnectionMessages((prev) => ({ ...prev, [providerId]: '未テスト' }));
              Alert.alert('削除しました', 'APIキーを削除しました。');
            } finally {
              setApiBusy((prev) => ({ ...prev, [providerId]: false }));
            }
          })(),
        },
      ],
    );
  };

  const onTestApiConnection = async (providerId: SupportedApiProviderId) => {
    setApiBusy((prev) => ({ ...prev, [providerId]: true }));
    setApiConnectionStates((prev) => ({ ...prev, [providerId]: 'testing' }));
    try {
      const testResult = await testApiConnection(providerId, apiKeyInputs[providerId]);
      setApiConnectionStates((prev) => ({ ...prev, [providerId]: testResult.ok ? 'ok' : 'error' }));
      const connLabel = testResult.ok ? '成功' : '失敗';
      setApiConnectionMessages((prev) => ({ ...prev, [providerId]: connLabel }));
      Alert.alert(
        testResult.ok ? '接続テスト成功' : '接続テスト失敗',
        testResult.ok ? testResult.message : testResult.message || '実API接続失敗',
      );
    } finally {
      setApiBusy((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const onRunNewsApiEverythingTest = async () => {
    setNewsApiTestRunning(true);
    setNewsApiTestResult(null);
    try {
      const result = await runNewsApiEverythingTest(apiKeyInputs.newsapi);
      setNewsApiTestResult(result);
      console.warn(
        '[NEWSAPI_CONNECTION_TEST]',
        JSON.stringify({
          ok: result.ok,
          httpStatus: result.httpStatus,
          failureKind: result.failureKind,
          failureKindJa: failureKindLabelJa(result.failureKind),
          adoptedEndpoint: result.adoptedEndpoint,
          adoptedStage: result.adoptedStage,
          adoptedAuthMode: result.adoptedAuthMode,
          responseBodySummary: result.responseBodySummary,
          articleCount: result.articleCount,
          errorReason: result.errorReasonJa,
          probes: result.probes.map((p) => ({
            stage: p.stage,
            httpStatus: p.httpStatus,
            authMode: p.authMode,
            failureKind: p.failureKind,
            summary: p.responseBodySummary,
          })),
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNewsApiTestResult({
        ok: false,
        httpStatus: 0,
        adoptedEndpoint: null,
        adoptedStage: null,
        adoptedAuthMode: null,
        failureKind: 'network_error',
        errorReasonJa: msg,
        responseBodyMasked: msg,
        responseBodySummary: msg.slice(0, 160),
        responseBody: msg,
        errorReason: msg,
        articleCount: 0,
        titles: [],
        testedAt: new Date().toISOString(),
        probes: [],
        newsApiDirectOk: false,
        productionBlocked: false,
        rssFallbackOk: false,
        rssFallbackCount: 0,
        adoptedNewsSource: null,
        newsApiKeyInvalid: false,
      });
    } finally {
      setNewsApiTestRunning(false);
    }
  };

  const onRunXApiSearchRecentTest = async () => {
    setXApiTestRunning(true);
    setXApiTestResult(null);
    try {
      const result = await runXApiSearchRecentTest(apiKeyInputs.x);
      setXApiTestResult(result);
      console.log('[X API テスト]', JSON.stringify({
        ok: result.ok,
        httpStatus: result.httpStatus,
        tweetCount: result.tweetCount,
        tweetTexts: result.tweetTexts,
        errorReason: result.errorReason,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setXApiTestResult({
        ok: false,
        httpStatus: 0,
        responseBody: msg,
        tweetCount: 0,
        tweetTexts: [],
        testedAt: new Date().toISOString(),
        errorReason: msg,
      });
    } finally {
      setXApiTestRunning(false);
    }
  };

  const [deviceAuditRunning, setDeviceAuditRunning] = useState(false);

  const onRunDeviceLiveApiAudit = async () => {
    setDeviceAuditRunning(true);
    try {
      const { runDeviceLiveApiAudit } = await import('../services/deviceLiveApiAudit');
      await runDeviceLiveApiAudit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log('[DEVICE-LIVE-AUDIT]', JSON.stringify({ phase: 'error', message: msg }));
    } finally {
      setDeviceAuditRunning(false);
    }
  };

  const onRunOperationalTest = async () => {
    setOperationalRunning(true);
    setOperationalReport(null);
    try {
      const report = await runOperationalApiTest();
      setOperationalReport(report);
    } catch (e) {
      Alert.alert('実運用テスト失敗', e instanceof Error ? e.message : String(e));
    } finally {
      setOperationalRunning(false);
    }
  };

  const onDeleteAllApiKeysPress = () => {
    Alert.alert(
      'すべてのAPIキーを削除',
      'OpenAI / Twelve Data / News / X / Reddit など、端末に保存されたすべてのAPIキーを削除します。\nアプリデータ（保有・履歴）は保持されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続ける',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '最終確認',
              'すべてのAPIキーを削除します。よろしいですか？',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '削除する',
                  style: 'destructive',
                  onPress: () => void (async () => {
                    const result = await deleteAllApiKeysUserConfirmed(true);
                    setApiKeyInputs(createEmptyApiKeyDrafts());
                    await reloadStoredApiKeys();
                    await refreshApiKeyStatuses();
                    Alert.alert(
                      'APIキーを削除しました',
                      result.failedKeys.length > 0
                        ? `削除できなかったキー: ${result.failedKeys.length}件`
                        : 'すべてのAPIキーを削除しました。',
                    );
                  })(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <Screen title="設定" subtitle="API・通知・市場など">
      <Card>
        <Text style={styles.sectionTitle}>APIキー管理（設定に集約）</Text>
        <Text style={styles.sectionHint}>
          すべて端末内の SecureStore に保存します。未登録APIがあってもアプリは動作します。
        </Text>
        {API_PROVIDERS.map((provider) => {
          const status = apiKeyStatus[provider.id];
          const saved = status.configured;
          const masked = formatConfiguredStatusLine(status);
          const state = apiConnectionStates[provider.id];
          const stateColor =
            state === 'ok'
              ? theme.colors.success
              : state === 'error'
                ? theme.colors.danger
                : state === 'testing'
                  ? theme.colors.warning
                  : theme.colors.textMuted;
          const busy = apiBusy[provider.id];
          return (
            <View key={provider.id} style={styles.apiProviderBlock}>
              <Text style={styles.apiProviderTitle}>{provider.label}</Text>
              <Text style={styles.apiHelpText}>{provider.helpText}</Text>
              <Text style={styles.apiMaskText}>保存状態: {masked}</Text>
              <Text style={[styles.apiStatusText, { color: stateColor }]}>
                接続状態: {saved ? apiConnectionMessages[provider.id] : '未テスト'}
              </Text>
              <TextInput
                style={styles.input}
                value={apiKeyInputs[provider.id]}
                onChangeText={(value) => updateKeyInput(provider.id, value)}
                placeholder={`${provider.placeholder}（空欄保存=既存キー保持）`}
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <View style={styles.apiActionsRow}>
                <Button label={busy ? '処理中…' : '保存'} onPress={() => void onSaveApiKey(provider.id)} disabled={busy} />
                <Button
                  label={busy ? '処理中…' : '削除'}
                  onPress={() => onDeleteApiKey(provider.id)}
                  disabled={busy}
                  variant="ghost"
                />
                <Button
                  label={busy ? '処理中…' : '接続テスト'}
                  onPress={() => void onTestApiConnection(provider.id)}
                  disabled={busy}
                  variant="ghost"
                />
              </View>
              {provider.id === 'x' ? (
                <View style={styles.newsApiTestBlock}>
                  <Text style={styles.newsApiTestTitle}>X API search/recent テスト</Text>
                  <Text style={styles.apiHelpText}>
                    GET /2/tweets/search/recent?query=Maybank&max_results=10 · Bearer Token
                  </Text>
                  <Button
                    label={xApiTestRunning ? 'テスト中…' : 'X API テスト'}
                    onPress={() => void onRunXApiSearchRecentTest()}
                    disabled={xApiTestRunning || busy}
                    variant="ghost"
                  />
                  {xApiTestResult ? (
                    <View style={styles.newsApiTestResult}>
                      <Text
                        style={[
                          styles.newsApiTestStatus,
                          { color: xApiTestResult.ok ? theme.colors.success : theme.colors.danger },
                        ]}
                      >
                        {xApiTestResult.ok ? '接続成功' : '接続失敗'}
                      </Text>
                      <Text style={styles.newsApiTestMeta} selectable>
                        HTTP Status: {xApiTestResult.httpStatus || '—'}
                      </Text>
                      {xApiTestResult.ok ? (
                        <>
                          <Text style={styles.newsApiTestMeta}>
                            取得件数: {xApiTestResult.tweetCount}
                          </Text>
                          <Text style={styles.newsApiTestMeta}>
                            テスト日時: {new Date(xApiTestResult.testedAt).toLocaleString('ja-JP')}
                          </Text>
                          <Text style={styles.newsApiTestMeta}>最初の3件の本文:</Text>
                          {xApiTestResult.tweetTexts.length > 0 ? (
                            xApiTestResult.tweetTexts.map((text, i) => (
                              <Text key={`x-tweet-${i}`} style={styles.newsApiTestTitleLine} selectable>
                                {i + 1}. {text}
                              </Text>
                            ))
                          ) : (
                            <Text style={styles.newsApiTestTitleLine}>（0件）</Text>
                          )}
                        </>
                      ) : (
                        <>
                          {xApiTestResult.errorReason ? (
                            <Text style={styles.newsApiTestMeta} selectable>
                              理由: {xApiTestResult.errorReason}
                            </Text>
                          ) : null}
                          <Text style={styles.newsApiTestMeta}>エラー本文:</Text>
                          <Text style={styles.newsApiTestBody} selectable>
                            {(xApiTestResult.responseBody || '（空）').slice(0, 200)}
                          </Text>
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              ) : null}
              {provider.id === 'newsapi' ? (
                <View style={styles.newsApiTestBlock}>
                  <Text style={styles.newsApiTestTitle}>News API 接続テスト</Text>
                  <Text style={styles.apiHelpText}>
                    A: GET /v2/top-headlines?country=us&pageSize=5{'\n'}
                    A2: GET /v2/top-headlines?category=business&country=us&pageSize=5{'\n'}
                    B: GET /v2/everything?q=Maybank&pageSize=5&language=en{'\n'}
                    Auth: X-Api-Key / Bearer / ?apiKey= · 失敗時 RSS フォールバック
                  </Text>
                  <Button
                    label={newsApiTestRunning ? 'テスト中…' : 'News API テスト'}
                    onPress={() => void onRunNewsApiEverythingTest()}
                    disabled={newsApiTestRunning || busy}
                    variant="ghost"
                  />
                  {newsApiTestResult ? (
                    <View style={styles.newsApiTestResult}>
                      <Text
                        style={[
                          styles.newsApiTestStatus,
                          { color: newsApiTestResult.ok ? theme.colors.success : theme.colors.danger },
                        ]}
                      >
                        {newsApiTestResult.ok ? '接続成功' : '接続失敗'}
                      </Text>
                      <Text style={styles.newsApiTestMeta} selectable>
                        HTTP Status: {newsApiTestResult.httpStatus || '—'}
                      </Text>
                      <Text style={styles.newsApiTestMeta} selectable>
                        分類: {failureKindLabelJa(newsApiTestResult.failureKind)}
                      </Text>
                      {newsApiTestResult.adoptedEndpoint ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          採用 endpoint: {newsApiTestResult.adoptedEndpoint}
                        </Text>
                      ) : null}
                      {newsApiTestResult.adoptedAuthMode ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          採用 Header: {newsApiTestResult.adoptedAuthMode}
                        </Text>
                      ) : null}
                      {newsApiTestResult.adoptedNewsSource ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          採用ニュース源: {newsApiTestResult.adoptedNewsSource === 'rss' ? 'RSS' : 'NewsAPI'}
                        </Text>
                      ) : null}
                      {newsApiTestResult.productionBlocked ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          NewsAPI: Developer プラン実機制限（426）
                        </Text>
                      ) : null}
                      {newsApiTestResult.newsApiKeyInvalid ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          NewsAPI: APIキー無効（401）— newsapi.org/account でコピーし直して保存
                        </Text>
                      ) : null}
                      {newsApiTestResult.rssFallbackOk ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          RSS フォールバック: 成功（{newsApiTestResult.rssFallbackCount}件）
                        </Text>
                      ) : null}
                      {newsApiTestResult.ok ? (
                        <>
                          <Text style={styles.newsApiTestMeta}>
                            取得件数: {newsApiTestResult.articleCount}
                          </Text>
                          <Text style={styles.newsApiTestMeta}>
                            テスト日時: {new Date(newsApiTestResult.testedAt).toLocaleString('ja-JP')}
                          </Text>
                          <Text style={styles.newsApiTestMeta}>記事タイトル:</Text>
                          {newsApiTestResult.titles.length > 0 ? (
                            newsApiTestResult.titles.map((title, i) => (
                              <Text key={`news-title-${i}`} style={styles.newsApiTestTitleLine} selectable>
                                {i + 1}. {title}
                              </Text>
                            ))
                          ) : (
                            <Text style={styles.newsApiTestTitleLine}>（0件 · レート制限等）</Text>
                          )}
                        </>
                      ) : (
                        <>
                          {newsApiTestResult.errorReasonJa ? (
                            <Text style={styles.newsApiTestMeta} selectable>
                              理由: {newsApiTestResult.errorReasonJa}
                            </Text>
                          ) : null}
                        </>
                      )}
                      {newsApiTestResult.responseBodySummary ? (
                        <Text style={styles.newsApiTestMeta} selectable>
                          body要約: {newsApiTestResult.responseBodySummary}
                        </Text>
                      ) : null}
                      <Text style={styles.newsApiTestMeta}>response body（マスク）:</Text>
                      <Text style={styles.newsApiTestBody} selectable>
                        {newsApiTestResult.responseBodyMasked || '（空）'}
                      </Text>
                      {newsApiTestResult.probes.length > 0 ? (
                        <>
                          <Text style={styles.newsApiTestMeta}>プローブ:</Text>
                          {newsApiTestResult.probes.map((probe, i) => (
                            <Text key={`news-probe-${i}`} style={styles.newsApiTestTitleLine} selectable>
                              {probe.stage} · {probe.authMode} · HTTP {probe.httpStatus} ·{' '}
                              {failureKindLabelJa(probe.failureKind)}
                            </Text>
                          ))}
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.operationalBlock}>
          <Text style={styles.sectionTitle}>実運用テスト</Text>
          <Text style={styles.sectionHint}>
            SecureStore のキーで株価・ニュース・OpenAI・X を一括取得します。結果は Metro にも出力されます。
          </Text>
          <Button
            label={operationalRunning ? 'テスト実行中…' : '実運用テスト実行'}
            onPress={() => void onRunOperationalTest()}
            disabled={operationalRunning}
          />
          <Button
            label={deviceAuditRunning ? '監査中…' : '実機監査（6銘柄）'}
            onPress={() => void onRunDeviceLiveApiAudit()}
            disabled={deviceAuditRunning || operationalRunning}
            variant="ghost"
          />
          {operationalReport ? (
            <View style={styles.operationalResults}>
              <Text style={styles.operationalSummary}>
                {operationalReport.displayRows.filter((r) => r.ok).length}/{operationalReport.displayRows.length} 成功
                {' · '}
                {new Date(operationalReport.generatedAt).toLocaleString('ja-JP')}
              </Text>
              <Text style={styles.sectionHint}>主要 API（OpenAI · Twelve Data · NewsAPI）</Text>
              <View style={styles.operationalTableHeader}>
                <Text style={[styles.operationalColApi, styles.operationalHeaderText]}>API名</Text>
                <Text style={[styles.operationalColStatus, styles.operationalHeaderText]}>結果</Text>
                <Text style={[styles.operationalColMs, styles.operationalHeaderText]}>応答(ms)</Text>
              </View>
              {buildOperationalCoreApiRows(operationalReport).map((row, index) => (
                <View key={`core-${row.apiName}-${index}`} style={styles.operationalTableRow}>
                  <Text style={styles.operationalColApi} numberOfLines={2}>
                    {row.apiName}
                  </Text>
                  <Text
                    style={[
                      styles.operationalColStatus,
                      { color: row.ok ? theme.colors.success : theme.colors.danger },
                    ]}
                  >
                    {row.ok ? '成功' : '失敗'}
                  </Text>
                  <Text style={styles.operationalColMs}>{row.elapsedMs}</Text>
                </View>
              ))}
              <Text style={[styles.sectionHint, { marginTop: 8 }]}>詳細（全プロバイダ）</Text>
              {operationalReport.displayRows.map((row, index) => (
                <View key={`${row.apiName}-${index}`} style={styles.operationalTableRow}>
                  <Text style={styles.operationalColApi} numberOfLines={2}>
                    {row.apiName}
                  </Text>
                  <Text
                    style={[
                      styles.operationalColStatus,
                      { color: row.ok ? theme.colors.success : theme.colors.danger },
                    ]}
                  >
                    {row.ok ? '成功' : '失敗'}
                  </Text>
                  <Text style={styles.operationalColMs}>{row.elapsedMs}</Text>
                </View>
              ))}
              {operationalReport.displayRows.some((r) => r.detail) ? (
                <View style={styles.operationalDetails}>
                  {operationalReport.displayRows
                    .filter((r) => r.detail)
                    .map((row, index) => (
                      <Text key={`detail-${row.apiName}-${index}`} style={styles.operationalDetailLine} selectable>
                        {row.apiName}: {row.detail}
                      </Text>
                    ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <SettingsMenuRow
          icon="key"
          title="APIキー設定"
          subtitle="Twelve Data · 株価の自動取得"
          onPress={() => stackNav.navigate('ApiKeySettings')}
        />
        <SettingsMenuRow
          icon="link-outline"
          title="API設定ウィザード"
          subtitle="OpenAI · News · 決算 · Reddit · X · 接続確認"
          onPress={() => stackNav.navigate('ApiSetupWizard')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="API接続診断"
          subtitle="全APIの実接続状態 · モック理由 · 一括テスト"
          onPress={() => stackNav.navigate('ApiConnectionDiagnostics')}
        />
        <SettingsMenuRow
          icon="logo-twitter"
          title="X API 利用量"
          subtitle="節約モード · 本日の使用量 · クレジット予測"
          onPress={() => stackNav.navigate('XApiUsage')}
        />
        <SettingsMenuRow
          icon="chatbubbles-outline"
          title="AI戦略アシスタント設定"
          subtitle="OpenAI互換API · モック切替 · 会話履歴"
          onPress={() => stackNav.navigate('AiSettings')}
        />
        <SettingsMenuRow
          icon="notifications"
          title="通知設定"
          subtitle="買付・売却・損切りなどのアラート"
          onPress={() => stackNav.navigate('NotificationSettings')}
        />
        <SettingsMenuRow
          icon="globe-outline"
          title="市場設定"
          subtitle={MARKET_LABEL[state.settings.selectedMarket]}
          onPress={() => stackNav.navigate('MarketSettings')}
        />
        <SettingsMenuRow
          icon="cash-outline"
          title="通貨設定"
          subtitle="表示は MYR · 各市場の取引通貨"
          onPress={() => stackNav.navigate('CurrencySettings')}
        />
        <SettingsMenuRow
          icon="school-outline"
          title="練習モード設定"
          subtitle={isPractice ? APP_MODE_PRACTICE_LABEL : APP_MODE_LIVE_ANALYSIS_LABEL}
          onPress={() => stackNav.navigate('PracticeModeSettings')}
        />
        <SettingsMenuRow
          icon="refresh-outline"
          title="更新頻度設定"
          subtitle={`保有銘柄の株価 · ${refreshLabel}`}
          onPress={() => stackNav.navigate('UpdateFrequencySettings')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="市場データ診断"
          subtitle="株価更新・API呼び出しの統計（開発確認用）"
          onPress={() => stackNav.navigate('MarketDataDiagnostics')}
        />
        <SettingsMenuRow
          icon="document-text-outline"
          title="執行照合"
          subtitle="ジャーナルと保有の不一致 · 未確定注文"
          onPress={() => stackNav.navigate('ExecutionReconciliation')}
        />
        <SettingsMenuRow
          icon="lock-closed-outline"
          title="セキュリティ"
          subtitle="ローカル保存 · 整合性 · 機密データの削除"
          onPress={() => stackNav.navigate('SecuritySettings')}
        />
        <SettingsMenuRow
          icon="medkit-outline"
          title="起動診断"
          subtitle="構造化ログ · 環境検証 · リリース準備"
          onPress={() => stackNav.navigate('StartupDiagnostics')}
        />
        <SettingsMenuRow
          icon="shield-checkmark-outline"
          title="個人用運用"
          subtitle="バックアップ · ヘルスチェック · 緊急停止 · 実機テスト"
          onPress={() => stackNav.navigate('PersonalProduction')}
        />
        <SettingsMenuRow
          icon="speedometer-outline"
          title="Production Dashboard"
          subtitle="API · memory · queue · AI負荷 · 本番準備チェックリスト"
          onPress={() => stackNav.navigate('ProductionDashboard')}
        />
        <SettingsMenuRow
          icon="trending-up-outline"
          title="リアルタイム前向き検証"
          subtitle="4ETF日次シグナル · 仮想PF · バックテスト比較 · 30Tレポート"
          onPress={() => stackNav.navigate('ForwardValidation')}
        />
        <SettingsMenuRow
          icon="analytics-outline"
          title="歴史シミュレーション検証"
          subtitle="ウォークフォワード・ストレステスト・Sharpe/Calmar"
          onPress={() => stackNav.navigate('HistoricalValidation')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="実市場データ・クオンツ検証"
          subtitle="OHLCV · モンテカルロ · テール · ギャップ · 心理ストレス"
          onPress={() => stackNav.navigate('RealQuantValidation')}
        />
        <SettingsMenuRow
          icon="pie-chart-outline"
          title="機関ポートフォリオ最適化"
          subtitle="共分散 · リスクパリティ · CVaR · Kelly · 頑健性スコア"
          onPress={() => stackNav.navigate('PortfolioOptimization')}
        />
        <SettingsMenuRow
          icon="stats-chart-outline"
          title="ベイズ動的配分"
          subtitle="Black-Litterman · EWMA · 感度 · 信頼区間 · 頑健性ランキング"
          onPress={() => stackNav.navigate('BayesianAllocation')}
        />
        <SettingsMenuRow
          icon="layers-outline"
          title="メタ配分・アンサンブル"
          subtitle="5エンジン · BMA · 不一致 · フェイルセーフ"
          onPress={() => stackNav.navigate('MetaAllocation')}
        />
        <SettingsMenuRow
          icon="shield-checkmark-outline"
          title="ガバナンス・説明・監査"
          subtitle="配分理由 · ヒステリシス · 取引停止 · 監査ログ"
          onPress={() => stackNav.navigate('Governance')}
        />
        <SettingsMenuRow
          icon="eye-outline"
          title="シャドー取引・現実校正"
          subtitle="端末内シミュレーション · 実ブローカー注文なし"
          onPress={() => stackNav.navigate('ShadowTrading')}
        />
        <SettingsMenuRow
          icon="pulse-outline"
          title="可視化・モニタリング"
          subtitle="エクイティ · ドローダウン · レジーム · OMSリプレイ · ヘルス"
          onPress={() => stackNav.navigate('Monitoring')}
        />
        <SettingsMenuRow
          icon="flash-outline"
          title="適応執行・アルファ"
          subtitle="ボラターゲット · スライス · シグナル品質 · シャドー学習"
          onPress={() => stackNav.navigate('AdaptiveExecution')}
        />
        <SettingsMenuRow
          icon="globe-outline"
          title="マーケット・インテリジェンス"
          subtitle="インターマーケット · 相関 · フロー · パニック検出"
          onPress={() => stackNav.navigate('MarketIntelligence')}
        />
        <SettingsMenuRow
          icon="shield-outline"
          title="データ整合性・市場信頼性"
          subtitle="OHLCV修復 · ステール検出 · バイアス · 不良ティック"
          onPress={() => stackNav.navigate('DataIntegrity')}
        />
        <SettingsMenuRow
          icon="warning-outline"
          title="ストレス・テールリスク"
          subtitle="相関ショック · VaR/ES · デレバレッジ · 執行ゲート"
          onPress={() => stackNav.navigate('PortfolioStress')}
        />
        <SettingsMenuRow
          icon="body-outline"
          title="行動・オペレーターリスク"
          subtitle="リベンジ · 過剰取引 · 連敗クーリング · 規律スコア"
          onPress={() => stackNav.navigate('BehavioralRisk')}
        />
        <SettingsMenuRow
          icon="git-branch-outline"
          title="モデル安定性・自己適応制御"
          subtitle="ドリフト · 学習率 · 隔離 · ロールバック"
          onPress={() => stackNav.navigate('ModelStability')}
        />
        <SettingsMenuRow
          icon="pie-chart-outline"
          title="メタ資本配分"
          subtitle="戦略間資本 · 相関 · 危機保全 · シャドー"
          onPress={() => stackNav.navigate('MetaCapital')}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>詳細設定</Text>
        <Text style={styles.sectionHint}>
          個人利用の説明・初心者ガイド・リスク告知はホームではなくここに集約しています。
        </Text>
        <PersonalUseBanner />
        <PlatformClarificationCard compact />
        <SettingsAdvancedDisclosureSection />
      </Card>

      <Card style={styles.resetCard}>
        <Text style={styles.resetTitle}>すべてリセット</Text>
        <Text style={styles.resetHint}>
          仮想資金・保有・売買履歴・手動注文・通知履歴・学習履歴・アプリ設定・キャッシュを削除します。
          APIキーは保持されます。
        </Text>
        <Button
          label="すべてのデータをリセット"
          onPress={onResetPress}
          variant="ghost"
          disabled={resetting}
        />
        <Button
          label="すべてのAPIキーを削除"
          onPress={onDeleteAllApiKeysPress}
          variant="ghost"
          disabled={resetting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  sectionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  resetCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  resetTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  resetHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.sm },
  apiProviderBlock: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  apiProviderTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  apiHelpText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  apiMaskText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  apiStatusText: { fontSize: theme.fontSize.sm, fontWeight: '600' },
  apiActionsRow: { marginTop: theme.spacing.xs, gap: theme.spacing.xs },
  operationalBlock: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  operationalResults: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  operationalSummary: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  operationalTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  operationalTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  operationalHeaderText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  operationalColApi: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    paddingRight: theme.spacing.xs,
  },
  operationalColStatus: {
    width: 52,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  operationalColMs: {
    width: 72,
    textAlign: 'right',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  operationalDetails: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  operationalDetailLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xs,
  },
  newsApiTestBlock: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  newsApiTestTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  newsApiTestResult: {
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  newsApiTestStatus: {
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  newsApiTestMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  newsApiTestTitleLine: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  newsApiTestBody: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});
