# Play Store アプリ名 — 商標・ブランドリスク監査レポート

**調査日:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**調査前 HEAD:** `c49e2941ff41719fb38f14e8b5cc923ab76a7a60`  
**実施範囲:** 候補名 4 案の評価 · 本レポート作成のみ（**新機能コード変更なし**）

---

## エグゼクティブサマリー

| 項目 | 結論 |
|------|------|
| **推奨アプリ名** | **Malaysia Stock AI Assistant** |
| **現行名（`app.json`）** | `Rakuten Trade MY 助手` — Play 掲載名として **変更必須** |
| **最優先リスク** | 第三者商標（Rakuten Trade · Bursa Malaysia）による **Impersonation / 誤認** |
| **機能整合性** | アプリは **分析・意思決定支援専用**（注文執行なし · `REAL_TRADING_ENABLED = false`） |

---

## 1. 調査背景 · 参照ソース

### 1.1 リポジトリ上の命名コンテキスト

| 項目 | 値 | 出典 |
|------|-----|------|
| Expo 表示名 | `Rakuten Trade MY 助手` | `app.json` |
| npm / slug | `stock-trading-assistant` | `package.json` · `app.json` |
| Android package | `com.assistant.stocktrading` | `app.json` |
| 位置づけ | AI投資オペレーティングシステム — **分析支援のみ** | `platformClarification.ts` |
| 注文執行 | 証券会社アプリ側 · 本アプリから送信しない | `disclaimers.ts` · `platformClarification.ts` |
| 主市場 | Bursa Malaysia 中心 · US/HK 副対応 | `GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` |
| Rakuten 表記 | **非公式 · 非提携** — ストア文面で明確化必須 | 同上 · P0 レポート §7 |
| Play IT ブロッカー | ストア正式アプリ名未確定（Rakuten 表記リスク） | `PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` §3 #6 |

### 1.2 評価対象候補（ユーザー提示 4 案）

| # | 候補名 | 文字数 | 30 字制限 |
|---|--------|--------|-----------|
| 1 | Rakuten Trade MY AI Assistant | 28 | ✓ |
| 2 | Malaysia Stock AI Assistant | 27 | ✓ |
| 3 | Bursa AI Concierge | 18 | ✓ |
| 4 | Stock Trading Assistant MY | 26 | ✓ |

> Google Play **Metadata** ポリシー: アプリタイトルは **30 文字以内**（[Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842)）。

### 1.3 参照した Google Play ポリシー領域

