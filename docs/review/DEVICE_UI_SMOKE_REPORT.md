# DEVICE_UI_SMOKE_REPORT

## 概要

Phase24 / Phase23.1 UI 露出のデバイススモーク結果。

- 日付: 2026-06-19
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033
- スクリプト: `scripts/bursa-phase24-23_1-ui-device-verify.mjs`

---

## 1. 実行結果サマリー

| 検証層 | 結果 | 備考 |
|--------|------|------|
| **Unit test** | PASS | `bursaMaterialAnalysisUi.test.ts` |
| **UI pipeline verify** | **6/6 PASS** | MaterialStockRow 全フィールド |
| **Device UI smoke** | **BLOCKED** | ADB デバイス未接続 |

---

## 2. UI Pipeline Verify（6銘柄）

```
npx tsx scripts/bursa-phase24-23_1-ui-pipeline-verify.ts
```

| Code | Phase24 UI | Phase23.1 UI | Status |
|------|------------|--------------|--------|
| 1155 | ✅ | ✅ | PASS |
| 1023 | ✅ | ✅ | PASS |
| 1295 | ✅ | ✅ | PASS |
| 5347 | ✅ | ✅ | PASS |
| 4707 | ✅ | ✅ | PASS |
| 6033 | ✅ | ✅ | PASS |

Phase24 確認項目: Source, Consensus, Target, Score, Confidence — すべて非空  
Phase23.1 確認項目: Cross Signal, Direction, Alignment, Score, Material Impact — すべて非空

---

## 3. Device UI Smoke

```bash
node scripts/bursa-phase24-23_1-ui-device-verify.mjs
```

| 項目 | 値 |
|------|-----|
| ADB | false |
| 判定 | **DEFERRED** — デバイス接続待ち |
| 出力 | `docs/review/phase24-23_1-ui-device/device-results.json` |

デバイス接続時の検証フロー:

1. 材料分析タブを開く
2. 再取得 → データロード完了待ち
3. Phase24 / Phase23.1 ラベルをスクロール検出
4. 6銘柄を順に選択し UI マーカー数をカウント
5. スクリーンショット保存

期待マーカー:

- Phase24: `Phase24 Analyst Consensus Intelligence`, `Source:`, `Consensus:`, `Target:`, `Score:`, `Confidence:`
- Phase23.1: `Phase23.1 Earnings Revision Cross Signal`, `Cross Signal:`, `Direction:`, `Alignment:`, `Material Impact:`

---

## 4. 判定

| 基準 | 結果 |
|------|------|
| パイプライン 4/6 以上 | **6/6 PASS** ✅ |
| デバイス 4/6 以上 | **未実施**（ADB なし） |
| 総合（コード + パイプライン） | **PASS**（実機は接続後再検証推奨） |

---

## 5. GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | **`69cf90f`** |
| Push | **成功** — `fa0cb50..69cf90f` |

---

## 再実行

```bash
npx vitest run tests/unit/bursaMaterialAnalysisUi.test.ts
npx tsx scripts/bursa-phase24-23_1-ui-pipeline-verify.ts
node scripts/bursa-phase24-23_1-ui-device-verify.mjs
```
