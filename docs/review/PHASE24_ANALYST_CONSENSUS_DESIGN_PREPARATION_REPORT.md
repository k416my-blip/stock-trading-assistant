# Step 3 — Phase24 Analyst Consensus Intelligence 設計・実装準備レポート

**記録日時:** 2026-06-13T06:37:22+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**HEAD:** `13fada73a305abff22e901a95b9ce204b3ec36d4`  
**Commit16:** **済み**（Metro / Bundle / Watchdog hardening · push 済み）  
**Step 2:** **完了**（`docs/review/APK_PREVIEW_BUILD_STRATEGY_REPORT.md` · 推奨 EAS preview APK）

**未実施（本 Step の禁止事項遵守）:**

| 項目 | 状態 |
|------|------|
| git add / commit / push | **未実施** |
| 外部 API 接続（Yahoo / Finnhub / AV / FMP live fetch） | **未実施** |
| APK / EAS build | **未実施** |
| 2〜3h 短期テスト | **未実施** |
| 12h 本番 | **未実施** |
| Step 4 本格実装 | **未着手** |

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| **Phase24 設計** | **完了** |
| **骨格実装** | 型 · constants · providers(mock) · service · orchestrator · tests · audit skeleton |
| **APK mode 設計** | `PHASE12_5_RUNTIME_MODE=dev\|apk` · invalid 条件 mode 別 |
| **typecheck** | **PASS** |
| **unit test** | **15/15 PASS**（Phase24 8 + runtime mode 7） |
| **Step 4 に進めるか** | **はい** — 設計・骨格・テスト基盤 OK |

---

## 1. Step 2 レポート確認

| 確認項目 | 結果 |
|----------|------|
| 推奨方式 = EAS preview APK | **確認済** |
| 既存 APK 再利用不可 | **確認済** |
| APK 環境で Metro 依存を外す目的 | **確認済** |
| APK モードで Metro NOT LISTENING を INVALID にしない設計が必要 | **設計済**（§8） |

---

## 2. Phase23 構造確認（参照パターン）

| レイヤ | Phase23 ファイル | 構造 |
|--------|------------------|------|
| 型 | `bursaEarningsRevisionIntelligence.ts` | availability · score · direction · confidence · displayJa · evaluationJa |
| 定数 | `bursaEarningsRevisionIntelligence.ts` | audit stocks · score min/max · thresholds |
| providers | `bursaEarningsRevisionIntelligenceProviders.ts` | partial merge · Yahoo live · Phase14 fallback |
| service | `bursaEarningsRevisionIntelligenceService.ts` | scoring · confidence · buildAnalysis |
| orchestrator | `bursaPhase23Analysis.ts` | enrichStock · fetchedFields / missingFields |
| test | `bursaPhase23.test.ts` | scoring · merge · pipeline offline |
| audit | `bursa-phase23-audit-verify.ts` | 6 銘柄 live audit · markdown report |

Phase24 は同一パターンで **Analyst Consensus 特化**（rating / target / upside / dispersion / revision）に拡張。

---

## 3. Phase24 目的

**Phase24 Analyst Consensus Intelligence**

Bursa Malaysia 銘柄について以下を統合評価する:

- アナリスト人数 · Buy/Hold/Sell 内訳
- コンセンサス rating · 目標株価 · 現在株価 · implied upside
- 目標株価 / rating の改定方向・幅度
- コンセンサスのばらつき（dispersion）
- confidence · warnings · consensus score（-20〜+20）

Phase23（Earnings Revision）と **補完関係**:

| Phase | 焦点 |
|-------|------|
| Phase14 | 生データ取得（rating · target · forecast） |
| Phase22 | Analyst Target Intelligence |
| Phase23 | EPS / 売上 **修正** · upgrade/downgrade |
| **Phase24** | **コンセンサス全体** · upside · dispersion · rating/target revision |

---

## 4. 作成 / 変更したファイル

### 4.1 新規（Phase24）

| ファイル | 役割 |
|----------|------|
| `src/types/bursaAnalystConsensusIntelligence.ts` | ドメイン型 · warnings · display |
| `src/constants/bursaAnalystConsensusIntelligence.ts` | audit stocks · score · thresholds |
| `src/services/bursa/bursaAnalystConsensusIntelligenceProviders.ts` | mock fixture · Phase14 派生 · merge（live API 未接続） |
| `src/services/bursa/bursaAnalystConsensusIntelligenceService.ts` | scoring · confidence · warnings · buildAnalysis |
| `src/services/bursa/bursaPhase24Analysis.ts` | enrichStock orchestrator 骨格 |
| `tests/unit/bursaPhase24.test.ts` | unit test 8 件 |
| `scripts/bursa-phase24-audit-verify.ts` | offline audit skeleton |

