# BEGINNER_MODE_REFINEMENT_REPORT

## 概要

`BEGINNER_MODE_UX_REDESIGN_REPORT`（UX0）承認後の追加検討。AI判定 4 分類 · AI信頼度(%) · 「今日やること」カード · 5 秒理解テストを設計監査した。

| 項目 | 値 |
|------|-----|
| 監査日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 親レポート | `BEGINNER_MODE_UX_REDESIGN_REPORT.md`（UX0 承認済） |
| 監査ベースコミット | `85098af` |
| レポート提出コミット | *(作成・push 後に更新)* |
| スコープ | **設計 refinements のみ**（実装なし） |
| 後続 | **UX0.2** — `BEGINNER_MODE_HOME_SCREEN_REPORT.md`（ホーム · 説明文 · 理由必須） |

---

## 1. 変更サマリー（UX0 → UX0.1）

| # | UX0 案 | **UX0.1  refinements（本レポート）** |
|---|--------|--------------------------------------|
| AI判定 | 「買い」「様子見」等 | **4 分類:** 買い候補 · 監視 · 保有 · 見送り |
| おすすめ度 | ★★★★☆ | **AI信頼度 (%)** — 例: `63%` |
| 画面構成 | 銘柄カードのみ | 最上部に **「今日やること」** カード |
| 検証 | 成功基準のみ定義 | **5 秒理解テスト** プロトコル + デスクレビュー結果 |

---

## 2. AI判定 — 4 分類変更案

### 2.1 なぜ 4 分類か

| UX0 問題 | 4 分類での改善 |
|----------|----------------|
| 「買い」は執行を連想 | **買い候補** = 候補であり注文ではない |
| 「様子見」が保有中と未保有を区別しない | **保有** / **監視** で状態を分離 |
| 見送りが弱い | **見送り** を明示（新規も保有もしない） |

### 2.2 4 分類定義

| 分類 | 表示ラベル | 意味（初心者向け） | 色（案） |
|------|------------|-------------------|----------|
| `buy_candidate` | **買い候補** | まだ持っていないが、検討に値する | 緑 |
| `monitor` | **監視** | 注目は必要だが、今は動かない | 黄 |
| `hold` | **保有** | すでに持っている · 継続方針 | 青 |
| `pass` | **見送り** | 今回は新規も追加もしない | 灰 |

### 2.3 マッピングロジック（表示層 · 案）

**入力:** `portfolioHolding` · `fusedAction`（`buy|reduce|hold|watch`）· `buyAllowed` · `finalHybridScore` · `confidencePct`

```typescript
export type BeginnerAiJudgment = 'buy_candidate' | 'monitor' | 'hold' | 'pass';

export function mapToBeginnerAiJudgment(input: {
  isHeld: boolean;
  fusedAction: 'buy' | 'reduce' | 'hold' | 'watch';
  buyAllowed: boolean;
  finalScore: number; // 0–100 hybrid
}): BeginnerAiJudgment {
  const { isHeld, fusedAction, buyAllowed, finalScore } = input;

  // 見送り — 最優先ガード
  if (!buyAllowed && !isHeld) return 'pass';
  if (fusedAction === 'reduce' && !isHeld) return 'pass';
  if (finalScore <= 35 && !isHeld) return 'pass';

  // 保有中
  if (isHeld) {
    if (fusedAction === 'reduce' && finalScore <= 42) return 'monitor'; // 売却検討 → 監視強化
    return 'hold'; // 保有継続（Maybank 例）
  }

  // 未保有
  if (fusedAction === 'buy' && finalScore >= 58 && buyAllowed) return 'buy_candidate';
  if (fusedAction === 'watch' || (fusedAction === 'hold' && finalScore >= 45)) return 'monitor';
  if (fusedAction === 'reduce') return 'pass';

  return finalScore >= 52 ? 'monitor' : 'pass';
}
```

### 2.4 既存型との対応

| 既存 | 4 分類への接続 |
|------|----------------|
| `AiSecondEvaluatorAction` buy/reduce/hold/watch | `fusedAction` 入力 |
| `StrategyAction` + hybrid fusion | `strategyHybridEnhancement` 出力 |
| `beginnerDisplayMapper` 買う/保留/見送る | **非置換** — 配分 UI 用 · 材料分析は 4 分類を新設 |
| `mapVerdictToCardRecommendation` | 配分カードは従来維持 |

### 2.5 表示例（6 銘柄 · 想定）

| 銘柄 | 保有 | fused | 4 分類 | 一行説明 |
|------|------|-------|--------|----------|
| 1155 Maybank | ✅ | hold | **保有** | 保有継続 |
| 1023 CIMB | ❌ | watch | **監視** | 様子見 · 決算待ち |
| 1295 Public Bank | ✅ | hold | **保有** | 保有継続 |
| 5347 Tenaga | ❌ | hold | **監視** | 材料薄 · 注視 |
| 4707 Nestle | ❌ | pass/low | **見送り** | 今回は見送り |
| 6033 Petronas Gas | ❌ | buy | **買い候補** | 検討リスト（※実データ依存） |

---

## 3. おすすめ度 → AI信頼度 (%)

