# Phase21.5 Fair Value Enhancement 監査レポート

## 1. 実施日時

- **実施:** 2026-06-11T01:32:52.872Z
- **コミット:** `338ebc4`
- **対象:** 監査6銘柄（Maybank / CIMB / Public Bank / Tenaga / Nestle / Petronas Gas）

## 2. サマリー

| 指標 | 結果 |
|------|------|
| **総合判定** | **PASS** |
| 6銘柄 Fair Value 算出 | 6/6 PASS |
| **DCF取得率** | **17% (1/6)** |
| **DDM取得率** | **83% (5/6)** |
| 平均フィールド取得率 | 75.0% |
| 信頼度 High / Medium / Low | 6 / 0 / 0 |

## 3. モデル別採用率

| モデル | 採用率 |
|------|------|
| DCF | 17% (1/6) |
| DDM | 83% (5/6) |
| PER補完 | 100% (6/6) |

## 4. フォールバック（Yahoo → Financial Report → Bursa）

Phase21.5 で `fetchAllFairValuePartials` により以下の順でマージ:
1. Yahoo Finance（FCF/OCF代理/EPS/配当）
2. Financial Report（利益・売上成長率 → FCF/DDM成長）
3. Bursa Disclosure（EPS/配当利回り/四半期利益成長）
4. Phase17 Dividend Intelligence

## 5. 6銘柄結果

| 銘柄 | 判定 | 適正株価 | DCF | DDM | PER | 使用モデル | 信頼度 | 推奨 |
|------|------|----------|-----|-----|-----|------------|--------|------|
| Maybank (1155) | PASS | RM 7.25 | 未取得 | RM 5.04 | RM 9.46 | DDM + PER補完 | High | Avoid |
| CIMB (1023) | PASS | RM 5.50 | 未取得 | RM 3.08 | RM 7.92 | DDM + PER補完 | High | Avoid |
| Public Bank (1295) | PASS | RM 3.32 | 未取得 | RM 2.57 | RM 4.07 | DDM + PER補完 | High | Avoid |
| Tenaga (5347) | PASS | RM 18.75 | 未取得 | RM 22.75 | RM 14.76 | DDM + PER補完 | High | Buy |
| Nestle (4707) | PASS | RM 81.20 | RM 103.16 | 未取得 | RM 59.25 | DCF + PER補完 | High | Reduce |
| Petronas Gas (6033) | PASS | RM 9.55 | 未取得 | RM 5.33 | RM 13.76 | DDM + PER補完 | High | Avoid |

## 6. DCF未取得理由（銘柄別）

- **Maybank (1155)**: FCF未取得（Yahoo/FR/Bursaいずれも未取得）
- **CIMB (1023)**: FCF未取得（Yahoo/FR/Bursaいずれも未取得）
- **Public Bank (1295)**: FCF未取得（Yahoo/FR/Bursaいずれも未取得）
- **Tenaga (5347)**: FCF≤0（銀行等は営業CFフォールバック後も≤0）
- **Nestle (4707)**: 算出成功
- **Petronas Gas (6033)**: 適正株価が現在株価の0.25–4.0倍レンジ外

## 7. DDM未取得理由（銘柄別）

- **Maybank (1155)**: 算出成功
- **CIMB (1023)**: 算出成功
- **Public Bank (1295)**: 算出成功
- **Tenaga (5347)**: 算出成功
- **Nestle (4707)**: 成長率不足（g≥r-2%でGordon Growth不成立）
- **Petronas Gas (6033)**: 算出成功

## 8. 確認項目チェックリスト

| # | 項目 | 状態 |
|---|------|------|
| 1 | DCF未取得理由を銘柄別表示 | ✅ |
| 2 | DDM未取得理由（配当取得/成長率/計算条件） | ✅ |
| 3 | Yahoo→FR→Bursa フォールバック | ✅ 実装済 |
| 4 | 使用モデル表示（DCF/DDM/PER補完） | ✅ |
| 5 | 信頼度 High/Medium/Low | ✅ |

## 9. PASS/FAIL

**PASS** — 6/6 銘柄で Fair Value 算出成功。

Phase21.5 要件を満たしています。
