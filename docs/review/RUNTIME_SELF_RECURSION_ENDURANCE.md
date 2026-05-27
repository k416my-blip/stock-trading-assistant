# Runtime Self-Recursion Circuit Breaker & Operational Endurance Hardening

## 実装サマリー

observe-only の Runtime Civilization 拡張として、observer → audit → governance → telemetry → observer の自己循環監視リスクを **検出・スコアリング・可視化** し、120 分以上の長時間運用における memory / telemetry / dashboard payload / MIUI 背景制約下の **実運用耐性** をスコア化します。

- 実行系の circuit breaker（停止・無効化・rollback・pruning）は **実装していません**
- 危険度は `suppressionSuggestion` として timeline / export に **記録のみ**
- recommendation / 売買ロジック / AI reasoning / policy / governance semantics は **未変更**

## 追加モジュール一覧

| パス | 役割 |
|------|------|
| `src/types/runtimeSelfRecursionEndurance.ts` | 型・dashboard profile・export bundle |
| `src/constants/runtimeSelfRecursionEndurance.ts` | バージョン・poll・UI ラベル・監視チェーン |
| `src/runtimeSelfRecursionEndurance/selfRecursionEnduranceCoordinator.ts` | エントリ・throttle・dashboard |
| `src/runtimeSelfRecursionEndurance/recursionCircuitDetector.ts` | 循環回路・recursionDepth |
| `src/runtimeSelfRecursionEndurance/observeOnlyCircuitBreakerScorer.ts` | observe-only 抑制提案記録 |
| `src/runtimeSelfRecursionEndurance/operationalEnduranceEngine.ts` | 長時間耐性スコア・risk band |
| `src/runtimeSelfRecursionEndurance/*Monitor*.ts` / `*Scorer*.ts` | echo / drift / MIUI / battery |
| `src/runtimeSelfRecursionEndurance/selfRecursionEnduranceSoakIntegration.ts` | replay hooks |
| `src/native/soak/runtimeSelfRecursionEnduranceSoakScenario.ts` | soak ステップ |
| `src/verify/runtimeSelfRecursionEndurance.verify.ts` | smoke verify |
| `tests/unit/runtimeSelfRecursionEndurance/` | 単体テスト |

## Dashboard metrics

Runtime Stability パネル（`RuntimeStabilityDashboardPanel`）および Collapse Radar に追加:

- `recursionCircuitRisk`
- `observerEchoRisk`
- `telemetryEchoRisk`
- `auditLoopRisk`
- `operationalEnduranceScore` (`runtimeOperationalEnduranceScore`)
- `dashboardPayloadGrowthRisk`
- `longSessionDriftRisk`
- `runtimeEnduranceConfidence`
- 補助: `recursionDepth`, `enduranceRiskBand`, MIUI / battery saver 観測

## Soak scenarios

Automated soak scenario ID: **`runtime_self_recursion_endurance`**

Replay hooks（observe-only 記録）:

- observer audit loop
- telemetry echo loop
- recursive governance feedback
- dashboard payload growth
- long-session drift
- MIUI background starvation
- battery saver observer delay
- narrative recursion amplification

`runtimeStabilityStressHarness` にも統合済み。

## Export 一覧

- `buildRuntimeSelfRecursionEnduranceExportBundle()`
- `formatRuntimeSelfRecursionEnduranceExportJson()`

含むレポート:

- `circuitBreakerReport`（`observeOnly: true` + `suppressionSuggestions`）
- `recursionCircuitReport`
- `operationalEnduranceReport`
- `miuiEnduranceReport`

## observe-only 保証

- `block` / `disable` / `rollback` / `pruning` / `kill` / `cleanup` / runtime state mutation **なし**
- `suppressionSuggestion` は文字列記録のみ（実行フックなし）
- `governanceMode` は入力観測のみ（意味変更なし）

## recommendation / 売買ロジック未変更保証

本レイヤーは `src/runtimeSelfRecursionEndurance/` と Stability UI / soak / native telemetry 配線のみ。以下には **差分なし**:

- recommendation engine
- 売買判断・execution
- AI reasoning / price prediction
- policy / governance semantics

## runtime への非干渉保証

- `nativeRuntimeIntegration.observeNativeDeviceTelemetryFromMetrics` は既存 metrics から入力を組み立て **観測サンプルのみ**
- orchestrator / trading / AI concierge の意思決定パスへ書き込みなし
- soak active 時は timeline checkpoint のみ追加

## Verify

```bash
npm run typecheck
npm run verify:runtime-self-recursion-endurance
npm run verify:soak-runner
npm run verify:all-runtime-stacks
```