### 3.1 変更理由

| ★ 表示の問題 | AI信頼度 (%) の利点 |
|--------------|---------------------|
| 星の意味が主観的 | **数値 = 根拠の強さ** と説明しやすい |
| 5 段階では粒度不足 | 0–100 で Enhanced Analysis `confidencePct` と整合 |
| Play 免責と齟齬しやすい | 「信頼度 ≠ 利益保証」を Settings 注釈で明示 |

### 3.2 算出式（案）

**優先ソース（フォールバック順）:**

1. `ConciergeEnhancedAnalysisReport.confidencePct`（銘柄分析時）
2. `portfolioAiEvaluation` symbol `confidencePct`
3. Hybrid `fusedConfidencePct`（`buildHybridSymbolScore`）
4. `finalHybridScore` を proxy（データ欠落時 · ラベルに「推定」）

```typescript
export function resolveAiTrustPct(input: {
  enhancedConfidence?: number | null;
  hybridConfidence?: number | null;
  finalScore?: number | null;
  dataQualityStars?: number; // 1–5
}): { pct: number; labelJa: string; isEstimated: boolean } {
  let pct =
    input.enhancedConfidence ??
    input.hybridConfidence ??
    input.finalScore ??
    50;
  // データ品質で上限キャップ（任意）
  if (input.dataQualityStars != null && input.dataQualityStars <= 2) {
    pct = Math.min(pct, 55);
  }
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const isEstimated = input.enhancedConfidence == null && input.hybridConfidence == null;
  return {
    pct,
    labelJa: isEstimated ? `AI信頼度 ${pct}%（推定）` : `AI信頼度 ${pct}%`,
    isEstimated,
  };
}
```

### 3.3 UI 表示（案）

```
AI信頼度  63%
━━━━━━━━━━━━━━━━━━━━  63%
（参考値 · 利益を保証しません）
```

| 帯域 | 補助ラベル（任意 · 小さく） |
|------|----------------------------|
| 70–100% | 根拠は比較的そろっている |
| 45–69% | 一部データ不足あり |
| 0–44% | 判断材料が少ない |

**UX0 の ★ 表示は廃止**（上級者モードでも ★ は使わず、必要なら raw score を pro 表示）。

---

## 4. 「今日やること」カード

### 4.1 配置

**初心者モード · 材料分析タブ最上部**（ページタイトル直後 · 銘柄リストより前）。

Concierge ホーム / Home タブへの複製は **Phase UX2.1（任意）** — 初期は材料分析のみ。

### 4.2 ワイヤーフレーム

```
┌─ 今日やること ──────────────────────────┐
│ 2026-06-19 · あなたのポートフォリオ      │
├─────────────────────────────────────────┤
│ ● Maybank      保有継続                  │
│ ● Public Bank  保有継続                  │
│ ○ CIMB         監視                      │
│ ○ Tenaga       監視                      │
│ — 新規購入     なし                       │
├─────────────────────────────────────────┤
│ 急いで売買する必要はありません            │
└─────────────────────────────────────────┘
```

### 4.3 生成ロジック（案）

**新規サービス:** `src/services/beginnerTodayActionsBuilder.ts`

```typescript
export type TodayActionLine = {
  symbol: string;
  nameJa: string;
  judgment: BeginnerAiJudgment;
  lineJa: string; // "Maybank 保有継続"
};

export type BeginnerTodayActionsCard = {
  dateJa: string;
  lines: TodayActionLine[];
  newPurchaseAllowed: boolean; // 買い候補が1件以上
  summaryJa: string; // "新規購入なし"
  footerJa: string;
};

// アルゴリズム:
// 1. report.stocks × portfolio holdings → 各銘柄 mapToBeginnerAiJudgment
// 2. judgment === 'hold' → "{name} 保有継続"
// 3. judgment === 'monitor' → "{name} 監視"
// 4. judgment === 'buy_candidate' → "{name} 買い候補（検討）"
// 5. judgment === 'pass' → リスト省略 or 折りたたみ
// 6. buy_candidate 全体0 → summaryJa = "新規購入なし"
// 7. 最大表示 5 行 · 超過は "他 N 銘柄"
```

### 4.4 ユーザー例との対応

| ユーザー例 | 生成ルール |
|------------|------------|
| Maybank 保有継続 | `hold` + `isHeld` |
| CIMB 監視 | `monitor` |
| 新規購入なし | `buy_candidate` カウント = 0 |

---

## 5. 刷新後 — 銘柄カード（UX0.1）

```
┌─────────────────────────────────────────┐
│ 1155  Maybank                            │
│ AI判定: 保有          AI信頼度: 63%       │
├─────────────────────────────────────────┤
│ 理由                                     │
│  1. 配当が安定している                    │
│  2. 専門家評価は中立                      │
│  3. 景気は横ばい                          │
├─────────────────────────────────────────┤
│ リスク                                   │
│  1. 為替変動の影響                        │
│  2. ニュース材料が少ない                  │
│  3. データ更新が1日以上前                 │
├─────────────────────────────────────────┤
│ 次のアクション                            │
│  ▸ 保有継続 · 決算発表まで様子見          │
└─────────────────────────────────────────┘
```

