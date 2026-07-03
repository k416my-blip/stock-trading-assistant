# Device Verify v44 — Phase B Final Report

- **Overall**: PARTIAL
- **Device**: Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`)
- **versionCode**: 44
- **Branch**: `cursor/top3-maxdd-capital-audit`
- **Report commit (pre-push)**: `1aa1fdd`
- **Timestamp**: 2026-07-03T08:55:32.826Z

## Summary

| # | Check | Status | Notes |
|---|--------|--------|-------|
| 1 | ホーム4ボタン表示（標準） | **PASS** | スクロール corpus 4/4 + `found4` スクショ27枚 |
| 1b | ホーム4ボタン表示（初心者） | **PASS** | `phase-b-beginner-scroll-shot-*-found4.png` |
| 1c | ホーム4ボタン表示（プロ/Trust） | **FAIL** | 自動モード切替不安定、証跡未取得 |
| 2 | 4フロー遷移 | **PASS** | 4画面すべて遷移確認済み |
| 3 | 手動注文リスト作成 E2E | **PARTIAL** | 作成ボタン+アラート確認。未完了件数の自動パースは未確定 |
| 4 | 全UXモード（4ボタン+1フロー） | **PARTIAL** | 初心者・標準はPASS相当、プロ・Trustは未完了 |
| 5 | UTF-8 / 文字化け修正 | **PASS** | 下記参照 |
| 6 | AAB | **未作成** | Build Credit 節約 |

## 1. 4ボタン表示証跡（スクロール位置ごと）

UIAutomator corpus では1/4になることがあるため、**スクリーンショットを優先**。

### 標準モード — PASS
- `docs/review/device-verify-v44/phase-b-standard-scroll-shot-*-found4.png`（27枚）
- `docs/review/device-verify-v44/phase-b-standard-home-after-scroll.png`
- Run 3 log: `scroll corpus saw 4/4 home buttons`

### 初心者モード — PASS
- `docs/review/device-verify-v44/phase-b-beginner-scroll-shot-*-found4.png`（27枚）
- `docs/review/device-verify-v44/phase-b-beginner-home-after-scroll.png`

### ボタンラベル（日本語）
1. コンシェルジュに全て任せる
2. 自分で銘柄と数量を指定する
3. 銘柄だけコンシェルジュに任せる
4. 数量だけコンシェルジュに任せる

## 2. 4フロー遷移証跡 — PASS

| ボタン | 遷移先 | 証跡 |
|--------|--------|------|
| コンシェルジュに全て任せる | コンシェルジュに全て任せる | `phase-b-flow-concierge_full-screen.png`, `final-e2e-flow-concierge_full.png` |
| 自分で銘柄と数量を指定する | 銘柄と数量を指定 | `phase-b-flow-manual_full-screen.png`, `final-e2e-flow-manual_full.png` |
| 銘柄だけコンシェルジュに任せる | 銘柄だけコンシェルジュに任せる | `phase-b-flow-concierge_symbol-screen.png` |
| 数量だけコンシェルジュに任せる | 数量だけコンシェルジュに任せる | `phase-b-flow-concierge_quantity-screen.png` |

## 3. 手動注文リスト作成 E2E — PARTIAL

| フロー | 作成ボタン | アラート/リスト | 未完了件数 |
|--------|-----------|----------------|-----------|
| concierge_full | PASS（Run 3） | `phase-b-standard-concierge_full-after-create.png` | 自動パース未確定 |
| manual_full | PASS（create タップ） | `final-e2e-after-manual_full.png`, `final-e2e-list-manual_full.png` | 自動パース未確定 |
| concierge_symbol | PASS（create タップ） | `final-e2e-list-concierge_symbol.png` | 自動パース未確定 |
| concierge_quantity | FAIL（ボタン未タップ） | — | — |

**所見**: 「手動注文リストを作成」ボタンのタップと作成後画面のキャプチャまでは確認。UiAutomator 上の `未完了（N件）` テキストパースが環境依存で失敗したため、件数増加の自動判定は **PARTIAL**。

## 4. UXモード別 — PARTIAL

| モード | 4ボタン | 1フロー以上 | 状態 |
|--------|---------|------------|------|
| 初心者 | PASS（found4 スクショ） | 未自動確認 | PARTIAL |
| 標準 | PASS（4/4 corpus + found4） | PASS（concierge_full） | PASS |
| プロ | 未取得 | 未取得 | FAIL |
| Trust | 未取得 | 未取得 | FAIL |

**原因**: 設定タブ→表示モード行の自動タップが端末状態（オンボーディング/スプラッシュ）で不安定。Run 3 では標準モード切替成功。

## 5. 文字化け修正内容 — PASS

- PowerShell: `chcp 65001`, `$env:PYTHONIOENCODING='utf-8'`
- Node: i18n JSON を `utf8` で読み込み、レポートを UTF-8 保存
- `dismissDialogs` の文字化けリテラルを i18n 参照に置換
- ログ出力の日本語 garble は PowerShell コンソール表示のみ（ファイルは UTF-8）

## 6. 修正した確認スクリプト

| ファイル | 用途 |
|----------|------|
| `docs/review/device-verify-v44/run-v44-phase-b-final.mjs` | フル Phase B（E2E + 全モード） |
| `run-v44-phase-b-complete.mjs` | 集中検証（E2E + モード matrix） |
| `_build-phase-b-final.mjs`, `_fix-phase-b-final.mjs`, `_fix-dup.mjs`, `_patch-tab.mjs` | ビルド/パッチ用 |

**改善点**: スクロール28回+スクショ、タップ後12〜15秒待機、splash 待機、タブ/モードを accessibility ラベルでタップ、EditText 入力ヘルパー。

## 7. Git / AAB

- **AAB 作成**: いいえ — **Build Credit 節約のため**
- **push**: 本レポートとスクリプトを commit 後 push 予定

## 再現コマンド

```powershell
chcp 65001
$env:PYTHONIOENCODING='utf-8'
cd c:\Users\k416m\Documents\Projects\stock-trading-assistant
adb reverse tcp:8081 tcp:8081
npm run start:clear   # 別ターミナル
node run-v44-phase-b-complete.mjs
```
