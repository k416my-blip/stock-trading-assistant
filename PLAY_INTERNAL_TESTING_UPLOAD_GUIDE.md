# Play Console 内部テスト — AAB アップロード最終ガイド

Generated: 2026-07-10T14:50+08:00  
Status: **Release Readiness PASS** / **Play 内部テスト CONDITIONAL GO**

> **重要:** 内部テスターへ配る AAB は **versionCode 46** のみ。**versionCode 45 は使わないでください**（CompactSafetyNotice 未収録）。

---

## 1. ビルド情報（確認用）

| 項目 | 値 |
|------|-----|
| EAS build ID | `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` |
| versionCode | **46** |
| versionName | `1.0.0` |
| package name | `com.assistant.stocktrading` |
| app 表示名 | Malaysia Stock AI Concierge |
| EAS profile | `production`（app-bundle / store） |
| signing | EAS remote keystore |
| AAB artifact URL | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| build page | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/4952baeb-d6cd-46e9-bff1-a2afc6fe1859 |
| 関連 commit | `1afa9f4` |
| CompactSafetyNotice | **bundle 検証 PASS** |
| Release Readiness | **PASS** |

### 旧ビルド（使用禁止）

| 項目 | 値 |
|------|-----|
| versionCode | 45 |
| build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| 備考 | P0 安全表示未収録。**アップロード・配布しない** |

---

## 2. AAB ダウンロード手順

### 方法 A — Expo ダッシュボード（推奨）

1. ブラウザで EAS build ページを開く  
   https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/4952baeb-d6cd-46e9-bff1-a2afc6fe1859
2. **Build artifact** / **Download** から `.aab` をダウンロード
3. ローカル保存例: `Downloads/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab`

### 方法 B — artifact URL 直リンク

1. 以下をブラウザで開く（Expo アカウントログインが必要な場合あり）  
   https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab
2. `.aab` ファイルを保存

### 方法 C — EAS CLI

```bash
npx eas-cli build:view 4952baeb-d6cd-46e9-bff1-a2afc6fe1859
```

表示された artifact URL からダウンロードする。

### ダウンロード後の確認

- 拡張子が **`.aab`** であること（APK ではない）
- ファイルサイズが 0 byte でないこと
- **versionCode 46** 由来であること（45 の旧 AAB と混同しない）

---

## 3. Play Console — 内部テストトラックへアップロード

### 事前準備

- [ ] Google Play Console 開発者アカウントにログイン済み
- [ ] アプリ `com.assistant.stocktrading` が Console 上に登録済み
- [ ] 前回配布済み versionCode より大きい **46** をアップロードする
- [ ] AAB をローカルにダウンロード済み（**46 の artifact のみ**）

### 手順

1. **Google Play Console** を開く  
   https://play.google.com/console
2. アプリ **Malaysia Stock AI Concierge**（`com.assistant.stocktrading`）を選択
3. 左メニュー: **Testing → Internal testing**（内部テスト）
4. **Create new release**（新しいリリースを作成）をクリック
5. **App bundles** セクションで **Upload** をクリック
6. ダウンロードした **versionCode 46** の `.aab` を選択
7. アップロード完了後、Play Console が解析するまで待つ（数分〜十数分）

### versionCode 46 確認ポイント

アップロード後、リリース詳細画面で以下を確認:

| 確認項目 | 期待値 |
|----------|--------|
| Version code | **46** |
| Version name | `1.0.0`（表示される場合） |
| 前回より大きい code | 45 以下 → **46** で OK |
| エラー | 「version code already used」等が **出ない** こと |

**NG 例:** versionCode 45 の AAB をアップロード → CompactSafetyNotice 未収録。**46 を使う。**

### package name 確認ポイント

| 確認項目 | 期待値 |
|----------|--------|
| Application ID / Package name | **`com.assistant.stocktrading`** |
| 別アプリにアップロードしていないか | Console 上のアプリ名・package が一致すること |

### リリース名（案）

Play Console の **Release name**（内部管理用、ユーザーには非表示）:

```
v1.0.0 (46) — Internal RC — P0 Safety Notice
```

### 内部テスター向け説明文（Release notes / テスター共有用）

**日本語（推奨）:**

