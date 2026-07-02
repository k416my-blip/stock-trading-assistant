# Home「入金を記録する」ボタン追加レポート

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`

---

## 概要

ホーム画面に **「入金を記録する」** ボタンを追加し、タップで **Rakuten取引記録**（`RakutenImportManualEntry`）画面へ遷移、**入金タブを初期選択**するようにしました。

---

## 変更内容

| ファイル | 変更 |
|----------|------|
| `src/screens/HomeScreen.tsx` | `openDepositRecord` ハンドラ追加。Trust / Beginner / Pro 各モードで AI アドバイス直下にボタン配置 |
| `src/navigation/types.ts` | `RakutenImportManualEntry` に `kind?: 'deposit' \| 'buy' \| 'sell'` を追加 |
| `src/screens/RakutenImportManualEntryScreen.tsx` | `params.kind` で初期タブを設定（未指定時は従来通り `deposit`） |
| `src/i18n/resources/ja/home.json` | `cta.recordDeposit`: **入金を記録する** |
| `src/i18n/resources/en/home.json` | `cta.recordDeposit`: Record deposit |
| `src/i18n/resources/zh-Hans/home.json` | `cta.recordDeposit`: 记录入金 |
| `tests/unit/i18n/homeTodayAiAdvice.test.ts` | `recordDeposit` i18n キー検証追加 |

---

## 配置位置

- **Trust モード:** 「AIに相談する」の直下（ghost ボタン）
- **Beginner モード:** 保有確認 CTA 行の下（primary ボタン）
- **Standard / Pro モード:** 「AIに相談する」の直下（primary ボタン）

既存の買付・売却（`AddTrade`）、保有（Portfolio タブ）、AI アドバイス（`BeginnerTodayAdviceCard`）のコードパスは変更していません。

---

## 遷移仕様

```tsx
stackNav.navigate('RakutenImportManualEntry', { kind: 'deposit' });
```

- 遷移先: Root stack `RakutenImportManualEntry`（画面タイトル: Rakuten取引記録）
- 初期タブ: `deposit`（入金）が `kindChipActive` で選択された状態

---

## 動作確認

### 静的確認（コードレビュー）

| 項目 | 結果 |
|------|------|
| ボタン文言（ja） | `入金を記録する` ✅ |
| 遷移先 route | `RakutenImportManualEntry` ✅ |
| 入金タブ初期選択 | `{ kind: 'deposit' }` → `useState(params?.kind ?? 'deposit')` ✅ |
| 既存 AddTrade / Portfolio / AI advice | 未変更 ✅ |

### 自動テスト

```text
npx vitest run tests/unit/i18n/homeTodayAiAdvice.test.ts
→ 7/7 PASS（recordDeposit i18n 含む）

npx vitest run tests/unit/i18n/m1VisibleJaLeakScan.test.ts
→ 11/11 PASS
```

### Expo / 実機

本セッションでは Expo 開発サーバー起動・実機 adb 操作は未実施。Internal Testing ビルドまたは `npx expo start` インストール後、以下を確認してください:

1. ホーム → **入金を記録する** 表示
2. タップ → **Rakuten取引記録** 画面
3. **入金** タブが選択済み
4. 戻る → ホームの AI アドバイス・買付記録等が従来通り動作

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | `1e9be7a` — Add Home record-deposit button linking to Rakuten import with deposit tab selected. |
| Push | ✅ `origin/cursor/top3-maxdd-capital-audit` へ push 済み (`287f134..1e9be7a`) |

---

## 受け入れ基準

- [x] ホームに「入金を記録する」ボタン
- [x] Rakuten取引記録画面へ遷移
- [x] 入金タブ初期選択
- [x] 既存機能への影響なし（差分限定）
- [x] i18n テスト追加
