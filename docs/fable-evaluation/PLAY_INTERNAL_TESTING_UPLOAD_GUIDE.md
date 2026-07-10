# Play Console 内部テスト — AAB アップロード最終ガイド

Generated: 2026-07-09T15:10+08:00  
Status: **Release Readiness PASS** / **Play 内部テスト GO**

---

## 1. ビルド情報（確認用）

| 項目 | 値 |
|------|-----|
| EAS build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| versionCode | **45** |
| versionName | `1.0.0` |
| package name | `com.assistant.stocktrading` |
| app 表示名 | Malaysia Stock AI Concierge |
| EAS profile | `production`（app-bundle / store） |
| signing | EAS remote keystore |
| AAB artifact URL | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| AAB ファイル名 | `MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab` |
| Release Readiness | **PASS** |
| 関連 commit | AAB 成功: `4d79c8b` / changelog 更新: `700ecde` |

---

## 2. AAB ダウンロード手順

### 方法 A — Expo ダッシュボード（推奨）

1. ブラウザで EAS build ページを開く  
   https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/1545a8ba-7574-419a-aa24-47bdc1cafcd4
2. **Build artifact** / **Download** から `.aab` をダウンロード
3. ローカル保存例: `Downloads/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab`

### 方法 B — artifact URL 直リンク

1. 以下をブラウザで開く（Expo アカウントログインが必要な場合あり）  
   https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab
2. `.aab` ファイルを保存

### 方法 C — EAS CLI

```bash
npx eas-cli build:view 1545a8ba-7574-419a-aa24-47bdc1cafcd4
```

表示された artifact URL からダウンロードする。

### ダウンロード後の確認

- 拡張子が **`.aab`** であること（APK ではない）
- ファイルサイズが 0 byte でないこと
- ウイルススキャン等でブロックされていないこと

---

## 3. Play Console — 内部テストトラックへアップロード

### 事前準備

- [ ] Google Play Console 開発者アカウントにログイン済み
- [ ] アプリ `com.assistant.stocktrading` が Console 上に登録済み
- [ ] 前回配布済み versionCode **44** より大きい **45** をアップロードする（本ビルドは 45）
- [ ] AAB をローカルにダウンロード済み

### 手順

1. **Google Play Console** を開く  
   https://play.google.com/console
2. アプリ **Malaysia Stock AI Concierge**（`com.assistant.stocktrading`）を選択
3. 左メニュー: **Testing → Internal testing**（内部テスト）
4. **Create new release**（新しいリリースを作成）をクリック
5. **App bundles** セクションで **Upload** をクリック
6. ダウンロードした `MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab` を選択
7. アップロード完了後、Play Console が解析するまで待つ（数分〜十数分）

### versionCode 45 確認ポイント

アップロード後、リリース詳細画面で以下を確認:

| 確認項目 | 期待値 |
|----------|--------|
| Version code | **45** |
| Version name | `1.0.0`（表示される場合） |
| 前回より大きい code | 44 → **45** で OK |
| エラー | 「version code already used」等が **出ない** こと |

**NG 例:** versionCode が 44 以下 → 再ビルドが必要（versionCode を increment）

### package name 確認ポイント

| 確認項目 | 期待値 |
|----------|--------|
| Application ID / Package name | **`com.assistant.stocktrading`** |
| 別アプリにアップロードしていないか | Console 上のアプリ名・package が一致すること |

**NG 例:** 別 package のアプリに AAB を上げる → インストール不可 / 署名不一致

### リリース名（案）

Play Console の **Release name**（内部管理用、ユーザーには非表示）:

```
v1.0.0 (45) — Internal RC — 2026-07-09
```

または:

```
Internal Test 45 — AI Concierge + OOM 12h PASS
```

### 内部テスター向け説明文（Release notes / テスター共有用）

**日本語（推奨）:**

```
【内部テスト build — versionCode 45】

■ 目的
Release Readiness PASS 後の Play 内部テスト用ビルドです。
実売買は行わず、楽天証券などへの手動入力支援アプリとしてご確認ください。

■ 今回の確認重点
1. AI Concierge — 予算未消化・残現金が「エラー」扱いにならないか
2. 「今日のおすすめなし」/ beginner strict / RM5000 表示
3. 長時間利用時のクラッシュ・OOM がないか
4. API キー未設定時の graceful エラー表示

■ 既知の制限
- 自動発注機能はありません（手動入力支援のみ）
- typecheck / unit test に既存未解決項目あり（本ビルドの BLOCKER ではない）
- 12h 試験で foreground WARN 35 件記録あり（停止条件外）

■ ビルド情報
- versionCode: 45
- package: com.assistant.stocktrading
- EAS build: 1545a8ba-7574-419a-aa24-47bdc1cafcd4
```

**English（任意）:**

```
Internal test build (versionCode 45). Manual-entry assistant only — no live trading.
Focus: AI Concierge budget/quantity UX, empty proposals, RM5000 display, stability.
Known: pre-existing typecheck/test debt; no auto-ordering.
```

8. **Release notes**（内部テスト用）に上記を貼り付け
9. **Review release** → 内容確認 → **Start rollout to Internal testing**（内部テストへ公開）
10. 処理完了まで待つ（Processing → Available）

---

## 4. 既知の制限（本ビルド）

