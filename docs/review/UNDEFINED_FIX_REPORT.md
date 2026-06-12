# `Cannot convert undefined value to object` — 修正レポート

| 項目 | 値 |
|------|-----|
| 修正日 | **2026-06-10** |
| 実機 | Redmi 23090RA98G (`FYRWXSNNAIOR9DCM`) |
| 検証スクリプト | `node scripts/undefined-fix-device-verify.mjs` |
| 単体テスト | `tests/unit/bursaPayloadNormalize.test.ts` |

## 総合判定 — **PASS**

| 区分 | 結果 |
|------|------|
| 5 Bursa タブ（AI通知・材料分析・市場監視・今日の売買・AI資産運用） | **PASS** — undefined エラーなし |
| 9 画面実機再検証 | **PASS** — 全画面 `error: false` |
| logcat `convert undefined` | **PASS** — 検出なし |
| typecheck | **PASS** |
| unit（bursaPayloadNormalize + Phase7/9/11） | **PASS** 17/17 |

---

## 1. 根本原因

### 症状
Hermes ランタイムで **`Cannot convert undefined value to object`** が表示され、以下 5 画面が利用不能だった。

- AI通知 · 材料分析 · 市場監視 · 今日の売買 · AI資産運用

### 原因
**AsyncStorage に保存された旧版 Bursa 開示キャッシュ**に、現行解析コードが前提とする配列フィールドが欠落していた。

| 欠落フィールド | 影響箇所 |
|----------------|----------|
| `quarterly.annualRecords` | `filterCompleteFyAnnual`, `bursaRankingMetrics`, Phase5/9 |
| `quarterly.quarterlyHistory` | `peerSnapshotFromBundle`, `buildBursaFiveYearTrend`, 材料ソース |
| `dividend.history` | `dividendByYear`, `buildDisclosureMaterialInputs` |
| `profile/quarterly/dividend.fetchedFields` | `bursaDisclosureService` の spread |
| `sourceStatus` | Phase11 材料分析 · `Object.entries` / spread |

Hermes では `...(undefined)` や `Object.entries(undefined)` が上記メッセージで落ちる。

---

## 2. 修正内容

### 2.1 中央正規化 — `bursaPayloadNormalize.ts`（新規）

キャッシュ復元時・bundle 組み立て時に必須配列を `[]` で補完。

```typescript
// 修正後（抜粋）
export function normalizeQuarterlyBundle(raw, stockCode) {
  return {
    ...
    quarterlyHistory: asRecordArray(raw?.quarterlyHistory),
    annualRecords: asRecordArray(raw?.annualRecords),
    fetchedFields: asStringArray(raw?.fetchedFields),
    missingFields: asStringArray(raw?.missingFields),
  };
}
```

### 2.2 AsyncStorage 読み取り — `bursaDisclosureCache.ts`

**修正前:**
```typescript
const env = JSON.parse(raw) as CacheEnvelope<T>;
return { payload: env.payload, cached: true };
```

**修正後:**
```typescript
if (!raw || raw.trim() === '') return null;
try { env = JSON.parse(raw); } catch { removeItem; return null; }
if (!env?.payload || !env.expiresAt) { removeItem; return null; }
const payload = normalizeCachedPayload(category, stockCode, env.payload);
return { payload, cached: true };
```

### 2.3 解析チェーン防御（代表例）

**`bursaTrendAnalysis.ts` — 修正前:**
```typescript
export function filterCompleteFyAnnual(records: BursaQuarterlyRecord[]) {
  const rows = records.filter(isCompleteFyRow);
```

**修正後:**
```typescript
export function filterCompleteFyAnnual(records?: BursaQuarterlyRecord[] | null) {
  const rows = (records ?? []).filter(isCompleteFyRow);
```

**`bursaPhase7Analysis.ts` — 修正前:**
```typescript
fetchedFields.push(...phase6.fetchedFields);
```

**修正後:**
```typescript
fetchedFields.push(...(phase6.fetchedFields ?? []));
```

**`bursaMaterialAnalysisService.ts` — 修正前:**
```typescript
...stock.positiveMaterials,
```

**修正後:**
```typescript
...(stock.positiveMaterials ?? []),
```

### 2.4 Hermes ログ + ユーザー向けメッセージ — `bursaAnalysisDiagnostics.ts`

```typescript
console.error(`[BursaAnalysis:${screen}]`, msg, context, stack);
// Hermes undefined → 日本語フォールバック（Cannot convert を表示しない）
mapBursaAnalysisError('MaterialAnalysis', e, MATERIAL_ANALYSIS_MISSING_JA);
```

### 2.5 Error Boundary — `BursaDataErrorBoundary.tsx`

5 Bursa タブを `MainTabNavigator` でラップ。同期レンダーエラー時は **「データ取得エラー」** 表示（Red Screen 回避）。

`AppErrorBoundary` のフォールバック文言も「データ取得エラー」に更新。

---

## 3. 変更ファイル一覧

