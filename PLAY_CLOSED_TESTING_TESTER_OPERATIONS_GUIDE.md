# Play Console — Closed Testing / Tester Operations ガイド

Generated: 2026-07-10T09:15+08:00  
Status: **Release Readiness PASS** / **Tester Operations PREPARED**

関連ビルド:

| 項目 | 値 |
|------|-----|
| EAS build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| versionCode | **45** |
| package | `com.assistant.stocktrading` |
| AAB | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |

---

## 1. Internal testing と Closed testing の違い

| 項目 | Internal testing（内部テスト） | Closed testing（クローズドテスト） |
|------|-------------------------------|-----------------------------------|
| 目的 | 少人数・短期間の素早い検証 | 限定テスターによる正式な pre-production 検証 |
| テスター数 | 少人数向け（運用上は数十人まで可） | リスト管理。人数要件は Console 表示に従う |
| 審査 | 通常は迅速 | トラックによっては審査・ポリシー確認あり |
| production access | **必ずしも要件対象ではない** | **個人開発者アカウントでは要件対象になりやすい** |
| 用途の目安 | AAB の即時配布・スモーク | 本番公開申請前の正式テスト期間 |

**要点:** Internal は「早く配る」、Closed は「本番アクセス申請に効きやすい正式テスト」になりやすい。最終判断は Play Console の表示を正とする。

---

## 2. production access 要件の確認手順（必須）

Google Play の個人開発者アカウントでは、**本番（Production）へのアクセス申請**の前に、一定人数・一定期間の closed test が求められる場合があります。

### Play Console での確認手順

1. [Google Play Console](https://play.google.com/console) にログイン
2. アプリ **Malaysia Stock AI Concierge**（`com.assistant.stocktrading`）を選択
3. 左メニューから **Publishing overview** または **Production** / **本番** 関連の項目を開く
4. **Production access** / **本番へのアクセス** / **Apply for production** などの画面を探す
5. 画面に表示されている要件を読む。例:
   - Closed testing で **12 人以上**のテスター
   - **14 日間以上**の継続
   - Internal testing では要件を満たさない、など
6. 表示された要件を `PLAY_CONSOLE_CLOSED_TESTING_CHECKLIST.md` に転記する

### 重要な注意

- 個人開発者アカウントでは、**12 人以上・14 日間の closed test** が必要になる**可能性**がある
- **最終判断は必ず Play Console の Production access 画面で確認する**
- 本ガイドの人数・日数は一般的な目安であり、Console 表示が優先される
- Internal testing のみで足りるか、Closed testing が必須かは **Console 上の文言で決める**

---

## 3. テスター募集人数の推奨

| 区分 | 人数 | 説明 |
|------|------|------|
| 最低ライン（要件目安） | **12 人** | Console が 12 人を求める場合の下限。離脱リスクあり |
| **推奨** | **15 人** | 途中離脱・未インストールを見込んだ運用推奨 |
| かなり安全 | **18〜20 人** | 予備を厚くする場合 |

**運用ルール:**

1. **Opt-in URL 発行後**に募集を開始する（URL なしで先に声をかけない）
2. テスターは **Google アカウント**で Opt-in する必要がある
3. Opt-in **だけでは不十分**。次が必要:
   - Play ストアから **インストール**
   - **起動**してアプリが動くこと
   - 要件期間（例: **14 日間**）アプリを **保持**すること
4. 途中で **アンインストール**されると、人数・期間カウントに不利になるリスクがある
5. 管理は `TESTER_TRACKING_TEMPLATE.md` で行う

---

## 4. テスターに依頼すること

| # | 依頼内容 |
|---|----------|
| 1 | Opt-in URL を開き、Google アカウントで内部/クローズドテストに参加する |
| 2 | Play ストアからアプリをインストールする |
| 3 | アプリを起動し、ホーム / AI Concierge などを軽く確認する |
| 4 | 可能なら 1 日 1 回、または数日に 1 回起動する |
| 5 | **14 日間はアンインストールしない**（要件期間中） |
| 6 | 実売買はしない。自動発注機能はない（手動入力支援のみ） |
| 7 | API キーがなくても基本画面の確認だけでよい |
| 8 | 不具合があればスクリーンショットと再現手順を送る |

文面テンプレート: `TESTER_INVITATION_MESSAGE_JA.md`  
手順ガイド: `TESTER_INSTALL_AND_FEEDBACK_GUIDE_JA.md`

---

## 5. 推奨オペレーションフロー

```
AAB アップロード完了
  → Internal / Closed のどちらが production access 対象か Console で確認
  → 対象トラックにリリースを公開
  → テスターリスト作成（メール or Google Group）
  → Opt-in URL 取得
  → 15 人へ招待文送付
  → Opt-in / インストール / 起動を追跡表で管理
  → 14 日間維持（アンインストール防止のリマインド）
  → フィードバック回収
  → Production access 申請準備
```

---

## 6. 関連ドキュメント

| ファイル | 用途 |
|----------|------|
| `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md` | AAB ダウンロード〜内部テストアップロード |
| `PLAY_CONSOLE_CLOSED_TESTING_CHECKLIST.md` | 運用者用チェックリスト |
| `TESTER_TRACKING_TEMPLATE.md` | 15+5 人管理表 |
| `TESTER_INVITATION_MESSAGE_JA.md` | LINE / WhatsApp 用依頼文 |
| `TESTER_INSTALL_AND_FEEDBACK_GUIDE_JA.md` | テスター向け簡易手順 |
| `INTERNAL_TESTING_CHANGELOG.md` | ビルド変更点 |
| `RELEASE_READINESS_INTERNAL_TESTING_REPORT.md` | Release Readiness 判定 |

---

## 7. 最終判定（本フェーズ）

| 項目 | 状態 |
|------|------|
| ドキュメント整備 | **PREPARED** |
| Play Console アップロード | **手動作業待ち** |
| テスター募集 | Opt-in URL 取得後に開始 |
| Production access | Console 要件確認後に申請準備 |
