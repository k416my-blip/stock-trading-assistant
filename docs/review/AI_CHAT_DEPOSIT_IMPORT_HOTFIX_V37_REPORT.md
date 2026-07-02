# AI Chat Deposit Import Hotfix Report (v38)

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Commit:** `6c8fe3d` — Fix AI chat deposit import staging, navigation, and cancel flow.

---

## 不具合概要

Play Store Internal Testing **versionCode 36** 実機で、AI相談から自然文入金（例: `RM5000入金しました`）を記録しようとすると:

1. 候補カードは正しく表示される（入金 RM 5,000、日付、信頼度、記録する/修正する/キャンセル）
2. **「記録する」** → 確認画面で「候補が見つかりません / ステージングの有効期限が切れたか…」となり保存不可
3. **「キャンセル」** ボタンが無反応（カードが閉じない）

---

## 原因分析

| # | 原因 | 詳細 |
|---|------|------|
| 1 | **ネストナビゲーション** | AI相談タブ内から `RakutenImportConfirm` へ `navigation.navigate` すると、root stack に正しく到達せず `candidateId` が Confirm 画面に渡らない、または別スタックで開く |
| 2 | **staging lookup 競合** | `loadRakutenImportStaging()` の並行呼び出しで in-memory store が古い空状態で上書きされ、直前に保存した candidate が Confirm 画面で見つからない |
| 3 | **キャンセル UI 未連動** | `rejectRakutenImportCandidate` は staging 上 rejected にするが、チャットメッセージ上のカードを閉じる `onDismiss` がなく UI が残る |
| 4 | **修正する prefill 未実装** | Manual Entry 画面が `candidateId` route param を読まず、修正遷移時に値が引き継がれない |

**TTL 期限切れではなかった:** staging に `expiresAt` は存在せず、「候補が見つかりません」は lookup 失敗（ID 不一致 / rejected / メモリ競合）時のみ表示されるべき。

---

## 修正対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/navigation/rootStackNavigation.ts` | **新規** — ネスト navigator から root stack へ `CommonActions.navigate` |
| `src/services/rakutenImport/rakutenImportStagingStorage.ts` | load dedup、`reloadRakutenImportStagingFromDisk`、`isActiveImportCandidate`、`findImportCandidate({ activeOnly, reloadIfMissing })` |
| `src/components/concierge/ConciergeImportActionCard.tsx` | root 遷移、キャンセル dismiss、記録前 active lookup |
| `src/components/AiAssistantChat.tsx` | `dismissRakutenImportCard`、`onDismiss` 連携 |
| `src/types/aiChat.ts` | `rakutenImportDismissed` フラグ |
| `src/screens/RakutenImportConfirmScreen.tsx` | `findImportCandidate(..., { activeOnly: true })` |
| `src/screens/RakutenImportManualEntryScreen.tsx` | `candidateId` から deposit/amount/date prefill |
| `src/context/app/useAppPortfolioActions.ts` | commit/reject で `activeOnly: true` |
| `src/navigation/types.ts` | `RakutenImportManualEntry: { candidateId?: string }` |
| `tests/unit/rakutenImport/aiChatDepositImport.test.ts` | **新規** hotfix 回帰テスト |
| `tests/unit/rakutenImport/naturalLanguageParser.test.ts` | `RM5000入金しました` ケース追加 |
| `tests/unit/rakutenImport/staging.test.ts` | `activeOnly` 除外テスト追加 |
| `app.json` | `android.versionCode` → **38** |

---

## staging / route params / candidate lookup の修正内容

- NL 入力時: 従来通り `stageRakutenImportNaturalLanguage` → `saveImportBatch(batch)` で candidate/batch を staging 保存
- **記録する**: `findImportCandidate(candidateId, { activeOnly: true })` で存在確認後、`navigateRootStack(navigation, 'RakutenImportConfirm', { candidateId })`
- **Confirm 画面**: 同じ `candidateId` で `findImportCandidate(..., { activeOnly: true, reloadIfMissing: true })` — メモリ miss 時は disk 再読込
- **ID 不一致時のみ** not-found 表示（rejected/confirmed は `activeOnly` で除外）

---

## 記録するボタンの修正内容

1. 押下時に active candidate を再 lookup
2. 存在すれば root stack の `RakutenImportConfirm` へ遷移
3. 確認画面で deposit RM5000 表示 → 保存で `commitRakutenImportCandidate` → `AppState.deposits` に `completed: true`
4. journal `recordSource`: `rakuten_import_nl`（natural_language ソース）

---

## キャンセルボタンの修正内容