### 4.2 新規（APK mode）

| ファイル | 役割 |
|----------|------|
| `scripts/lib/phase12-5-runtime-mode.mjs` | `dev` / `apk` resolver · invalid detector flags |
| `tests/unit/phase12-5RuntimeMode.test.ts` | runtime mode unit test 7 件 |

### 4.3 変更（最小）

| ファイル | 変更 |
|----------|------|
| `scripts/lib/phase12-5-invalid-detectors.mjs` | `runtimeMode` 対応 · bundle WARN モード |
| `src/types/bursaDisclosure.ts` | `analystConsensusIntelligence?` optional フィールド追加 |
| `tests/unit/phase12-5InvalidDetectors.test.ts` | cast 修正（typecheck） |

**未変更:** `package.json` · `app.json` · `eas.json` · `phase12-5-long-run.mjs`（Step 4 で apk mode 配線予定）

---

## 5. Phase24 型設計

```typescript
BursaAnalystConsensusIntelligenceAnalysis {
  availability: 'available' | 'unavailable'
  analystCount, buyCount, holdCount, sellCount
  consensusRating: Strong Buy | Buy | Hold | Sell | Strong Sell
  targetPrice, currentPrice, impliedUpsidePct
  targetRevisionDirection, targetRevisionPct
  ratingRevisionDirection
  consensusDispersion: 0–100
  confidence: High | Medium | Low
  consensusScore: -20 .. +20
  warnings: stale_data | missing_target_price | missing_current_price | ...
  source, updatedAt
  displayJa, evaluationJa
  hasExtractableData, fieldAcquisitionCount/Total
}
```

---

## 6. Provider 設計

| Provider | Step 3 状態 | 説明 |
|----------|-------------|------|
| `mock_fixture` | **実装済** | 1155 監査用 fixture |
| `phase14_consensus` | **実装済** | Phase14 `BursaAnalystConsensusAnalysis` から partial 構築（API なし） |
| `yahoo_finance` / `finnhub` / `alpha_vantage` / `fmp` | **Step 4 予約** | merge rank 定義のみ · live fetch は no-op |
| `unavailable` | **実装済** | provider error safe fallback |

**merge 優先順位:** Yahoo > Finnhub > AV > FMP > Phase14 > mock_fixture

---

## 7. Service 設計

| 関数 | 役割 |
|------|------|
| `computeAnalystConsensusScore` | buy/sell 比率 · upside/downside · revision 方向 |
| `resolveAnalystConsensusConfidence` | analyst count · dispersion · field count |
| `collectAnalystConsensusWarnings` | stale · missing target/price · low count · dispersion · provider error |
| `buildAnalystConsensusIntelligenceAnalysis` | partial → 完全 analysis |
| `analystConsensusIntelligenceMaterialScoreAdjustment` | 材料スコア補正（±8 clamp） |

---

## 8. Scoring 設計

| 条件 | score 影響 |
|------|-----------|
| buy 比率 ≥ 65% | +6 |
| buy 比率 ≥ 50% | +3 |
| sell 比率 ≥ 35% | -6 |
| sell 比率 ≥ 20% | -3 |
| impliedUpside ≥ +15% | +8 |
| impliedUpside ≥ +5% | +4 |
| impliedUpside ≤ -15% | -8 |
| impliedUpside ≤ -5% | -4 |
| target revision Upgraded | +4（pct ≥ 5% で +2 追加） |
| target revision Downgraded | -4（pct ≤ -5% で -2 追加） |
| rating revision Upgraded / Downgraded | ±3 |
| clamp | -20 .. +20 |

---

## 9. Warnings / Fallback 設計

| Warning | 条件 |
|---------|------|
| `stale_data` | updatedAt > 30 日 |
| `missing_target_price` | targetPrice null |
| `missing_current_price` | currentPrice null（upside は provider 値 or 計算不可） |
| `low_analyst_count` | analystCount < 3 |
| `high_dispersion` | dispersion ≥ 55 |
| `provider_error` | provider 例外メッセージ |
| `no_consensus_data` | partial なし |

