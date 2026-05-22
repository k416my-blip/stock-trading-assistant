import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AI_EXPLANATION_LEVEL_HINTS_JA,
  AI_EXPLANATION_LEVEL_LABELS_JA,
  AI_EXPLANATION_LEVEL_ORDER,
  type AiExplanationLevel,
} from '../constants/aiExplanationLevel';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { AI_SETTINGS } from '../constants/aiSettings';
import {
  AI_ANALYSIS_MODE_HINTS_JA,
  AI_ANALYSIS_MODE_LABELS_JA,
  AI_ANALYSIS_MODE_ORDER,
  type AiAnalysisMode,
} from '../constants/aiDataDriven';
import {
  CONCIERGE_UX_MODE_HINTS_JA,
  CONCIERGE_UX_MODE_LABELS_JA,
} from '../constants/conciergeUx';
import type { ConciergeUxDisplayMode } from '../types/conciergeUx';
import { TACTICAL_MODE_LABELS_JA } from '../constants/strategyExecution';
import type { TacticalMode } from '../types/strategyExecution';
import { AI_PERSONAL_SAFETY_FOOTER } from '../constants/aiStrategyBriefing';
import { statusLabelJa } from '../services/apiConnectionStatusMapper';
import { useApp } from '../context/AppContext';
import { usePerformanceCost } from '../context/PerformanceCostContext';
import { ApiCostDashboardPanel } from '../components/ApiCostDashboardPanel';
import type { ApiConnectionStatus } from '../types/apiConnection';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function AiSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    aiApiKey,
    aiPreferences,
    saveAiApiKey,
    saveAiPreferences,
    clearAiChatHistory,
    testAiApiConnection,
    apiHealthDashboard,
  } = useApp();
  const { batterySaverEnabled, setBatterySaverEnabled } = usePerformanceCost();
  const [keyInput, setKeyInput] = useState(aiApiKey);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus>('not_configured');
  const [connectionMessage, setConnectionMessage] = useState('');

  const syncStatusFromDashboard = useCallback(() => {
    const row = apiHealthDashboard.providers.openai;
    if (!aiApiKey.trim()) {
      setConnectionStatus('not_configured');
      setConnectionMessage('APIキー未設定');
      return;
    }
    if (!row.lastCheckedAt) {
      setConnectionStatus('key_saved_unverified');
      setConnectionMessage(AI_SETTINGS.keySavedUnverified);
      return;
    }
    if (row.outcome === 'success') {
      setConnectionStatus('connected');
      setConnectionMessage(AI_SETTINGS.connectionTestSuccess);
      return;
    }
    if (row.outcome === 'invalid_key') {
      setConnectionStatus('auth_error');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'rate_limited') {
      setConnectionStatus('rate_limited');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'timeout') {
      setConnectionStatus('timeout');
      setConnectionMessage(row.messageJa);
      return;
    }
    if (row.outcome === 'parse_error') {
      setConnectionStatus('parse_error');
      setConnectionMessage(row.messageJa);
      return;
    }
    setConnectionStatus('network_error');
    setConnectionMessage(row.messageJa);
  }, [aiApiKey, apiHealthDashboard.providers.openai]);

  useEffect(() => {
    setKeyInput(aiApiKey);
    syncStatusFromDashboard();
  }, [aiApiKey, syncStatusFromDashboard]);

  const onSaveKey = async () => {
    setSaving(true);
    await saveAiApiKey(keyInput);
    setSaving(false);
    syncStatusFromDashboard();
    Alert.alert('保存しました', AI_SETTINGS.savedKey);
  };

  const onTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('checking');
    setConnectionMessage(AI_SETTINGS.connectionTesting);
    try {
      const result = await testAiApiConnection();
      setConnectionStatus(result.connectionStatus);
      setConnectionMessage(result.messageJa);
      Alert.alert(result.ok ? '接続成功' : '接続失敗', result.messageJa);
    } finally {
      setTesting(false);
    }
  };

  const onToggleEnabled = async (value: boolean) => {
    await saveAiPreferences({ aiEnabled: value });
  };

  const onToggleMockOnly = async (value: boolean) => {
    await saveAiPreferences({ mockOnly: value });
  };

  const onSelectExplanationLevel = async (level: AiExplanationLevel) => {
    await saveAiPreferences({ aiExplanationLevel: level });
  };

  const selectedLevel = aiPreferences.aiExplanationLevel;

  const onClearHistory = () => {
    Alert.alert('会話履歴のクリア', AI_SETTINGS.clearHistoryConfirm, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'クリア',
        style: 'destructive',
        onPress: () => {
          void clearAiChatHistory().then(() => {
            Alert.alert(AI_SETTINGS.clearHistoryDone);
          });
        },
      },
    ]);
  };

  return (
    <Screen title={AI_SETTINGS.screenTitle} subtitle={AI_SETTINGS.screenSubtitle}>
      <BeginnerWarningBanner />
      <Card>
        <Text style={styles.badge}>{AI_SETTINGS.personalLabel}</Text>
        <Text style={styles.footer}>{AI_PERSONAL_SAFETY_FOOTER}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.aiEnabledLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.aiEnabledHint}</Text>
          </View>
          <Switch
            value={aiPreferences.aiEnabled}
            onValueChange={(v) => void onToggleEnabled(v)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.mockOnlyLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.mockOnlyHint}</Text>
          </View>
          <Switch
            value={aiPreferences.mockOnly}
            onValueChange={(v) => void onToggleMockOnly(v)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.apiKeyLabel}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.apiKeyHint}</Text>
        <TextInput
          style={styles.input}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder={AI_SETTINGS.apiKeyPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.statusLine}>
          {AI_SETTINGS.connectionStatusLabel}: {statusLabelJa(connectionStatus)}
        </Text>
        {connectionMessage ? <Text style={styles.statusDetail}>{connectionMessage}</Text> : null}
        <Button label={saving ? '保存中…' : AI_SETTINGS.saveKey} onPress={onSaveKey} disabled={saving} />
        <View style={styles.btnGap} />
        <Button
          label={testing ? AI_SETTINGS.connectionTesting : AI_SETTINGS.connectionTestButton}
          onPress={() => void onTestConnection()}
          disabled={testing || saving}
          variant="ghost"
        />
        <View style={styles.btnGap} />
        <Button
          label={AI_SETTINGS.openDiagnostics}
          onPress={() => navigation.navigate('ApiConnectionDiagnostics')}
          variant="ghost"
        />
      </Card>

      <Card>
        <ApiCostDashboardPanel />
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>バッテリーセーバー</Text>
            <Text style={styles.hint}>
              更新間隔を延ばし、X APIを停止。アニメーションを抑えます。
            </Text>
          </View>
          <Switch
            value={batterySaverEnabled}
            onValueChange={(v) => void setBatterySaverEnabled(v)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.explanationLevelLabel}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.explanationLevelHint}</Text>
        <Text style={styles.currentSelection}>
          {AI_SETTINGS.explanationLevelCurrent}: {AI_EXPLANATION_LEVEL_LABELS_JA[selectedLevel]}
        </Text>
        {AI_EXPLANATION_LEVEL_ORDER.map((level, index) => (
          <Pressable
            key={level}
            onPress={() => void onSelectExplanationLevel(level)}
            style={({ pressed }) => [
              styles.optionRow,
              index < AI_EXPLANATION_LEVEL_ORDER.length - 1 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              selectedLevel === level && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[styles.optionLabel, selectedLevel === level && styles.optionLabelSelected]}
              >
                {AI_EXPLANATION_LEVEL_LABELS_JA[level]}
              </Text>
              <Text style={styles.optionHint}>{AI_EXPLANATION_LEVEL_HINTS_JA[level]}</Text>
            </View>
            {selectedLevel === level ? <Text style={styles.check}>✓</Text> : <View style={styles.radioOff} />}
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={styles.label}>AI Strategy Execution</Text>
        <Text style={styles.hint}>
          buy / reduce / hold / avoid / watch と confidence・リスクリワードを Action Center に表示します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>戦略実行レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.strategyExecutionEnabled}
            onValueChange={(v) => void saveAiPreferences({ strategyExecutionEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        {(['defensive', 'balanced', 'aggressive'] as const).map((mode, index) => (
          <Pressable
            key={mode}
            onPress={() => void saveAiPreferences({ strategyTacticalMode: mode })}
            style={({ pressed }) => [
              styles.optionRow,
              index < 2 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              aiPreferences.strategyTacticalMode === mode && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionLabel,
                  aiPreferences.strategyTacticalMode === mode && styles.optionLabelSelected,
                ]}
              >
                {TACTICAL_MODE_LABELS_JA[mode as TacticalMode]}
              </Text>
            </View>
            {aiPreferences.strategyTacticalMode === mode ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={styles.label}>Meta Reliability & Longitudinal Trust</Text>
        <Text style={styles.hint}>
          AI自身の長期信頼性・説明整合・confidence inflation を時系列監査します（売買強化ではない）。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>長期信頼性監査レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.metaReliabilityLongitudinalTrustEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ metaReliabilityLongitudinalTrustEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Strategic Memory Graph & Temporal Causality</Text>
        <Text style={styles.hint}>
          過去判断・layer変化を時系列因果グラフとして監査します（記憶保存・自己学習ではない）。因果は常に仮説。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>戦略因果グラフレイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.strategicMemoryGraphTemporalCausalityEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ strategicMemoryGraphTemporalCausalityEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Cognitive Resource Economy & Attention Allocation</Text>
        <Text style={styles.hint}>
          attention・compute budget・再帰圧を監査し、有限リソース下で重要思考にのみリソースを集中します（高コスト≠高品質）。hidden compute禁止。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>認知リソース経済レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.cognitiveResourceEconomyAttentionAllocationEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ cognitiveResourceEconomyAttentionAllocationEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Unified Cognitive State & Executive Awareness</Text>
        <Text style={styles.hint}>
          全レイヤー状態を Executive として統合監査します（conscious AI・意思決定主体ではない）。安全整合・推論深度制御のみ。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>統合認知状態レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.unifiedCognitiveStateExecutiveAwarenessEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ unifiedCognitiveStateExecutiveAwarenessEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Human Intent Continuity & Alignment Preservation</Text>
        <Text style={styles.hint}>
          ユーザー本来意図との整合を監査します（人格形成・目標生成ではない）。明示指示最優先・勝手な解釈禁止。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>人間意図整合レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.humanIntentContinuityAlignmentPreservationEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ humanIntentContinuityAlignmentPreservationEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Adaptive Exploration & Anti-Dogma</Text>
        <Text style={styles.hint}>
          安全性を維持しつつ過度な固定化（ドグマ）のみを検出・緩和します（autonomy・実験・strategy mutationではない）。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>適応探索レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.adaptiveExplorationAntiDogmaEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ adaptiveExplorationAntiDogmaEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Constitutional Governance & System Coherence</Text>
        <Text style={styles.hint}>
          全AIレイヤーの override/clamp を中央憲法層で統治し、矛盾・衝突・優先度逆転を抑止します（autonomy・self-amendment・layer bypass禁止）。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>憲法統治レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.constitutionalGovernanceSystemCoherenceEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ constitutionalGovernanceSystemCoherenceEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Explainable Governance & Transparent Reasoning</Text>
        <Text style={styles.hint}>
          downgrade/freeze/override の安全な監査説明のみを生成します（Chain-of-Thought・内部推論開示禁止）。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>説明可能統治レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.explainableGovernanceTransparentReasoningEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ explainableGovernanceTransparentReasoningEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Runtime Survival & Mobile Resilience</Text>
        <Text style={styles.hint}>
          process kill・offline・battery saver・thermal 等に耐える実運用生存層です（Redmi Note 15 Pro 5G想定）。stealth background・hidden wakelock 禁止。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Runtime Survival Layer</Text>
          </View>
          <Switch
            value={aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ runtimeSurvivalMobileResilienceEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Epistemic Integrity & Truth Calibration</Text>
        <Text style={styles.hint}>
          推論の正当性・根拠密度・unsupported推論を監査します（真実判定AIではない）。integrity優先・不明は正常。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>知識品質監査レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.epistemicIntegrityTruthCalibrationEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ epistemicIntegrityTruthCalibrationEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Self-Evolving Architecture & Reflective Refactor</Text>
        <Text style={styles.hint}>
          構造肥大・重複・不要layerを監査し、最適化は governance 承認待ちの提案のみ。自動リファクタ・自己書き換え禁止。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自己構造監査レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.selfEvolvingArchitectureReflectiveRefactorEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ selfEvolvingArchitectureReflectiveRefactorEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Cognitive Arbitration & Consensus</Text>
        <Text style={styles.hint}>
          複数 AI レイヤーの推奨・confidence・状態の衝突を合議制で統合します。中央支配ではなく安全合議。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>認知合議レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.cognitiveArbitrationConsensusEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ cognitiveArbitrationConsensusEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Autonomous Market Regime Detection</Text>
        <Text style={styles.hint}>
          現在の市場局面を分類し（予測断定なし）、confidence・オーケストレーション予算を risk-aware に適応します。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>市場局面適応レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.autonomousMarketRegimeDetectionEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ autonomousMarketRegimeDetectionEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Dynamic Layer Orchestration & Mobile Runtime</Text>
        <Text style={styles.hint}>
          必要な AI レイヤーのみ動的実行し、Redmi 等モバイル端末の負荷を抑えます。Paper Trading のみ・実注文なし。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>動的オーケストレーション</Text>
          </View>
          <Switch
            value={
              aiPreferences.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled !== false
            }
            onValueChange={(v) =>
              void saveAiPreferences({
                dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled: v,
              })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Systemic Stability & Recursive Governance</Text>
        <Text style={styles.hint}>
          再帰 layer の不安定伝播（loop / cascade / freeze chain）を防止します。Paper Trading のみ・stability/governance 専用。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>系統安定・再帰統治レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.systemicStabilityRecursiveGovernanceEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ systemicStabilityRecursiveGovernanceEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Execution Recovery & Adaptive Confidence</Text>
        <Text style={styles.hint}>
          freeze / safe mode からの安全な段階復帰（thaw）と confidence 再構築。Paper Trading のみ・攻撃的最適化禁止。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>実行復帰・適応信頼レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.executionRecoveryAdaptiveConfidenceEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ executionRecoveryAdaptiveConfidenceEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Recursive Memory Compression & Strategic Abstraction</Text>
        <Text style={styles.hint}>
          context explosion / timeline 肥大 / drift を抑制します。Paper Trading のみ・memory optimization 専用。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>memory圧縮・抽象化レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ recursiveMemoryCompressionStrategicAbstractionEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Meta-Cognitive Risk Reflection & Self-Critique</Text>
        <Text style={styles.hint}>
          AI自身の判断傾向・confidence drift・bias を自己監査します。Paper Trading のみ・downgrade/watch/hold/freeze のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自己批判・自己修正レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ metaCognitiveRiskReflectionSelfCritiqueEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Cognitive Goal Arbitration & Intent Priority</Text>
        <Text style={styles.hint}>
          複数 layer 間の目的衝突を調停し最終優先順位を決定します。Paper Trading のみ・downgrade/freeze/hold/watch のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>目的調停レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ cognitiveGoalArbitrationIntentPriorityEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Epistemic Reliability & Evidence Weight</Text>
        <Text style={styles.hint}>
          各 AI layer / replay / governance の信頼度を動的管理します。Paper Trading のみ・実注文なし・説明と confidence のみ調整。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>信頼度・根拠重みレイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.epistemicReliabilityEvidenceWeightEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ epistemicReliabilityEvidenceWeightEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Semantic Consistency & Decision Coherence</Text>
        <Text style={styles.hint}>
          reasoning / governance / replay / explainability / finalDecision の意味的一貫性を保証します。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>意味整合レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.semanticConsistencyDecisionCoherenceEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ semanticConsistencyDecisionCoherenceEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>State Integrity & Temporal Consistency</Text>
        <Text style={styles.hint}>
          AI layer / event / replay / governance の状態整合を保証します。rollback 時は watch/hold のみ。Paper Trading のみ（realTradingEnabled=false）。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>時系列整合レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.stateIntegrityTemporalConsistencyEnabled !== false}
            onValueChange={(v) =>
              void saveAiPreferences({ stateIntegrityTemporalConsistencyEnabled: v })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Adaptive Resource & Compute Budget</Text>
        <Text style={styles.hint}>
          端末の CPU・メモリ・バッテリー・発熱に合わせて AI 層の実行・描画・trace サイズを予算管理します。Paper Trading のみ。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>リソース予算レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.adaptiveResourceComputeBudgetEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ adaptiveResourceComputeBudgetEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Explainable Cognitive Trace</Text>
        <Text style={styles.hint}>
          全 AI 判断の因果・順序・影響を記録します。Paper Trading のみ・実注文なし・reasoning trace 専用です。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>説明可能性トレース</Text>
          </View>
          <Switch
            value={aiPreferences.explainableCognitiveTraceEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ explainableCognitiveTraceEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Reactive Event Orchestration</Text>
        <Text style={styles.hint}>
          全 Intelligence の state 更新・再計算・再描画をイベントバスで制御。debounce / throttle / 部分再計算で state explosion を防ぎます。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>リアクティブ制御レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.reactiveEventOrchestrationEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ reactiveEventOrchestrationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>AI Governance & Decision Hierarchy</Text>
        <Text style={styles.hint}>
          複数 Intelligence 層の矛盾を階層で解消し、最終決定・veto・合意スコアを一貫化します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>ガバナンスレイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.aiGovernanceDecisionEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ aiGovernanceDecisionEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>System Stability & State Integrity</Text>
        <Text style={styles.hint}>
          多層AIの状態爆発・競合・古いキャッシュ・UIフリーズを監査。取引ロジックは変更せず、既存レイヤーの整合のみを維持します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>整合性レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.systemStabilityIntegrityEnabled !== false}
            onValueChange={(v) => void saveAiPreferences({ systemStabilityIntegrityEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Capital Allocation & Buying Power Intelligence</Text>
        <Text style={styles.hint}>
          何株・いくら・現金残までルールベースで提案。Paper Trading のみ — 実注文は送信しません。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>資金配分レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.capitalAllocationEnabled}
            onValueChange={(v) => void saveAiPreferences({ capitalAllocationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Portfolio Risk & Exposure Intelligence</Text>
        <Text style={styles.hint}>
          ポートフォリオ全体の相関・隠れエクスポーザ・ストレステスト・品質スコアをルールベースで分析します（学習・自動売買なし）。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>ポートフォリオリスクレイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.portfolioRiskExposureEnabled}
            onValueChange={(v) => void saveAiPreferences({ portfolioRiskExposureEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Data Reliability & Market Data Integrity</Text>
        <Text style={styles.hint}>
          価格・ニュース・X・APIの鮮度と整合性を検証。信頼度が低いときはAIの強い判断をブロックします。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>データ信頼性レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.dataReliabilityEnabled}
            onValueChange={(v) => void saveAiPreferences({ dataReliabilityEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Macro Intelligence & World Model</Text>
        <Text style={styles.hint}>
          世界レジーム・流動性・資金循環をルールベースで評価。Meta/Strategyへマクロ補正を適用します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>マクロインテリジェンス</Text>
          </View>
          <Switch
            value={aiPreferences.macroIntelligenceEnabled}
            onValueChange={(v) => void saveAiPreferences({ macroIntelligenceEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Self-Evaluation & Adaptive Intelligence</Text>
        <Text style={styles.hint}>
          AIの精度・バイアス・信頼度をローカルで自己評価。機械学習・外部送信・自己改変は行いません。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自己評価レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.selfEvaluationEnabled}
            onValueChange={(v) => void saveAiPreferences({ selfEvaluationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Paper Trading & Broker Integration</Text>
        <Text style={styles.hint}>
          紙上売買・ブローカー抽象（モックのみ）。realTradingEnabled=false — 実注文は送信しません。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>紙上執行レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.paperBrokerEnabled}
            onValueChange={(v) => void saveAiPreferences({ paperBrokerEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Portfolio Simulation & Reality Validation</Text>
        <Text style={styles.hint}>
          AI提案を紙上ポートフォリオで追跡し、勝率・Trust Score・ベンチマーク差を AI Performance Center に表示します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>実績検証レイヤー</Text>
          </View>
          <Switch
            value={aiPreferences.realityValidationEnabled}
            onValueChange={(v) => void saveAiPreferences({ realityValidationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Meta Decision Engine</Text>
        <Text style={styles.hint}>
          大量シグナルを importance / urgency / confidence / portfolio impact で選別し、本当に重要な通知だけを表示します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>メタ選別を有効化</Text>
          </View>
          <Switch
            value={aiPreferences.metaDecisionEnabled}
            onValueChange={(v) => void saveAiPreferences({ metaDecisionEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>自律監視エージェント</Text>
        <Text style={styles.hint}>
          未操作でも市場を監視。価格・出来高・センチメント・ニュース・レジームが複合した重要変化のみ通知します。
        </Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自律監視を有効化</Text>
          </View>
          <Switch
            value={aiPreferences.autonomousMonitoringEnabled}
            onValueChange={(v) => void saveAiPreferences({ autonomousMonitoringEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自律通知を一時停止</Text>
          </View>
          <Switch
            value={aiPreferences.autonomousNotificationsPaused}
            onValueChange={(v) => void saveAiPreferences({ autonomousNotificationsPaused: v })}
            disabled={!aiPreferences.autonomousMonitoringEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        {(['conservative', 'balanced', 'aggressive'] as const).map((level, index) => (
          <Pressable
            key={level}
            onPress={() => void saveAiPreferences({ autonomousAggressiveness: level })}
            style={({ pressed }) => [
              styles.optionRow,
              index < 2 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              aiPreferences.autonomousAggressiveness === level && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionLabel,
                  aiPreferences.autonomousAggressiveness === level && styles.optionLabelSelected,
                ]}
              >
                {level === 'conservative'
                  ? '保守的（通知少なめ）'
                  : level === 'aggressive'
                    ? '積極的（通知多め）'
                    : 'バランス'}
              </Text>
            </View>
            {aiPreferences.autonomousAggressiveness === level ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={styles.label}>コンシェルジュ表示モード</Text>
        <Text style={styles.hint}>
          初心者モードは結論先出し・用語簡略化。上級者モードは evidence・生センチメント・コスト推定を表示します。
        </Text>
        {(['beginner', 'advanced'] as const).map((mode, index) => (
          <Pressable
            key={mode}
            onPress={() => void saveAiPreferences({ conciergeUxMode: mode })}
            style={({ pressed }) => [
              styles.optionRow,
              index < 1 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              aiPreferences.conciergeUxMode === mode && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionLabel,
                  aiPreferences.conciergeUxMode === mode && styles.optionLabelSelected,
                ]}
              >
                {CONCIERGE_UX_MODE_LABELS_JA[mode as ConciergeUxDisplayMode]}
              </Text>
              <Text style={styles.optionHint}>
                {CONCIERGE_UX_MODE_HINTS_JA[mode as ConciergeUxDisplayMode]}
              </Text>
            </View>
            {aiPreferences.conciergeUxMode === mode ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={styles.label}>実データ分析モード</Text>
        <Text style={styles.hint}>
          株価・ニュース・X投稿を根拠に回答します。保守的は推測を避け、積極的は急変フラグを優先します。
        </Text>
        {AI_ANALYSIS_MODE_ORDER.map((mode, index) => (
          <Pressable
            key={mode}
            onPress={() => void saveAiPreferences({ aiAnalysisMode: mode })}
            style={({ pressed }) => [
              styles.optionRow,
              index < AI_ANALYSIS_MODE_ORDER.length - 1 && styles.optionRowBorder,
              pressed && styles.optionRowPressed,
              aiPreferences.aiAnalysisMode === mode && styles.optionRowSelected,
            ]}
          >
            <View style={styles.optionBody}>
              <Text
                style={[
                  styles.optionLabel,
                  aiPreferences.aiAnalysisMode === mode && styles.optionLabelSelected,
                ]}
              >
                {AI_ANALYSIS_MODE_LABELS_JA[mode as AiAnalysisMode]}
              </Text>
              <Text style={styles.optionHint}>{AI_ANALYSIS_MODE_HINTS_JA[mode as AiAnalysisMode]}</Text>
            </View>
            {aiPreferences.aiAnalysisMode === mode ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
        ))}
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>AIプロンプトデバッグ</Text>
            <Text style={styles.hint}>コンシェルジュで直近リクエストの instructions / payload 全文を表示</Text>
          </View>
          <Switch
            value={aiPreferences.aiConciergeDebugMode}
            onValueChange={(v) => void saveAiPreferences({ aiConciergeDebugMode: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.dataTitle}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.dataBody}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.voiceEnabledLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.voiceEnabledHint}</Text>
          </View>
          <Switch
            value={aiPreferences.voiceEnabled}
            onValueChange={(v) => void saveAiPreferences({ voiceEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.voiceAutoReadLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.voiceAutoReadHint}</Text>
          </View>
          <Switch
            value={aiPreferences.voiceAutoRead}
            onValueChange={(v) => void saveAiPreferences({ voiceAutoRead: v })}
            disabled={!aiPreferences.voiceEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>自発AI提案</Text>
            <Text style={styles.hint}>重要変化をAIが先に通知します（参考型・確認型のみ）</Text>
          </View>
          <Switch
            value={aiPreferences.proactiveBriefingsEnabled}
            onValueChange={(v) => void saveAiPreferences({ proactiveBriefingsEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>復帰時の読み上げ確認</Text>
            <Text style={styles.hint}>アプリ復帰時に未読の重要提案を読み上げるか確認します</Text>
          </View>
          <Switch
            value={aiPreferences.proactiveVoiceOnResume}
            onValueChange={(v) => void saveAiPreferences({ proactiveVoiceOnResume: v })}
            disabled={!aiPreferences.voiceEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <Text style={styles.label}>{AI_SETTINGS.voiceRateLabel}</Text>
        <View style={styles.rateRow}>
          {(
            [
              { rate: 0.75, label: AI_SETTINGS.voiceRateSlow },
              { rate: 1, label: AI_SETTINGS.voiceRateNormal },
              { rate: 1.35, label: AI_SETTINGS.voiceRateFast },
            ] as const
          ).map(({ rate, label }) => (
            <Pressable
              key={label}
              onPress={() => void saveAiPreferences({ voiceSpeechRate: rate })}
              style={({ pressed }) => [
                styles.rateChip,
                aiPreferences.voiceSpeechRate === rate && styles.rateChipActive,
                pressed && styles.optionRowPressed,
              ]}
            >
              <Text
                style={[
                  styles.rateChipText,
                  aiPreferences.voiceSpeechRate === rate && styles.rateChipTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>{AI_SETTINGS.urgentAlertsTitle}</Text>
        <Text style={styles.hint}>{AI_SETTINGS.urgentAlertsHint}</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.urgentVibrationLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.urgentVibrationHint}</Text>
          </View>
          <Switch
            value={aiPreferences.urgentVibrationEnabled}
            onValueChange={(v) => void saveAiPreferences({ urgentVibrationEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{AI_SETTINGS.urgentSoundLabel}</Text>
            <Text style={styles.hint}>{AI_SETTINGS.urgentSoundHint}</Text>
          </View>
          <Switch
            value={aiPreferences.urgentSoundEnabled}
            onValueChange={(v) => void saveAiPreferences({ urgentSoundEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Button label={AI_SETTINGS.clearHistory} onPress={onClearHistory} variant="ghost" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  footer: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rowText: { flex: 1 },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statusLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  statusDetail: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4, marginBottom: theme.spacing.sm },
  btnGap: { height: theme.spacing.xs },
  currentSelection: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  optionRowPressed: { opacity: 0.88 },
  optionRowSelected: {
    backgroundColor: theme.colors.surfaceElevated,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  optionBody: { flex: 1 },
  optionLabel: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  optionLabelSelected: { color: theme.colors.primary },
  optionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  radioOff: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  check: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.lg },
  rateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  rateChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  rateChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  rateChipText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  rateChipTextActive: { color: theme.colors.primary },
});
