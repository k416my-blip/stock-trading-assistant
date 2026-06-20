# AI Concierge UX Audit Report（UX2.0a 実機評価）

| 項目 | 内容 |
|------|------|
| 評価対象 | UX2.0a 実装（versionCode **21**） |
| 評価日 | 2026-06-20 |
| デバイス | `FYRWXSNNAIOR9DCM` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 方針 | **実装なし** · 実機スクリーンショットベースの UX 監査のみ |

---

## 1. 実機スクリーンショット（6画面）

| モード | 画面 | ファイル |
|--------|------|----------|
| Beginner | Home | `docs/review/ai-concierge-ux-audit/beginner-home.png` |
| Beginner | AI相談 | `docs/review/ai-concierge-ux-audit/beginner-concierge.png` |
| Standard | Home | `docs/review/ai-concierge-ux-audit/standard-home.png` |
| Standard | AI相談 | `docs/review/ai-concierge-ux-audit/standard-concierge.png` |
| Pro | Home | `docs/review/ai-concierge-ux-audit/pro-home.png` |
| Pro | AI相談 | `docs/review/ai-concierge-ux-audit/pro-concierge.png` |

設定監査用（参考）:

| 画面 | ファイル |
|------|----------|
| 設定（上部 · 表示モード） | `docs/review/ai-concierge-ux-audit/beginner-settings-top.png` |
| 設定（スクロール · API） | `docs/review/ai-concierge-ux-audit/beginner-settings-scroll.png` |

メタ: `docs/review/ai-concierge-ux-audit/capture-meta.json`

> Beginner Home / AI相談は **4タブ表示を確認済み** の v21 キャプチャ（UX2.0a 提出分）を監査フォルダに同期して使用。

---

## 2. 画面監査

### 2.1 Beginner — Home

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | 「今日のポートフォリオ」見出し → 「今日のAIアドバイス」カード（取得中スピナー） |
| **AIコンシェルジュ導線** | 画面中央の **青 Primary「AIに相談する」** が最も目立つ。下段タブ「AI相談」も常時表示（4タブ） |
| **不要な情報** | Ghost「おすすめ配分を見る」— ホーム主導線（AI→保有→銘柄チェック）と競合 |
| **情報量過多** | **低**。4タブ・CTA 2段で最も整理されている |

### 2.2 Beginner — AI相談

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | タイトル「AI相談」→ 入力コンポーザ → **[緊急] NVDA** オーバーレイ（Urgency） |
| **AIコンシェルジュ導線** | コンポーザ + スクロール先頭の「今日のAI提案」で AI 中心は明確 |
| **不要な情報** | [緊急] トーストが入力欄と競合 · 未読300件は心理的負荷が高い（要約3件のみ表示は妥当だが件数表示が強い） |
| **情報量過多** | **中〜高**。コンパクト提案3件 + ダイジェスト + 下方向に「今日の提案」（TradeQueue 全文）はスクロール後も長い |

### 2.3 Standard — Home

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | 「資産運用コンシェルジュ」+ 専属MD コピー → 「今日のAIアドバイス」 |
| **AIコンシェルジュ導線** | **青「AIに相談する」** は 3 秒以内に認識可能。FAB「AI(9)」が右下で二重導線 |
| **不要な情報** | 専属MD カードが AI アドバイスと **同趣旨で重複** · 8タブバー（ラベル省略） |
| **情報量過多** | **高**。Trust ホーム + 8タブ + FAB + スクロール下の従来カード群（Bursa / Proactive 等） |

### 2.4 Standard — AI相談

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | Beginner 同様：コンポーザ → 今日のAI提案 |
| **AIコンシェルジュ導線** | 統合ブロックは AI 相談タブ先頭に集約済み |
| **不要な情報** | 「すべての通知を見る」— 統合方針上は許容だが、ダイジェストと **二重入口** |
| **情報量過多** | **高**。8タブ + 緊急オーバーレイ + 300未読 + TradeQueue 全文セクション |

