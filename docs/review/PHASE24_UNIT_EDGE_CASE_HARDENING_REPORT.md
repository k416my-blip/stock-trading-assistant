# Phase24 Unit / Edge Case Hardening Report (Step 5)

**記録日時:** 2026-06-13T07:36:28+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**base HEAD:** `c0b1077a921ea3a40949af753ef957d71a700389` (Commit18)  
**git commit / push:** **未実施**（Step 5 指示どおり）

---

## エグゼクティブサマリー

| 項目 | Commit18 時点 | Step 5 完了後 |
|------|---------------|---------------|
| **typecheck** | PASS | **PASS** |
| **unit test** | 44/44 PASS | **67/67 PASS** (+23) |
| **offline audit** | 6/6 PASS | **6/6 PASS** |
| **APK build** | 未実施 | **未実施** |
| **2〜3h 短期テスト** | 未実施 | **未実施** |
| **12h 本番** | 未実施 | **未実施** |

Step 5 は完了。Commit19 用の変更はワーキングツリーにあり、ユーザー指示待ち。

---

## 1. 目的

Phase24 Analyst Consensus Intelligence と Phase12.5 runtime mode / invalid detector 周辺の **エッジケース単体テスト強化** と、テストで露呈した **最小限のサービス修正**。

---

## 2. 変更ファイル（未コミット · 5 件）

| # | ファイル | 内容 |
|---|----------|------|
| 1 | `src/services/bursa/bursaAnalystConsensusIntelligenceService.ts` | `computeImpliedUpside` の非正価格拒否、`collectAnalystConsensusWarnings` 重複排除、`fetchLiveExternal` 透過、Buy/Hold/Sell 比率の count 不一致時は sum 優先 |
| 2 | `src/services/bursa/bursaAnalystConsensusIntelligenceProviders.ts` | mock データあり + 外部 provider エラー時に `providerError` を merged に伝播 |
| 3 | `tests/unit/bursaPhase24.test.ts` | `bursaPhase24 edge cases` describe 追加（16 ケース相当） |
| 4 | `tests/unit/phase12-5RuntimeMode.test.ts` | env 未設定 / 大文字空白 / 未知値 / dev bundle_error INVALID (+4) |
| 5 | `tests/unit/phase12-5InvalidDetectors.test.ts` | offset 超過安全 fallback / apk metro_down 非 INVALID (+2) |

---

## 3. 追加・強化したエッジケース

### Phase24 (`bursaPhase24.test.ts` · 40 tests)

- `analystCount === 0` で score 計算が throw しない
- Buy/Hold/Sell 全 0 → 日本語 missing ラベル
- `analystCount` と buy+hold+sell 合計不一致 → **合計を分母**に使用
- `computeImpliedUpside`: null / 0 / 負の current・target → null
- 極端 upside/downside の score clamp
- dispersion 0 / 100 の confidence
- warning 重複排除（`missing_target_price` + `stale_data` 等）
- Phase14 partial の欠損フィールド
- **partial mock + provider error** → `available` かつ `provider_error` 警告
- provider error + データなし → `unavailable`
- 監査 6 銘柄 score が -20..+20 内
- 日本語 `evaluationJa` 非空

### Runtime mode (`phase12-5RuntimeMode.test.ts` · 12 tests)

- `PHASE12_5_RUNTIME_MODE` 未設定 → `dev`
- ` APK ` / 大文字 → `apk`
- 未知値 → `dev` fallback
- dev モードで `bundle_error` → INVALID

### Invalid detectors (`phase12-5InvalidDetectors.test.ts` · 15 tests)

- log scan offset がファイルサイズ超過でも安全
- apk モードで `metro_down` は INVALID にならない

---

## 4. サービス修正（テスト駆動 · 最小 diff）

1. **`computeImpliedUpside`** — `currentPrice <= 0` または `targetPrice <= 0` は null
2. **`collectAnalystConsensusWarnings`** — `[...new Set(warnings)]` で重複排除
3. **`buildAnalystConsensusIntelligenceAnalysis`** — `fetchLiveExternal` を providers へ透過（以前は常に `false`）
4. **Buy/Hold/Sell 比率** — `analystCount !== buy+hold+sell` かつ sum > 0 のとき sum を分母（`computeBuyHoldSellBalance` / `computeAnalystConsensusScore` 共通）
5. **外部 provider エラー伝播** — mock マージ成功時も `fetchLiveExternal` 由来の `providerError` を warnings に残す

---

## 5. 検証コマンドと結果

```text
npm run typecheck
→ PASS

npx vitest run tests/unit/bursaPhase24.test.ts \
  tests/unit/phase12-5RuntimeMode.test.ts \
  tests/unit/phase12-5InvalidDetectors.test.ts
→ 3 files · 67/67 PASS

npx tsx scripts/bursa-phase24-audit-verify.ts
→ 1155/1023/1295/5347/4707/6033 成功 · 6/6 PASS
```

---

## 6. ロードマップ位置

| Step | 状態 |
|------|------|
| Step 1–4 | ✅ 完了（Commit16–18） |
| **Step 5 — unit / edge hardening** | **✅ 完了（本レポート）** |
| Step 6 — 2〜3h 短期テスト | ❌ 未着手 |
| Step 7 — APK 12h テスト | ❌ 未着手 |

---

## 7. Commit19  readiness

- 変更は **5 ファイル + 本レポート**、スコープは Step 5 限定
- 推奨 commit message: `phase24: harden unit tests and edge-case handling`
- **push / APK / 短期・12h テストはユーザー明示指示まで保留**