| ポリシー | URL | 本監査での relevance |
|----------|-----|---------------------|
| **Impersonation** | [9888374](https://support.google.com/googleplay/android-developer/answer/9888374) | 第三者ブランド名による **提携・公式関係の誤暗示** |
| **Deceptive Behavior** | [9888077](https://support.google.com/googleplay/android-developer/answer/9888077) | タイトルが **実機能と一致しない** 場合の拒否 |
| **Metadata** | [9898842](https://support.google.com/googleplay/android-developer/answer/9898842) | 30 字制限 · 誤解を招くキーワード · 正確な機能記述 |
| **Store listing best practices** | [13393723](https://support.google.com/googleplay/android-developer/answer/13393723) | 他エンティティ名の誤用禁止 · 「Official」無権使用禁止 |

---

## 2. 候補別評価（4 基準）

### 2.1 Rakuten Trade MY AI Assistant

| 基準 | 評価 | 詳細 |
|------|------|------|
| **Play ポリシー** | 🔴 **高リスク** | **Impersonation**: 「Rakuten Trade」をタイトル先頭に置くと、既存ブローカー公式アプリとの **関係 · 後援 · 認可** を暗示しうる（[9888374](https://support.google.com/googleplay/android-developer/answer/9888374) — *"Don't imply that your app is related to or authorized by someone that it isn't"*）。**Deceptive Behavior**: *"Don't falsely claim affiliation with … an established entity"*（[9888077](https://support.google.com/googleplay/android-developer/answer/9888077)）。 |
| **商標 · 誤認** | 🔴 **高リスク** | Rakuten Group / Rakuten Trade Malaysia は登録商標圏。**非提携**であることが repo 内でも明記（`GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` §1 · `disclaimers.ts`）。タイトルに商標を含めると、説明文の免責だけでは **ストア一覧段階で誤認** が起きる。権利者からの **商標クレーム · アプリ停止** リスクが最も高い。 |
| **ASO（発見性）** | 🟡 中 | 「Rakuten Trade」検索流入は見込めるが、**公式アプリ探索ユーザー** を誘引し、低評価 · アンインストール · ポリシー通報につながりうる。 |
| **マルチブローカー** | 🔴 低 | 単一ブローカー名を冠するため、将来 M+ / IBKR / 他社証券ユーザーへの拡張時に **ブランド再設計が必須**。Rakuten Import 機能は **便利機能の一つ** であり排他関係ではない。 |

**判定:** **非推奨** — Play Internal Testing 前に **採用しないこと**。

---

### 2.2 Malaysia Stock AI Assistant

| 基準 | 評価 | 詳細 |
|------|------|------|
| **Play ポリシー** | 🟢 **低リスク** | 第三者商標を含まない。**Impersonation** · **Deceptive Behavior** 抵触の主要因子がない。「AI Assistant」は分析支援ツールとして **機能と整合**（注文執行を暗示しない）。 |
| **商標 · 誤認** | 🟢 **低リスク** | 汎用語の組み合わせ。Rakuten · Bursa Malaysia との **公式関係を示唆しない**。 |
| **ASO（発見性）** | 🟢 **高** | キーワード `Malaysia` · `Stock` · `AI` · `Assistant` は Finance カテゴリで検索意図と一致。英語 UI 未整備でも Play グローバル掲載に適合（`GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` §1.3）。地域 suffix `MY` 相当の **Malaysia** が市場を明示。 |
| **マルチブローカー** | 🟢 **高** | ブローカー名非依存。Rakuten Import · 手入力 · 将来他社インポートとも両立。US/HK 副対応も名称上矛盾しない。 |

**判定:** **推奨（第 1 位）**。

**補足:** 短い説明 · 長い説明で「分析支援 · 非公式 · 注文は証券会社で」を必ず記載（P0 レポート §7.2–7.3 のドラフトを転用可）。

---

### 2.3 Bursa AI Concierge

| 基準 | 評価 | 詳細 |
|------|------|------|
| **Play ポリシー** | 🟠 **中〜高リスク** | **Impersonation**: 「Bursa」は Bursa Malaysia Berhad の **登録商標**（[Terms & Conditions](https://www.bursamalaysia.com/term_conditions_of_use_disclaimer_and_linking_policy) — *"'Bursa Malaysia Berhad' name and the Bursa Malaysia logo … are trademarks"*）。公式アプリ **Bursa Anywhere**（`com.bursamalaysia.eCDS`）が Play に存在し、**取引所公式ツールとの混同** リスク。**Best practices** — *"Don't use another app or entity's title or name in a manner that may mislead users"*（[13393723](https://support.google.com/googleplay/android-developer/answer/13393723)）。 |
| **商標 · 誤認** | 🟠 **中〜高リスク** | Bursa Malaysia 利用規約: 商標を *(iii) confusing, misleading or deceptive* な方法で使用禁止（[BRC Terms of Use](https://brc.bursamalaysia.com/assets/documents/terms-of-use-20251224.pdf)）。本アプリは **非公式データ源**（KLSE Screener HTML 等）を使用 — 取引所 **ISV 認定外**。タイトルに「Bursa」を冠すると **後援 · データ正規性** を過剰に示唆しうる。 |
| **ASO（発見性）** | 🟢 中〜高 | マレーシア株投資家向け検索には強い。ただし **市場が Bursa に限定** された印象となり、US/HK 対応との齟齬が生じうる。 |
| **マルチブローカー** | 🟡 中 | 市場名はブローカー非依存だが、**取引所ブランドに結びつく** ため、地理 · 規制文脈での再位置づけが将来必要になる可能性。 |

**判定:** **条件付き非推奨** — 商標許諾なしでは Play 掲載名としてリスクが高い。説明文の「Bursa 分析」程度の **叙述的使用** は別途検討可（タイトルには載せない）。

---

### 2.4 Stock Trading Assistant MY

| 基準 | 評価 | 詳細 |
|------|------|------|
| **Play ポリシー** | 🟠 **中リスク** | **Deceptive Behavior** · **Metadata**: *"Make sure that your app's title and description accurately describe your app's functionality"*（[9898842](https://support.google.com/googleplay/android-developer/answer/9898842)）。**Trading** は一般ユーザーに **売買執行 · 発注** を連想させ、本アプリの **分析のみ · 注文送信なし** 設計（`ORDER_EXECUTION_NOTICE_JA` · `REAL_TRADING_ENABLED = false`）と **乖離**。審査拒否 · ユーザー苦情のリスク。 |
| **商標 · 誤認** | 🟢 **低リスク** | 第三者商標なし。repo slug `stock-trading-assistant` との **命名一貫性** はある。 |
| **ASO（発見性）** | 🟢 **高** | 「Stock Trading」は検索ボリューム大。ただし **意図不一致トラフィック**（執行期待ユーザー）が増える。 |
| **マルチブローカー** | 🟢 **高** | ブローカー非依存 · 将来拡張に適合。 |

**判定:** **第 2 位（代替案）** — 採用する場合は短い説明で **「分析支援 · 注文執行なし」** を最優先表示。より正確な **`Stock Analysis Assistant MY`**（内部ドラフト案 · P0 §7.1）の方がポリシー整合性は高い。

---

## 3. Play Store リスク総合表

| 候補名 | Play ポリシー | 商標 · 誤認 | ASO | マルチブローカー | 総合 |
|--------|--------------|-------------|-----|------------------|------|
| Rakuten Trade MY AI Assistant | 🔴 高 | 🔴 高 | 🟡 中 | 🔴 低 | 🔴 **非推奨** |
| **Malaysia Stock AI Assistant** | 🟢 低 | 🟢 低 | 🟢 高 | 🟢 高 | 🟢 **推奨** |
| Bursa AI Concierge | 🟠 中〜高 | 🟠 中〜高 | 🟢 中〜高 | 🟡 中 | 🟠 **非推奨** |
| Stock Trading Assistant MY | 🟠 中 | 🟢 低 | 🟢 高 | 🟢 高 | 🟡 **代替可** |

### 3.1 想定される Play 審査 · 運用シナリオ

| シナリオ | Rakuten 案 | Malaysia 案 | Bursa 案 | Trading 案 |
|----------|-----------|-------------|----------|------------|
| Impersonation 指摘 | **高確率** | 低 | **中〜高** | 低 |
| 商標権者クレーム | **高** | 低 | **中〜高** | 低 |
| 機能誤認（執行期待） | 中 | 低 | 低 | **中〜高** |
| Internal Testing 通過 | ⚠️ 不安定 | ✅ 見込み良好 | ⚠️ 要説明強化 | ⚠️ 説明で補完要 |

---

## 4. 推奨 · 非推奨の理由（要約）

### 4.1 推奨: **Malaysia Stock AI Assistant**

1. **Google Play 4 ポリシー領域すべてでリスク最小** — 第三者商標なし · 執行を暗示しない · 30 字以内。
2. **アプリの実態と一致** — AI 分析 · コンシェルジュ · ポートフォリオ追跡（`platformClarification.ts`）。
3. **マレーシア株中心 · 多ブローカー将来** — Rakuten 依存表記をタイトルから排除。
4. **既存内部ドラフトとの整合** — `Stock Analysis Assistant MY` と同系統で、Owner が英語名を選ぶ場合の **最も安全な選択肢**。

### 4.2 非推奨の理由

| 候補 | 主理由 |
|------|--------|
| **Rakuten Trade MY AI Assistant** | 非提携なのにブローカー商標をタイトルに使用 → **Impersonation · 商標** の二重リスク。現行 `app.json` 名と同根の問題。 |
| **Bursa AI Concierge** | Bursa Malaysia 登録商標 · 公式 **Bursa Anywhere** との混同。ISV 非認定 · 非公式データ源との **後援誤認**。 |
| **Stock Trading Assistant MY** | 「Trading」が **注文執行機能** を示唆し、分析専用設計と **Metadata 正確性** 要件に抵触しうる。 |

---

## 5. 最終 Top 3 ランキング

| 順位 | アプリ名 | スコア概要 | 備考 |
|------|----------|-----------|------|
| **🥇 1** | **Malaysia Stock AI Assistant** | ポリシー · 商標 · ASO · 拡張性の **総合最良** | **Play 掲載名として採用推奨** |
| **🥈 2** | Stock Trading Assistant MY | ASO · 拡張性は良好 · **Trading 表現が弱点** | slug 一致 · 説明で分析専用を強調すれば次点 |
| **🥉 3** | Bursa AI Concierge | 市場 ASO は良い · **商標 · 公式混同が致命傷** | タイトル不可 · 説明文キーワード程度に留める |
| — | Rakuten Trade MY AI Assistant | **全基準で不合格** | ランク外 · **使用禁止** |

---

## 6. 採用後のアクション（実装スコープ外 · 参考）

| # | アクション | 担当 |
|---|-----------|------|
| 1 | Play Console **Store listing → App name** を `Malaysia Stock AI Assistant` に設定 | Owner |
| 2 | `app.json` の `expo.name` を同期（別コミット · ユーザー指示時） | Dev |
| 3 | 短い説明 · 長い説明に **非提携 · 分析のみ · 注文は証券会社** を記載 | Owner |
| 4 | Feature Graphic 文案から Rakuten / Bursa 冠称を外す（P0 §7.5 参照） | Dev + Owner |
| 5 | アプリ内 Rakuten 言及（免責 · Import 説明）は **本文で許容** — タイトルとは分離 | 現状維持可 |

---

## 7. git 操作記録

| 操作 | 状態 |
|------|------|
| 新規ファイル | `docs/review/APP_NAMING_REVIEW_REPORT.md` |
| 実装 · 修正 | **未実施**（本レポートのみ） |
| `git add` | `docs/review/APP_NAMING_REVIEW_REPORT.md` |
| `git commit` | `Add Play Store app naming trademark risk audit report.` |
| **コミットハッシュ** | `e4d3d805241927e9d051b5b520a415b363e35e46` |
| `git push origin cursor/top3-maxdd-capital-audit` | **成功** — `c49e294..e4d3d80` → `origin/cursor/top3-maxdd-capital-audit` |

---

## 8. 参照ファイル · 外部リンク

| 種別 | 参照 |
|------|------|
| Repo | `app.json` · `src/constants/platformClarification.ts` · `src/constants/disclaimers.ts` |
| Repo docs | `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` · `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` |
| Google Play | [Impersonation](https://support.google.com/googleplay/android-developer/answer/9888374) · [Deceptive Behavior](https://support.google.com/googleplay/android-developer/answer/9888077) · [Metadata](https://support.google.com/googleplay/android-developer/answer/9898842) · [Best practices](https://support.google.com/googleplay/android-developer/answer/13393723) |
| Bursa Malaysia | [Terms & Conditions](https://www.bursamalaysia.com/term_conditions_of_use_disclaimer_and_linking_policy) · [BRC Terms of Use (PDF)](https://brc.bursamalaysia.com/assets/documents/terms-of-use-20251224.pdf) |
