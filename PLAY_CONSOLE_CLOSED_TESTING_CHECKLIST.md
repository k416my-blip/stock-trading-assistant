# Play Console — Closed Testing 運用チェックリスト（自分用）

Generated: 2026-07-10  
対象ビルド: versionCode **45** / `com.assistant.stocktrading`  
EAS build: `1545a8ba-7574-419a-aa24-47bdc1cafcd4`

コード変更は不要。アップロード後の運用確認用。

---

## A. アップロード確認

- [ ] AAB アップロード済み
- [ ] versionCode **45** を確認
- [ ] package **`com.assistant.stocktrading`** を確認
- [ ] リリース状態が Available（または同等）
- [ ] **Internal testing** と **Closed testing** のどちらに上げたか記録: _______________

---

## B. Production access 要件確認（最重要）

- [ ] Play Console の **Production access** / 本番アクセス画面を開いた
- [ ] Closed testing が production access 要件の対象か確認した
- [ ] 必要人数（例: 12 人以上）を画面から転記: _______________
- [ ] 必要日数（例: 14 日間）を画面から転記: _______________
- [ ] Internal のみでは足りない場合、Closed testing トラックへ進む方針を決めた

※ 最終判断は Console 表示を正とする。本チェックリストの 12 人 / 14 日は一般的な目安。

---

## C. テスターリスト

- [ ] テスターリストを作成した（`TESTER_TRACKING_TEMPLATE.md`）
- [ ] Google Group を使う / メールリストを使う、のどちらかを決めた: _______________
- [ ] Play Console にテスター（メール or Group）を登録した
- [ ] 推奨 **15 人**（最低 12 / 予備込み）を確保した、または確保予定

---

## D. Opt-in と募集

- [ ] Opt-in URL を取得した
- [ ] Opt-in URL を保存した: _______________
- [ ] `TESTER_INVITATION_MESSAGE_JA.md` に URL を貼った
- [ ] **15 人へ送付**した（送付日: _______________）
- [ ] 送付後、`TESTER_TRACKING_TEMPLATE.md` を更新した

---

## E. 参加・インストール・期間

- [ ] **12 人以上** Opt-in 完了を確認
- [ ] インストール完了を可能な範囲で確認
- [ ] 初回起動・versionCode 45 を可能な範囲で確認
- [ ] **14 日間の開始日**: _______________
- [ ] **14 日間の終了予定日**: _______________
- [ ] アンインストールしないよう依頼・リマインドした
- [ ] 途中離脱が出たら予備テスターを追加した

---

## F. フィードバックと申請準備

- [ ] フィードバックを回収した
- [ ] Critical クラッシュがあれば記録・対応方針を決めた
- [ ] Production access 申請の前提（人数・日数）を満たしたか再確認
- [ ] Production access 申請準備（必要書類・画面入力）を開始できる状態にした

---

## G. 完了メモ

| 項目 | 記入 |
|------|------|
| 使用トラック | Internal / Closed |
| Opt-in 人数 |  |
| インストール確認人数 |  |
| 14日開始 |  |
| 14日終了予定 |  |
| Production access | 未 / 準備中 / 申請済 |
| 備考 |  |