```
【内部テスト build — versionCode 46】

■ 目的
P0 安全表示（CompactSafetyNotice）入りの Play 内部テスト用ビルドです。
実売買は行わず、楽天証券などへの手動入力支援アプリとしてご確認ください。

■ 今回の確認重点
1. 画面上の安全表示（参考情報のみ / 利益保証なし / 手動確認）
2. AI Concierge — 予算未消化・残現金が「エラー」扱いにならないか
3. 「今日のおすすめなし」/ beginner strict / RM5000 表示
4. 長時間利用時のクラッシュ・OOM がないか
5. API キー未設定時の graceful エラー表示

■ 既知の制限
- 自動発注機能はありません（手動入力支援のみ）
- typecheck / unit test に既存未解決項目あり（本ビルドの BLOCKER ではない）
- versionCode 45 は使用しません（46 のみ配布）

■ ビルド情報
- versionCode: 46
- package: com.assistant.stocktrading
- EAS build: 4952baeb-d6cd-46e9-bff1-a2afc6fe1859
```

8. **Release notes**（内部テスト用）に上記を貼り付け
9. **Review release** → 内容確認 → **Start rollout to Internal testing**（内部テストへ公開）
10. 処理完了まで待つ（Processing → Available）

---

## 4. Play Opt-in 確認（アップロード後 — 手動作業）

sideload smoke は実施済み（debug 再署名）。**store-signed 経路**は Play アップロード後に確認:

- [ ] Opt-in URL からインストールできる
- [ ] 設定 → アプリ情報で versionCode **46**
- [ ] CompactSafetyNotice が Home / Concierge 等で見える
- [ ] クラッシュなし

本項目は **pending** — アップロード完了後に実施。

---

## 5. アップロード後に確認すべき項目（運用者）

### Play Console 上

- [ ] リリース状態が **Available**（または Available to internal testers）
- [ ] versionCode **46** / package **`com.assistant.stocktrading`** が一致
- [ ] **Pre-launch report** に **Critical** がないか確認
- [ ] 内部テスターリスト（メールアドレス / Google Group）が正しいか
- [ ] **Opt-in URL**（内部テスト参加リンク）を取得・保存

### 実機（運用者自身 — Opt-in 後）

- [ ] Opt-in URL からインストールできる
- [ ] versionCode **46** を確認
- [ ] 起動・ホーム・AI Concierge・Settings が開ける
- [ ] API キー未設定 / 設定済みの両パターンを一度確認

---

## 6. テスターへ共有する確認項目

```
【インストール】
□ Play Console 内部テスト Opt-in URL から参加
□ Play ストアから「Malaysia Stock AI Concierge」をインストール
□ バージョンが 1.0.0 (46) 付近であること

【安全表示 / AI Concierge】
□ 「参考情報のみ。利益保証なし…」等の安全表示が見える
□ 予算を使い切らない判断が「エラー」にならない
□ 「今日のおすすめなし」が正常表示される
□ RM5000 等の金額表示がおかしくない（RM50000 等の誤表示なし）

【安定性 / API】
□ 30分〜数時間利用でクラッシュ・OOM しない
□ API キー未設定時に分かりやすいメッセージが出る
```

---

## 7. ロールアウト前チェックリスト

- [ ] AAB は build `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` 由来
- [ ] versionCode **46**（45 ではない）
- [ ] package **`com.assistant.stocktrading`**
- [ ] Release Readiness PASS / focused vitest 35/35 PASS
- [ ] Opt-in URL をテスター 15 人へ送付準備
- [ ] `INTERNAL_TESTING_CHANGELOG.md` の要点を共有

---

## 8. トラブルシューティング（簡易）

| 症状 | 対処 |
|------|------|
| version code already used | versionCode を 47 以上に上げて AAB 再ビルド |
| 45 の AAB を誤アップロード | ロールアウト停止。46 を再アップロード |
| テスターがストアにアプリが見えない | Opt-in URL から参加したか、同じ Google アカウントか確認 |

---

## 9. 参考リンク

| リソース | URL |
|----------|-----|
| EAS build (46) | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/4952baeb-d6cd-46e9-bff1-a2afc6fe1859 |
| AAB 直リンク (46) | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| Play Console | https://play.google.com/console |
| changelog | `INTERNAL_TESTING_CHANGELOG.md` |
| Final gate report | `P0_INTERNAL_TESTING_FINAL_GATE_REPORT.md` |

---

## 10. 最終判定

| 項目 | 状態 |
|------|------|
| AAB 生成 (46) | **完了** |
| Play 内部テストアップロード | **手動作業待ち** |
| Play Opt-in smoke | **pending**（アップロード後） |
| Internal testing | **CONDITIONAL GO** |
| Play 公開 | **NO** |

**次のアクション:** §2 で **versionCode 46** AAB をダウンロード → §3 で Play Console 内部テストへアップロード → §4 Opt-in 確認 → テスター 15 人へ Opt-in URL 送付。
