# 12時間テスト — 開始記録

## 状態: **STOPPED（オーケストレータ異常終了 — exit 1）**

`verdict.twelveHourTestAllowed`（JSON）は **false** のまま、ユーザー承認の **WARN_ALLOW** で開始。  
**約2時間4分**（hour-2 途中）で `verify:phase12-5` が **PC側ファイル書き込みエラー**により停止。

| 項目 | 値 |
|------|-----|
| 停止時刻 | **2026-06-11T23:24:28+08:00**（UTC 15:24:28） |
| 経過 | 約 **2h 04m**（計画12hの約17%） |
| 停止原因 | `logcat-final.txt` 書き込み失敗（`UNKNOWN errno -4094`）— おそらく logcat ファイル競合 |
| 端末アプリ | **生存**（PID 15969 維持） |
| レポート | `docs/review/PHASE12_5_LONG_RUN_REPORT.md`（**FAILED**） |

---

## 時刻

| 項目 | 値 |
|------|-----|
| 記録作成時刻 | 2026-06-11T21:07:30+08:00（ローカル概算） |
| 記録作成時刻（UTC） | 2026-06-11T13:07:30.109Z |
| **テスト開始時刻** | **2026-06-11T21:20:00+08:00** |
| **終了予定時刻（12h後）** | **2026-06-12T09:20:00+08:00** |

---

## リポジトリ / 端末

| 項目 | 値 |
|------|-----|
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| commit | `9e59afa44c6e46952ebd7e19a9f5d413e153040b` |
| remote 同期 | `0	0` |
| git status 件数（porcelain） | 455 |
| 端末 | Xiaomi Redmi Note 13 Pro 5G（`23090RA98G` / `zircon`） |
| adb serial | `FYRWXSNNAIOR9DCM` |
| バッテリー | **93%**（`status: 2` = 充電中） |
| 使用アプリ | 開発ビルド `com.assistant.stocktrading` |
| app PID（開始時） | **15969** |
| Metro 状態 | 通常モード · LISTENING **:8081**（PID 25308） |
| `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | **1** |
| `EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT` | **未設定** |

---

## WARN_ALLOW 開始記録（2026-06-11）

| 項目 | 内容 |
|------|------|
| 開始判定 | **WARN_ALLOW**（ユーザー明示承認） |
| 理由 | 目的は **12時間の端末・Metro・アプリ生存・監視ログ・API接続の安定性確認**。銘柄ニュース 0件は既知リスクとして受け入れ |
| 銘柄ニュース | **0件 × 6** — 既知リスク（クエリ設計・`language=en`） |
| 材料分析 | **partial** 扱い |
| 現行 JSON `twelveHourTestAllowed` | **false**（変更なし） |
| `operationalPass` | **true**（NewsAPI/X 接続 OK） |
| adb device | `FYRWXSNNAIOR9DCM` |
| バッテリー（開始時） | **93%** 充電中（`status: 2`） |
| `[12H-MONITOR]` | `test_started` / `heartbeat` / `news_fetch` 確認済み |
| ログ保存先 | `docs/review/twelve-hour-test/`（下記） |

### 保存ログ（12h 中）

- `app-runtime.log`
- `adb-logcat-live.log`
- `metro.log`
- `api-connectivity.log`
- `test-start-info.md`

### オーケストレータ出力（自動）

- `docs/review/phase12-5-long-run/`
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md`

---

## 事前検証結果

| 検証 | 結果 |
|------|------|
| `npm run typecheck` | **PASS** |
| unit test（twelveHour + phase12 + newsApiRateLimit） | **13/13 PASS** |
| `npm run verify:twelve-hour-preflight` | **PASS**（WARN 2: アプリ未起動、監視 env 未設定） |
| `npm run verify:twelve-hour-api-audit` | **FAIL**（下記） |
| adb 接続 | **PASS**（`device`） |
| Metro | API 監査スクリプトが一時起動（`EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1`） |

### API 疎通（`api-connectivity.log` 要約）

| 項目 | 結果 |
|------|------|
| SecureStore キー（実機） | news / x / twelve / openai **あり** |
| NewsAPI 接続テスト | HTTP **200**、5件 — **OK** |
| X API 接続テスト | HTTP **200**、10件 — **OK** |
| 6銘柄 NewsAPI | HTTP 200 だが **記事 0件** × 6 → `no_articles` |
| `operationalPass` | **true** |
| `devicePass` | **false** |
| `twelveHourTestAllowed` | **false** |

---

## ブロック理由

```
verdict.label: FAIL — 実機監査NG
stocksOk: 0 / stocksTotal: 6（銘柄別ニュースがすべて 0 件）
```

12時間テストの **安定性検証**（価格更新・画面遷移）とは別に、API 監査スクリプトが  
「銘柄ニュース未取得」を FAIL と判定したため、手順どおり **本番開始を停止**。

---

## ログ保存先

```
docs/review/twelve-hour-test/
  test-start-info.md      ← 本ファイル
  api-connectivity.log    ← API 監査出力
  metro.log               ← Metro 起動後に追記（準備中）
  adb-logcat-live.log     ← adb logcat 継続保存（バックグラウンド開始済み）
  app-runtime.log         ← [12H-MONITOR] フィルタ（現状 0 行 — 監視 env 未ビルド）
```

既存オーケストレータ出力（本番開始後）:

```
docs/review/phase12-5-long-run/
docs/review/PHASE12_5_LONG_RUN_REPORT.md
```

---

## 次に必要な対応

1. **銘柄ニュース 0 件**の原因確認（NewsAPI クエリ / プラン / マレーシア銘柄キーワード）
2. 監査 PASS 後、または **明示的な承認** で `verify:phase12-5` を開始
3. 開発ビルドを `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` で **再ビルド**（監視 logcat 用）
4. アプリを起動し Metro に接続
5. 以下を実行:

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"
npm run verify:phase12-5
```

---

## スマホ側チェックリスト（手動確認用）

開始前にユーザー確認が必要:

- [ ] スマホが充電器に接続されている
- [ ] バッテリー残量が十分ある（現在 **93%**）
- [ ] 省電力モード OFF
- [ ] ウルトラバッテリーセーバー OFF
- [ ] 開発者向け「充電中は画面をスリープにしない」ON
- [ ] 画面ロック時間を最大
- [ ] 対象アプリのバッテリー制限なし
- [ ] Wi-Fi 接続維持
- [ ] PC がスリープしない
- [ ] Metro ターミナルを閉じない
- [ ] スマホと PC が同じ Wi-Fi
- [ ] スマホをできるだけ操作しない

---

## git 操作

`git add` / `commit` / `push` — **未実施**