**Fallback:** データなし → `emptyAnalysis()` · availability `unavailable` · score 0 · confidence Low

---

## 10. Unit test 設計

| ファイル | 件数 | カバー |
|----------|------|--------|
| `bursaPhase24.test.ts` | 8 | scoring · confidence · warnings · merge · enrich offline |
| `phase12-5RuntimeMode.test.ts` | 7 | dev/apk mode · metro skip · bundle warn |

---

## 11. Audit verify 設計

`scripts/bursa-phase24-audit-verify.ts`:

- 6 銘柄ループ · **fetchLiveExternal=false**
- 1155 のみ `useMockFixture=true`
- 出力: `docs/review/PHASE24_ANALYST_CONSENSUS_INTELLIGENCE_AUDIT_SKELETON.md`
- Step 4 で live provider 接続後に本番 audit に昇格

---

## 12. APK mode / Runner INVALID 条件設計

### 12.1 環境変数

```text
PHASE12_5_RUNTIME_MODE=dev   # 既定 — Metro 依存開発テスト
PHASE12_5_RUNTIME_MODE=apk   # preview APK 12h テスト
```

### 12.2 Mode 別 INVALID 条件

| 条件 | dev mode | apk mode |
|------|----------|----------|
| Metro NOT LISTENING | **INVALID** (`metro_down`) | **無視**（checkMetro=false） |
| bundle_error | **INVALID** | **WARN のみ**（`bundleWarn=true` · stop しない） |
| app PID 変更 | **INVALID** | **INVALID** |
| app PID 喪失 | **INVALID** | **INVALID** |
| watch_dead (10min) | **INVALID** | **INVALID** |
| heartbeat / price_update stall | **INVALID**（runner 既存） | **INVALID**（重視） |
| FATAL / ANR | **INVALID**（logcat 既存） | **INVALID** |

### 12.3 実装状態（Step 3）

| コンポーネント | 状態 |
|----------------|------|
| `phase12-5-runtime-mode.mjs` | **実装済** |
| `runInvalidDetectorPass` runtimeMode 対応 | **実装済** |
| `phase12-5-long-run.mjs` への配線 | **Step 4 予定** |
| pre-run-watch / graceful-invalid への mode 記録 | **Step 4 予定** |

### 12.4 apk mode primary signals

```text
app_pid_changed, app_pid_lost, watch_dead,
heartbeat_stall, price_update_stall, fatal_crash, anr
```

---

## 13. 検証結果

### 13.1 typecheck

```text
npm run typecheck → exit 0 (PASS)
```

### 13.2 unit test

```text
npx vitest run tests/unit/bursaPhase24.test.ts tests/unit/phase12-5RuntimeMode.test.ts
→ 15/15 PASS
```

| ファイル | 結果 |
|----------|------|
| `bursaPhase24.test.ts` | **8/8 PASS** |
| `phase12-5RuntimeMode.test.ts` | **7/7 PASS** |

---

## 14. Step 4 以降の予定（本 Step では未実施）

1. Live providers（Yahoo recommendationTrend / Finnhub 等）接続  
2. `bursaMaterialAnalysisService` / UI / Concierge への Phase24 配線  
3. `phase12-5-long-run.mjs` に `PHASE12_5_RUNTIME_MODE` 読み取り  
4. EAS preview APK ビルド + env bake-in  
5. 2〜3h 短期テスト → 12h 本番  

---

## 15. リスクと未解決点

| # | 項目 |
|---|------|
| 1 | Phase24 live provider は Step 4 まで未接続 — 実データ audit 未検証 |
| 2 | `phase12-5-long-run.mjs` はまだ `runtimeMode` 未配線 — dev 動作は従来通り |
| 3 | Phase14 `Maintained` → Phase24 `Stable` へのマッピング — UI 表示要確認 |
| 4 | targetRevision 系フィールドは mock のみ — live ソース設計は Step 4 |
| 5 | Conviction / Material パイプライン統合は Step 4 |

---

## 16. 再実行コマンド

```bash
npm run typecheck
npx vitest run tests/unit/bursaPhase24.test.ts
npx vitest run tests/unit/phase12-5RuntimeMode.test.ts
npx tsx scripts/bursa-phase24-audit-verify.ts
```

---

**レポート作成者:** Cursor Agent（Step 3 設計・骨格のみ）  
**保存パス:** `docs/review/PHASE24_ANALYST_CONSENSUS_DESIGN_PREPARATION_REPORT.md`
