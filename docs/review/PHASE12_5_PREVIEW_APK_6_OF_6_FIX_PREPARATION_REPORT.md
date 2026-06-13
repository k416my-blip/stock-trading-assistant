# Phase12.5 Preview APK — 6/6 Smoke Fix Preparation Report

## 実施時刻

| 項目 | 値 |
|------|-----|
| 開始 | 2026-06-13 14:09 JST 頃（UTC 06:09） |
| smoke 完了 | 2026-06-13 14:17 JST（UTC 06:17） |
| 状態 | **6/6 PASS · runner exit code 0** |

## ビルド / APK

| 項目 | 値 |
|------|-----|
| build id | `c961d709-0fd5-4faa-8200-0fd85fdeddc1` |
| versionCode | **3**（install 済み · **v4 build 未実施**） |
| Metro | なし（`:8081` LISTENING なし） |

## 前回結果

- **5/6 PASS**（FAIL: 1295 detail · 6033 card not found）
- runner exit code: 1

---

## 修正ファイル一覧

| ファイル | 内容 |
|----------|------|
| `scripts/lib/phase12-5-device-ui.mjs` | `pickStockCardTapTargets` · ticker 行 tap 優先 · `isWrongStockDetail` · detail 判定厳格化 |
| `scripts/phase12-5-long-run.mjs` | 複数 tap target 試行 · 1295 `detailExclude` · 6033 `cardNames` · retry に `wrong_detail_stock` |
| `src/data/sampleStocks.ts` | Public Bank **5225→1295** · IHH **5225** 追加 · **6033 Petronas Gas** 追加 |
| `tests/unit/phase12-5DeviceUi.test.ts` | ticker 優先 · IHH 誤遷移検出テスト |
| `tests/unit/phase12-5InvalidDetectors.test.ts` | `runtimeMode: 'dev'` 明示で deterministic 化 |

---

## 1. 1295 Public Bank — detail 遷移修正

### 問題
- card title「Public Bank Berhad」検出 OK
- `5225 · バルサ` tap → live KLSE API が **IHH Healthcare** を返し誤遷移
- sampleStocks 上 Public Bank が symbol **5225**（誤）だった

### 対応
- **`pickStockCardTapTargets`**: `screenerSymbols` 付き ticker 行（`5225 · バルサ`）を **最優先 tap**
- 複数 target を順に試行（ticker → title）
- **`isWrongStockDetail`**: IHH / Healthcare 検出時 `wrong_detail_stock` → 戻る → 次 target
- **`isStockDetailVisible`**: `cardNames` / `screenerSymbols` あり銘柄は **名称一致必須**（5225 コードのみでは PASS しない）
- **`detailExclude: ['IHH', 'Healthcare']`** を 1295 STOCK 定義に追加
- sampleStocks: Public Bank symbol **1295** へ修正 · IHH を **5225** として別途追加

### smoke 結果（v3 APK）
| 項目 | 値 |
|------|-----|
| queriesTried | Public Bank |
| card found | ✅ |
| detail visible | ✅ |
| tapLabel | `Public Bank`（5225 ticker で IHH WARN 後 · title tap で成功） |
| **結果** | **PASS** |

---

## 2. 6033 Petronas Gas — sampleStocks 追加

### 追加内容

```typescript
{
  symbol: '6033',
  name: 'Petronas Gas Berhad',
  market: 'bursa',
  currency: 'MYR',
  price: 18.5,
  ...
}
```

- runner: `cardNames: ['Petronas Gas Berhad']` · `cardMustInclude: ['Gas']` · `cardExclude: ['Chemicals']`

### 5225 / 1295 整合性

| symbol | 修正前 | 修正後 |
|--------|--------|--------|
| 1295 | （なし） | Public Bank Berhad |
| 5225 | Public Bank Berhad（誤） | IHH Healthcare Berhad |

- runner `screenerSymbols: ['5225']` は **v3 APK 互換**のため維持（v4 install 後は card が 1295 表示に変わる想定）

### smoke 結果（v3 APK）

| 項目 | 値 |
|------|-----|
| queriesTried | Petronas, Petronas Gas |
| winning query | Petronas Gas |
| card found | ✅ |
| detail visible | ✅ |
| tapLabel | Petronas Gas |
| **結果** | **PASS** |

> **注記:** sampleStocks 変更はソース上完了。**v4 rebuild + install 後**に catalog が 6033 / 1295 で固定される。v3 上の今回 PASS は runner 強化 + 検索 query 改善によるもの。本番 12h 前には **v4 build 推奨**。

---

## 3. invalid detector unit test 修正

### 原因
- `PHASE12_5_RUNTIME_MODE=apk` が shell 環境に残存
- `resolveInvalidDetectorFlags` が env から apk mode を読み、`metro_down` / `bundle_error` が stop しない

### 修正
- `metro_down` テスト: `runtimeMode: 'dev'`, `checkMetro: true` 明示
- `bundle_error` テスト: `runtimeMode: 'dev'`, `checkBundle: true`, `checkMetro: false` 明示

### 期待挙動（再確認）

| mode | metro_down | bundle_error |
|------|------------|--------------|
| dev | INVALID (stop) | INVALID (stop) |
| apk | 非 INVALID | WARN のみ |

---

## 4. 検証結果

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | ✅ **PASS** |
| `phase12-5RuntimeMode.test.ts` | ✅ 12/12 |
| `phase12-5DeviceUi.test.ts` | ✅ 9/9 |
| `phase12-5InvalidDetectors.test.ts` | ✅ **15/15** |
| `bursaPhase24.test.ts` | ✅ 40/40 |

---

## 5. v3 APK smoke 再確認

| 項目 | 結果 |
|------|------|
| runner exit code | **0** |
| PASS 数 | **6 / 6** |
| price_refresh | ✅ ok |
| bundleError | false |
| FATAL / ANR | 0 / 0 |
| foreground | `com.assistant.stocktrading` |
| ログ | `docs/review/phase12-5-long-run/smoke-6of6-fix-run.log` |

| code | label | 結果 | tapLabel |
|------|-------|------|----------|
| 1155 | Maybank | **PASS** | 1155 · バルサ・マレーシア |
| 1023 | CIMB | **PASS** | 1023 · バルサ・マレーシア |
| 1295 | Public Bank | **PASS** | Public Bank |
| 5347 | Tenaga | **PASS** | 5347 · バルサ・マレーシア |
| 4707 | Nestle | **PASS** | Nestle |
| 6033 | Petronas Gas | **PASS** | Petronas Gas |

---

## 6. preview APK v4 build 要否

| 項目 | 状態 |
|------|------|
| v4 build | ❌ **未実施**（指示どおり） |
| v4 必要性 | **推奨** — sampleStocks（1295 / 6033 / 5225=IHH）を APK に焼き込み · v3 catalog 誤 symbol 根絶 |
| v3 smoke | 6/6 PASS（runner 修正のみでも到達） |

---

## 7. 未実施確認

| 項目 | 状態 |
|------|------|
| 2〜3h 短期テスト | ❌ **未開始** |
| 12h 本番 | ❌ **未開始** |
| preview APK v4 build | ❌ **未実施** |
| git add / commit / push | ❌ **未実施** |

---

## 8. 次の作業

1. **git commit** — runner + sampleStocks + unit test + 本レポート
2. **versionCode 4 bump** + preview APK v4 build
3. **install** v4 on device
4. **6/6 smoke 再確認**（catalog 整合確認 · 1295 card が 1295 表示になること）
5. logcat ローテート · pre-run-watch / watchdog
6. **2〜3h 短期テスト**（ユーザー承認後）