| ファイル | 変更概要 |
|----------|----------|
| `src/services/bursa/bursaPayloadNormalize.ts` | **新規** — キャッシュ正規化 |
| `src/services/bursa/bursaAnalysisDiagnostics.ts` | **新規** — ログ + エラーマップ |
| `src/components/BursaDataErrorBoundary.tsx` | **新規** — タブ用 Error Boundary |
| `src/services/bursa/bursaDisclosureCache.ts` | JSON 破損吸収 + 正規化 |
| `src/services/bursa/bursaDisclosureService.ts` | bundle 出口で normalize |
| `src/services/bursa/bursaTrendAnalysis.ts` | annualRecords / history 防御 |
| `src/services/bursa/bursaPeerSnapshotService.ts` | quarterlyHistory 防御 |
| `src/services/bursa/bursaRankingMetrics.ts` | annualRecords / history 防御 |
| `src/services/bursa/bursaMonitoringDetectors.ts` | quarterlyHistory 防御 |
| `src/services/bursa/bursaMaterialSources.ts` | history / quarterlyHistory 防御 |
| `src/services/bursa/bursaMaterialDataQuality.ts` | sourceStatus / materials spread |
| `src/services/bursa/bursaMaterialAnalysisService.ts` | sourceStatus / materials spread |
| `src/services/bursa/bursaPhase7Analysis.ts` | phase6 fields spread |
| `src/services/bursa/bursaPhase8Analysis.ts` | rankedTop100 spread |
| `src/services/bursa/bursaPhase11Analysis.ts` | sourceStatus デフォルト |
| `src/services/bursa/bursaMonitoringStorage.ts` | snapshot 正規化 |
| `src/context/BursaConciergeContext.tsx` | mapBursaAnalysisError |
| `src/context/BursaMaterialContext.tsx` | mapBursaAnalysisError |
| `src/screens/*` (4画面) | mapBursaAnalysisError |
| `src/navigation/MainTabNavigator.tsx` | BursaDataErrorBoundary ラップ |
| `tests/unit/bursaPayloadNormalize.test.ts` | **新規** — 破損キャッシュテスト |

---

## 4. 実機検証結果（2026-06-10 09:01 JST）

### レポート JSON
[`undefined-fix-device/report.json`](undefined-fix-device/report.json)

```json
{
  "pass": true,
  "undefinedErrors": [],
  "logcatHasUndefined": false
}
```

### スクリーンショット（修正後）

| 画面 | ファイル | 結果 |
|------|----------|------|
| ホーム | [`undefined-fix-device/01-home.png`](undefined-fix-device/01-home.png) | PASS |
| 保有銘柄 | [`undefined-fix-device/02-portfolio.png`](undefined-fix-device/02-portfolio.png) | PASS |
| AIコンシェルジュ | [`undefined-fix-device/04-ai-concierge.png`](undefined-fix-device/04-ai-concierge.png) | PASS |
| 材料分析 | [`undefined-fix-device/03-material-analysis.png`](undefined-fix-device/03-material-analysis.png) | PASS |
| AI通知 | [`undefined-fix-device/07-ai-notifications.png`](undefined-fix-device/07-ai-notifications.png) | PASS |
| 市場監視 | [`undefined-fix-device/08-market-monitoring.png`](undefined-fix-device/08-market-monitoring.png) | PASS |
| 今日の売買 | [`undefined-fix-device/09-today-trading.png`](undefined-fix-device/09-today-trading.png) | PASS |
| AI資産運用 | [`undefined-fix-device/10-asset-management.png`](undefined-fix-device/10-asset-management.png) | PASS |
| 設定 | [`undefined-fix-device/11-settings.png`](undefined-fix-device/11-settings.png) | PASS |

### 修正前（比較用 · FINAL_REVIEW_V2）

| 画面 | 修正前 |
|------|--------|
| 材料分析 | [`final-review-v2-device/03-material-analysis.png`](final-review-v2-device/03-material-analysis.png) — **FAIL** |
| AI通知 | [`final-review-v2-device/07-ai-notifications.png`](final-review-v2-device/07-ai-notifications.png) — **FAIL** |
| 市場監視 | [`final-review-v2-device/08-market-monitoring.png`](final-review-v2-device/08-market-monitoring.png) — **FAIL** |
| 今日の売買 | [`final-review-v2-device/09-today-trading.png`](final-review-v2-device/09-today-trading.png) — **FAIL** |
| AI資産運用 | [`final-review-v2-device/10-asset-management.png`](final-review-v2-device/10-asset-management.png) — **FAIL** |

### logcat
[`undefined-fix-logcat.txt`](undefined-fix-logcat.txt) — `convert undefined` **なし**

---

## 5. 残課題

| 項目 | 状態 |
|------|------|
| News API Developer 429 | **未解決**（本修正スコープ外 · レート制限） |
| 旧キャッシュの完全削除 | 任意 — TTL 経過で自然失効。必要なら `bursaDisclosureCache` バージョンキー追加 |
| Phase11 外部 API live 証拠 | 別途 FINAL_REVIEW_V2 参照 |

---

## 6. 再現コマンド

```bash
npm run typecheck
npx vitest run tests/unit/bursaPayloadNormalize.test.ts

adb reverse tcp:8081 tcp:8081
npm run start:clear   # Metro 再起動後
node scripts/undefined-fix-device-verify.mjs
```

---

## 最終判定

# **PASS**

5 Bursa 画面の `Cannot convert undefined value to object` は **根本原因修正 + 実機 9 画面検証で解消** を確認。