**5 項目（確定）:** AI信頼度(%) · AI判定（4分類）· 理由3行 · リスク3行 · 次のアクション

---

## 6. 5 秒理解テスト

### 6.1 テストプロトコル

| 項目 | 内容 |
|------|------|
| 対象 | 投資経験 <1 年 · 日本語 UI · Bursa 銘柄名のみ事前共有 |
| タスク | モックを **5 秒間** 提示後、非表示にして 3 問に回答 |
| 質問 Q1 | 「今日、新しく株を買う必要がある？」（はい/いいえ/わからない） |
| 質問 Q2 | 「Maybank はどうすればいい？」（買う/持ち続ける/監視/わからない） |
| 質問 Q3 | 「一番信頼できる数字はどれ？」（AI信頼度%/AI判定/理由） |
| 合格 | 3 問中 **2 問以上正解** · 回答時間 **各 10 秒以内** |
| 実施 | 本監査 = **デスクレビュー（設計 mock）** · 実機は UX5 で再実施 |

### 6.2 比較条件

| 条件 | A: 現行 UI | B: UX0.1 モック |
|------|------------|-----------------|
| 画面 | `MaterialAnalysisScreen` 1155 カード（Phase 全文） | 今日やること + 簡略カード |
| 情報量 | ~18 Phase セクション | 5 項目 + 4 分類 |

### 6.3 デスクレビュー結果（2026-06-19 · 設計 mock）

**レビュアー:** 設計監査担当（初心者ペルソナシミュレーション）  
**想定正解:** Q1=いいえ · Q2=持ち続ける · Q3=AI信頼度%（補助判断）

| 条件 | Q1 | Q2 | Q3 | 正解数 | 5秒理解 |
|------|----|----|-----|--------|---------|
| **A 現行 UI** | わからない | わからない | わからない | **0/3** | **FAIL** |
| **B UX0.1** | いいえ | 持ち続ける | AI信頼度% | **3/3** | **PASS** |

**所見（A 現行）:** Phase24/23.1 英語見出し · API 接続 · Reddit diagnostics が視線を分散。5 秒では「買う/待つ/持つ」のいずれも選べない。

**所見（B UX0.1）:** 「今日やること」で Maybank=保有継続 · 新規購入なしが **一覧で把握可能**。銘柄カードの AI判定=保有 と一致。AI信頼度 63% が数値で単独表示され、Q3 も回答可能。

### 6.4 残リスク（実ユーザー検証前）

| リスク | 緩和 |
|--------|------|
| デスクのみで実ユーザー未検証 | UX5 で n≥3 実機テスト |
| 「買い候補」と注文の混同 | カード脚注 · 免責 · 「候補」強調 |
| 信頼度% の過信 | 「参考値」常時表示 · 70% 未満で控えめ色 |

### 6.5 UX5 再テストチェックリスト（実装後）

- [ ] 実機 v17+ · 初心者モード ON
- [ ] 6 銘柄ポートフォリオ設定
- [ ] 5 秒提示 → 3 問 · 参加者 3 名以上
- [ ] 合格率 ≥ 67%（2/3 問）
- [ ] 結果を `BEGINNER_MODE_5SEC_TEST_REPORT.md` に記録

---

## 7. 実装工数差分（UX0 → UX0.1）

| 項目 | UX0 見積 | UX0.1 追加分 |
|------|----------|--------------|
| summary builder | 2d | +0.5d（4 分類 + trustPct） |
| 銘柄カード | 2d | +0.25d（★ 削除 · % 表示） |
| 今日やること | — | **+1d**（builder + コンポーネント） |
| 5 秒テスト | 1d | 同左（プロトコル確定済） |
| **合計 UX1–UX5** | ~7d | **~8.75d（≈9 人日）** |

---

## 8. 定数追加（実装時）

| ファイル | 内容 |
|----------|------|
| `src/constants/beginnerAiJudgmentJa.ts` | 4 分類ラベル · 色 · footer 文言 |
| `src/services/beginnerTodayActionsBuilder.ts` | 今日やること |
| `src/services/beginnerMaterialSummaryBuilder.ts` | UX0 + trustPct + 4 分類 |

---

## 9. 結論

| 項目 | 判定 |
|------|------|
| AI判定 4 分類 | **採用推奨** — 保有/監視/候補/見送りで 5 秒理解に寄与 |
| AI信頼度 (%) | **採用推奨** — ★ より説明可能 · 既存 confidence と整合 |
| 今日やること | **採用推奨** — 画面最上部 · 一覧性最大 |
| 5 秒理解（mock） | **PASS**（現行 FAIL → UX0.1 PASS） |
| 実装 | Play IT 後 · UX0.1 仕様で UX1 着手 |

**UX0.1 refinements を UX0 にマージし、実装仕様の正とする。**

---

## 10. GitHub 同期結果

| 項目 | 値 |
|------|-----|
| 親レポート | `BEGINNER_MODE_UX_REDESIGN_REPORT.md` |
| 監査ベースコミット | `85098af` |
| レポート提出コミット | `0a16e70` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| Push | **SUCCESS** |