### 2.5 Pro — Home

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | Standard と同型（Trust ホーム + AIアドバイス） |
| **AIコンシェルジュ導線** | Primary CTA は認識可能。FAB・8+タブが分散 |
| **不要な情報** | Trust MD ブロック · タブ過多（設計上12タブ、実機8表示+省略） |
| **情報量過多** | **最高**。Pro 全機能前提の情報密度 |

### 2.6 Pro — AI相談

| 観点 | 評価 |
|------|------|
| **最初に目に入る情報** | Standard 同様の統合ヘッダ |
| **AIコンシェルジュ導線** | UX2.0a 統合は機能している。下方向に Pro 向け Action Center 群が続く（スクロール後） |
| **不要な情報** | 通知タブ + ダイジェスト + 通知リンクの **三重構造** |
| **情報量過多** | **最高** |

---

## 3. AIコンシェルジュ主役度評価

| 基準 | 判定 | 根拠 |
|------|------|------|
| Home 3秒以内に「AIに相談する」認識 | **PASS（全モード）** | 青 Primary ボタンがアドバイスカード直下に配置。Beginner は特に明瞭 |
| AI相談で「今日のAI提案」最上位 | **PASS（条件付き）** | 入力コンポーザ直下のスクロール **最上段** に表示。コンポーザより上ではない |
| TradeQueue · 通知 · 提案の統合 | **部分 PASS** | コンパクト「今日のAI提案」+「通知ダイジェスト」は統合済。**全文 TradeQueue（今日の提案）** はその下段 — 統合はされたが **情報二層化**（要約 + 詳細） |

### 主役度スコア（5段階 · 監査者判断）

| モード | Home | AI相談 | 総合 |
|--------|------|--------|------|
| Beginner | 4/5 | 4/5 | **4.0** |
| Standard | 3/5 | 3.5/5 | **3.3** |
| Pro | 2.5/5 | 3/5 | **2.8** |

**所見:** UX2.0a は「AI相談タブへの集約」は達成。一方 **Standard / Pro の Home は Trust + 多タブ + FAB により主役度が dilute** されている。

---

## 4. 削除候補抽出

凡例: **維持** / **AI相談へ統合** / **Beginner非表示** / **Standard非表示** / **削除候補**

| 対象 | Beginner | Standard | Pro | 推奨判定 |
|------|----------|----------|-----|----------|
| **おすすめ配分** | AI相談へ統合 | 維持（タブ） | 維持 | Beginner: Home Ghost **非表示** · 深い導線は設定/AI相談から |
| **市場監視** | （タブなし） | （タブなし） | 維持 | Standard **非表示維持** · Pro **維持** |
| **TradeQueue** | AI相談へ統合済 | 同上 | 同上 | **維持**（AI相談内）· Home 常設削除は正しい · 全文セクションは **折りたたみ統合候補** |
| **通知** | AI相談 digest のみ | digest + タブ | digest + タブ + リンク | Beginner: **AI統合維持**（タブ非表示）· Standard: タブは **二次** · Pro: **維持** |
| **設定（項目群）** | 下記 §5 参照 | 一般+AI一部 | 全項目 | Beginner: **大幅非表示** · Standard: 開発/検証系 **非表示** |

---

## 5. 設定画面監査（初心者に不要な項目）

実機 + `SettingsScreen.tsx` 照合。

### 5.1 分類マトリクス