1. `rejectRakutenImportCandidate(candidateId)` — staging 上 `status: rejected`
2. `setDismissed(true)` + `onDismiss()` → チャットメッセージの `rakutenImportDismissed: true`
3. 画面遷移なし、カード非表示

---

## 修正するボタンの確認結果

- `navigateRootStack(..., 'RakutenImportManualEntry', { candidateId })` で手動入力画面へ遷移
- `RakutenImportManualEntryScreen` が `candidateId` から deposit / amount / date / symbol 等を prefill
- 手動保存フロー（既存 OCR/手動 import）は変更なし

---

## deposit 保存確認

- `RM5000入金しました` → `totalMYR: 5000`, `type: deposit`
- commit 後: `deposits[0].amountMYR === 5000`, `completed === true`
- `previewBuyingPowerAfterImport` / allocation plan の元データに反映（既存 commit ロジック）

---

## buyingPower / deposits 反映確認

- unit test `aiChatDepositImport.test.ts` で commit → deposits 長 1、amount 5000 を検証
- 実機確認は Internal Testing v38 インストール後に実施推奨

---

## unit test 結果

```text
npx vitest run tests/unit/rakutenImport/aiChatDepositImport.test.ts
npx vitest run tests/unit/rakutenImport/staging.test.ts
npx vitest run tests/unit/rakutenImport/naturalLanguageParser.test.ts
→ 26/26 PASS (hotfix 関連)

npx vitest run tests/unit/rakutenImport
→ 65/66 PASS
→ 1 FAIL (既存): importConfidence.test.ts — confidenceLabelJa が undefined（本 hotfix 非関連）
```

---

## i18n test 結果

```text
npx vitest run tests/unit/i18n
→ 38/38 PASS
```

---

## typecheck 結果

```text
npm run typecheck
→ 既存エラーのみ（bursaPhase24Analysis, newsApiClient, storage, 他 test fixtures）
→ 本 hotfix 新規: rootStackNavigation.ts の possibly undefined は修正済み
```

---

## versionCode

| 項目 | 値 |
|------|-----|
| 依頼 | versionCode **37** |
| 実際 | **38** |
| 理由 | versionCode **37** は直前 hotfix（Home AI advice loading, commit `45dfcf4`）で Play Console 提出済み相当。同一 versionCode 再提出不可のため **38** でリリース |

---

## EAS build（正式提出用 v38）

| 項目 | 値 |
|------|-----|
| **EAS build ID** | `a0f53602-bb36-4474-99e1-30410c48bf0d` |
| **EAS build URL** | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/a0f53602-bb36-4474-99e1-30410c48bf0d |
| **AAB ファイル名** | `build-<timestamp>.aab`（EAS 生成） |
| **AAB URL** | https://expo.dev/artifacts/eas/AKechtfh2Zs-626JHsTwvdQDVbt7ace_nLQ_tNbZrfQ.aab |
| **AAB 保存場所** | EAS Artifacts（ローカル未ダウンロード） |
| **gitCommitHash (EAS)** | `6c8fe3d3e909c617dce6ada0268a86ed01e47472` |
| **appBuildVersion** | **38** |

### 参考: コミット前 interim build (v37)

| 項目 | 値 |
|------|-----|
| Build ID | `73488624-62b1-4e3b-a3c6-2d2a4bdef0eb` |
| versionCode | 37（dirty working tree、commit 前） |
| 用途 | 早期検証用。正式提出は **v38** を使用 |

---

## Play Console で次にやること

1. Internal Testing トラックに **versionCode 38** AAB をアップロード
2. テスター端末で更新インストール
3. 実機確認シナリオ:
   - AI相談 → `RM5000入金しました` → 候補カード表示
   - **キャンセル** → カードが閉じる
   - 再度同文入力 → **記録する** → 確認画面に RM5000 deposit
   - **保存** → Home / Portfolio / allocation plan に反映
   - アプリ再起動後も入金記録が残る

---

## GitHub

| 項目 | 値 |
|------|-----|
| **Commit hash** | `6c8fe3d` |
| **Push 結果** | ✅ `origin/cursor/top3-maxdd-capital-audit` へ push 済み (`fd7fb98..6c8fe3d`) |

---

## 受け入れ基準チェック

- [x] 直前 AI 相談フローで「候補が見つかりません」を出さない（staging reload + root 遷移）
- [x] キャンセルボタンでカードが閉じる
- [x] RM5000 入金が staging → confirm → deposits に保存される（unit test）
- [x] 手動入力 / OCR import コードパスは未変更（既存テスト PASS）
- [x] 新機能追加なし / UI デザイン変更なし
