# Phase18.7 Event Expansion Engine 監査レポート

実行日時: 2026-06-10T08:39:33.870Z
結果: **PASS** (6/6 成功, クラッシュ 0)

## 1. Event別件数（拡張後）

| Event | 件数 |
|-------|------|
| Other | 100 |
| Regulatory | 27 |
| Dividend Increase | 4 |
| Partnership | 3 |
| Commodity | 2 |
| Earnings | 1 |
| Expansion | 1 |

## 2. Other削減率

| 指標 | Phase18.6 | Phase18.7 |
|------|-----------|-----------|
| Other合計 | 132（監査基準） | 100（event分布: 100） |
| 拡張前Other（再計測） | — | 131 |
| 削減件数 | — | 31 |
| **削減率** | — | **24%** |
| 新規分類件数 | — | 31 |

## 3. 分類前後比較

| Event | 拡張前 | 拡張後 | Δ |
|-------|--------|--------|---|
| Commodity | 2 | 2 | +0 |
| Dividend Increase | 4 | 4 | +0 |
| Earnings | 1 | 1 | +0 |
| Expansion | 0 | 1 | +1 |
| Other | 112 | 100 | -12 |
| Partnership | 0 | 3 | +3 |
| Regulatory | 0 | 27 | +27 |

### 拡張サンプル（Other→新Event）

- [Maybank] Other→Regulatory: Home - Bursa Malaysia
- [Maybank] Other→Regulatory: MAYBANK - MALAYAN BANKING BERHAD (1155) : 公司简介 - Bursa Malaysia
- [Maybank] Other→Regulatory: MAYBANK - MALAYAN BANKING BERHAD (1155) : Profil Syarikat - Bursa Malaysia
- [CIMB] Other→Regulatory: DEALINGS IN LISTED SECURITIES (CHAPTER 14 OF LISTING REQUIREMENTS) : Dealings Ou
- [CIMB] Other→Regulatory: Home - Bursa Malaysia
- [CIMB] Other→Regulatory: CIMB - Bursa Malaysia - Bursa Malaysia
- [CIMB] Other→Regulatory: CIMB - CIMB GROUP HOLDINGS BERHAD (1023) : 公司简介 - Bursa Malaysia
- [CIMB] Other→Regulatory: CIMB-C2G: CW CIMB GROUP HOLDINGS BERHAD (CLSA) - Bursa Malaysia
- [Public Bank] Other→Regulatory: PBBANK - PUBLIC BANK BERHAD (1295) : 公司简介 - Bursa Malaysia
- [Public Bank] Other→Regulatory: PUBLIC BANK BERHAD - Bursa Malaysia
- [Public Bank] Other→Regulatory: PBBANK-C1T - PBBANK-C1T: CW PUBLIC BANK BERHAD (KIBB) (12951T) : 公司简介 - Bursa Ma
- [Public Bank] Other→Expansion: Public Bank Bhd stock (MYL1295OO004): earnings momentum and regional banking foo

## 4. 6銘柄ライブ結果

| 銘柄 | Other前 | Other後 | 削減率 | 拡張件数 | Top Event | News補助 | Δ |
|------|---------|---------|--------|----------|-----------|----------|---|
| Maybank (1155) | 20 | 17 | 15% | 3 | Earnings | +0.3 | +0 |
| CIMB (1023) | 25 | 20 | 20% | 5 | Regulatory | +0.3 | +0 |
| Public Bank (1295) | 18 | 14 | 22% | 4 | Regulatory | +1.6 | +0 |
| Tenaga (5347) | 24 | 19 | 21% | 5 | Regulatory | -0.5 | +0 |
| Nestle (4707) | 23 | 17 | 26% | 6 | Regulatory | +0 | +0 |
| Petronas Gas (6033) | 21 | 13 | 38% | 8 | Regulatory | +16.5 | +16 |

## 5. エラー

- なし

## 6. 判定: PASS

合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Other合計が削減、削減率≥5%。