| 区分 | 内容 | 内部テストでの扱い |
|------|------|-------------------|
| 投資ロジック | 自動売買なし。楽天等への**手動入力支援** | 仕様どおり |
| typecheck | **17 errors**（既存未解決） | 実行時 BLOCKER ではない |
| npm test | **6 fail**（既存未解決） | 同上 |
| foreground WARN | 12h 試験で 35 件（停止条件外） | クラッシュ/OOM なければ OK |
| OTA updates | `updates.enabled: false` | Play 経由の AAB 更新のみ |
| API キー | 未設定時は graceful エラー想定 | テスターにキー設定手順を共有 |

---

## 5. アップロード後に確認すべき項目（運用者）

### Play Console 上

- [ ] リリース状態が **Available**（または Available to internal testers）
- [ ] versionCode **45** / package **`com.assistant.stocktrading`** が一致
- [ ] **Pre-launch report**（プレローンチレポート）に **Critical** がないか確認
- [ ] 署名エラー・互換性エラーがないか
- [ ] 内部テスターリスト（メールアドレス / Google Group）が正しいか
- [ ] **Opt-in URL**（内部テスト参加リンク）を取得・保存

### 実機（運用者自身）

- [ ] Opt-in URL からインストールできる
- [ ] 設定 → アプリ情報で versionCode **45**（または 1.0.0 (45)）を確認
- [ ] 起動・ホーム画面・AI Concierge が開ける
- [ ] API キー未設定 / 設定済みの両パターンを一度確認

---

## 6. テスターへ共有する確認項目

テスター向けチェックリスト（コピー可）:

```
【インストール】
□ Play Console 内部テスト Opt-in URL から参加
□ Play ストアから「Malaysia Stock AI Concierge」をインストール
□ バージョンが 1.0.0 (45) 付近であること

【AI Concierge】
□ 予算を使い切らない判断が「エラー」にならない
□ 「今日のおすすめなし」が正常表示される
□ RM5000 等の金額表示がおかしくない（RM50000 等の誤表示なし）
□ beginner / strict モードで弱い候補が buy に上がらない

【安定性】
□ 30分〜数時間利用でクラッシュ・OOM しない
□ バックグラウンド復帰後も動作する

【API / 設定】
□ API キー未設定時に分かりやすいメッセージが出る
□ キー設定後に Concierge / 価格取得が動く

【報告してほしいこと】
- 再現手順付きクラッシュ
- 明らかな金額・数量の誤表示
- 「エラー」と表示されるが仕様上正常なケース（スクショ歓迎）
```

---

## 7. ロールアウト前チェックリスト

公開（Start rollout）ボタンを押す**直前**に確認:

### ビルド整合性

- [ ] AAB は build `1545a8ba-7574-419a-aa24-47bdc1cafcd4` 由来
- [ ] versionCode **45**（44 より大）
- [ ] package **`com.assistant.stocktrading`**
- [ ] production profile / store signing（EAS remote keystore）

### Release Readiness（完了済み）

- [ ] AI Concierge Budget / Quantity UI Final Acceptance: **PASS**
- [ ] OOM 12h Stability Run: **PASS**
- [ ] CURRENT_STATUS 保護: **PASS**
- [ ] Release-critical unit subset 35/35: **PASS**
- [ ] AAB 生成: **PASS**

### Play Console / ポリシー

- [ ] ストア掲載情報（最低限）が整っている
- [ ] プライバシーポリシー URL が設定済み（必要な場合）
- [ ] データセーフティフォームが未完了で BLOCK されていない
- [ ] 内部テスターが正しく追加されている

### 共有物

- [ ] Opt-in URL をテスターに送付
- [ ] `INTERNAL_TESTING_CHANGELOG.md` の要点を共有
- [ ] 既知の制限（自動発注なし、既存 test/typecheck  debt）を周知

### ロールアウト後（24h 以内）

- [ ] Play Console でインストール数・クラッシュ率を確認
- [ ] テスターからの初期フィードバックを回収
- [ ] Critical クラッシュがあればロールアウト一時停止を検討

---

## 8. トラブルシューティング（簡易）

| 症状 | 対処 |
|------|------|
| version code already used | versionCode を 46 以上に上げて AAB 再ビルド |
| 署名不一致 | 別 keystore で署名された AAB。EAS production profile で再ビルド |
| テスターがストアにアプリが見えない | Opt-in URL から参加したか、同じ Google アカウントか確認 |
| インストール後すぐクラッシュ | Pre-launch report / logcat を確認。versionCode 45 か再確認 |
| AAB URL が期限切れ | EAS build ページから再ダウンロード、または `eas build:view` で新 URL 取得 |

---

## 9. 参考リンク

| リソース | URL |
|----------|-----|
| EAS build | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/1545a8ba-7574-419a-aa24-47bdc1cafcd4 |
| AAB 直リンク | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| Play Console | https://play.google.com/console |
| 内部テスター向け changelog | `INTERNAL_TESTING_CHANGELOG.md` |
| Release Readiness レポート | `RELEASE_READINESS_INTERNAL_TESTING_REPORT.md` |

---

## 10. 最終判定

| 項目 | 状態 |
|------|------|
| AAB 生成 | **完了** |
| Play 内部テストアップロード | **手動作業待ち**（本ガイドに従って実施） |
| Release Readiness | **PASS** |

**次のアクション:** 本ガイド §2 で AAB をダウンロード → §3 で Play Console 内部テストへアップロード → §5〜§7 で確認 → テスターへ Opt-in URL と §6 チェックリストを共有。