| 分類 | 項目 | Beginner | Standard | Pro |
|------|------|----------|----------|-----|
| **一般設定** | 表示モード | 維持 | 維持 | 維持 |
| | 通知設定 | 維持（簡略） | 維持 | 維持 |
| | 市場設定 / 通貨設定 | 維持 | 維持 | 維持 |
| | 練習モード設定 | 維持 | 維持 | 維持 |
| | 更新頻度設定 | 維持 | 維持 | 維持 |
| | セキュリティ | 維持 | 維持 | 維持 |
| **AI設定** | AI戦略アシスタント設定 | Beginner非表示 | 維持 | 維持 |
| | OpenAI / APIキー（インライン） | Beginner非表示 | 簡略リンクのみ | 維持 |
| | API設定ウィザード / 接続診断 | Beginner非表示 | 維持 | 維持 |
| | X API 利用量 | Beginner非表示 | Standard非表示 | 維持 |
| **通知** | 通知設定（メニュー行） | 維持 | 維持 | 維持 |
| **詳細設定** | 実運用テスト / 実機監査（6銘柄） | Beginner非表示 | Standard非表示 | 維持 |
| | 起動診断 / Production Dashboard | Beginner非表示 | Standard非表示 | 維持 |
| | 前向き検証 / 歴史シミュ / クオンツ検証 | Beginner非表示 | Standard非表示 | 維持 |
| | 機関PF最適化 / ベイズ配分 / メタ資本 | Beginner非表示 | Standard非表示 | 維持 |
| | 行動リスク / モデル安定性 | Beginner非表示 | Standard非表示 | 維持 |
| | すべてリセット / APIキー全削除 | 維持（警告付き） | 維持 | 維持 |

### 5.2 初心者に特に不要（優先非表示）

1. **APIキー管理インライン UI**（OpenAI / Twelve / News / X テスト）— 実機で設定上部直下に露出
2. **実運用テスト · 実機監査** — 開発者向け
3. **Phase13–24 系検証メニュー**（10項目以上）— Pro 専用に隔離すべき
4. **News/X API テスト結果の長文ログ** — 情報量過多

---

## 6. 統合候補一覧

| 現在地 | 統合先 | 優先度 | 内容 |
|--------|--------|--------|------|
| Home Ghost「おすすめ配分」 | AI相談クイックアクション | 高 | Beginner ホームから除去 |
| Home `BursaConciergeHomeCard` | AI相談ダイジェスト | 中 | Standard/Pro Home の通知プレビュー重複 |
| Home `ProactiveSuggestionsHomeCard` | 今日のAI提案 | 中 | 提案の二重表示削減 |
| Home FAB「AI(9)」 | タブ「AI相談」 | 高 | Standard/Pro で導線三重化 |
| AI相談「今日の提案」全文 | 「今日のAI提案」折りたたみ | 高 | 要約3件 + 詳細展開 |
| 通知タブ（Standard） | AI相談ダイジェスト | 中 | UX2.0 設計6タブ化とセット |
| 設定 API インライン | 「API設定」サブ画面のみ | 高 | Beginner 設定簡素化 |

---

## 7. 次の UX 改善優先順位

| 順位 | 項目 | 理由 | 想定フェーズ |
|------|------|------|--------------|
| **1** | Standard タブ 8→6 整理 | 実機でラベル truncation · AI 主役 dilute | UX2.0b |
| **2** | Beginner 設定の段階的開示 | API/検証メニューが初心者設定に露出 | UX2.0c |
| **3** | TradeQueue 二層 → 単層（折りたたみ） | AI相談スクロール過多 | UX2.0a 改善 |
| **4** | Trust Home と AI 主導線の優先順位整理 | 専属MD コピーが AI CTA と競合 | UX2.0b |
| **5** | FAB AI バッジの整理 | タブ + FAB + ダイジェストの三重化 | UX2.0b |
| **6** | [緊急] オーバーレイ位置調整 | 入力コンポーザを覆う | UX2.0a 改善 |

---

## 8. 総合結論

UX2.0a は **AI相談タブへの TradeQueue / 通知 / 提案統合** と **Home Primary CTA** を実機で確認でき、**Beginner モードで最も AI 中心化が機能** している。

未達・改善余地:

- Standard / Pro は **多タブ + Trust ホーム + FAB** により設計意図より AI 主役度が低い
- AI相談内は **要約と全文 TradeQueue の二層** で情報量過多
- 設定画面は **Beginner でも開発者向け項目が露出**

**次ステップ:** 実装ではなく **UX2.0b（タブ整理 + Home 簡素化）** の設計承認後に着手を推奨。

---

## 9. Git

| 項目 | 値 |
|------|-----|
| 監査レポートコミット | `5ca6a22` |
| push 先 | `origin/cursor/top3-maxdd-capital-audit` |
| push 結果 | **成功** — `07b28d9..5ca6a22` |
