# Play Internal Testing Readiness Report

**更新日:** 2026-06-19  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**前回:** `PHASE25_RELEASE_HARDENING_REPORT.md`（条件付き NO）

---

## 投入可否: **NO**（ブロッカー 4 件）

Play Internal Testing へのアップロードは **現時点不可**。プライバシー草案と Data Safety 整理は完了。production AAB とストア素材が未完了。

---

## 完了項目

| # | 項目 | 状態 | 証跡 |
|---|------|------|------|
| 1 | Release flavor 分離 | **完了** | `eas.json` · Phase 25 |
| 2 | monitor 除去（production） | **設定完了** | env `"0"` · logcat 実証は AAB 後 |
| 3 | プライバシーポリシー草案 | **完了** | `PRIVACY_POLICY_REPORT.md` §4/§5 |
| 4 | Data Safety 整理 | **完了** | `PRIVACY_POLICY_REPORT.md` §3 |
| 5 | Orchestrator exit code | **完了** | Phase 25 |
| 6 | API Key SecureStorage 監査 | **完了** | Commit24 + Phase 25 |
| 7 | npm production ビルドコマンド | **完了** | `package.json` → `npx eas-cli` |
| 8 | versionCode 16 準備 | **完了** | `app.json` · EAS bump 確認 |

---

## 残作業一覧（優先順）

### P0 — Internal Testing 投入 blocker

| # | 課題 | 状態 | 担当アクション |
|---|------|------|----------------|
| 1 | **production AAB 生成** | **BLOCKED** | Jul 01 quota リセット後 `npm run build:android:production`、または EAS 有料プラン |
| 2 | **プライバシーポリシー URL 公開** | **未** | `PRIVACY_POLICY_REPORT.md` §4/§5 を GitHub Pages / Notion 等にホスト |
| 3 | **Play Console Data Safety 入力** | **未** | §3 チェックリストを Console へ転記 |
| 4 | **スクリーンショット（最低 2 枚）** | **未** | 実機キャプチャ · phone + 7" tablet 推奨 |
| 5 | **フィーチャーグラフィック 1024×500** | **未** | デザイン作成 |
| 6 | **コンテンツレーティング** | **未** | Play Console 質問票 |
| 7 | **サポート連絡先 / メール** | **未** | ストア掲載必須 |

### P1 — AAB 取得直後

| # | 課題 | 状態 |
|---|------|------|
| 8 | production AAB 実機スモーク（monitor=0 確認） | **未** — `verify-production-aab-smoke.mjs` |
| 9 | API キー `adb install -r` 永続化 UI smoke | **未** |
| 10 | 株価更新 · AI 分析 end-to-end | **未** |
| 11 | `eas submit` または Console 手動 AAB upload | **未** |
| 12 | Internal Testing テスター登録 | **未** |

### P2 — 公開品質

| # | 課題 | 状態 |
|---|------|------|
| 13 | 英語 store listing | 草案のみ（`GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md`） |
| 14 | Rakuten 表記 · 非提携声明の法務確認 | 未 |
| 15 | 第二デバイス 3h screen-off | 未（NEXT_PHASE P1-5） |
| 16 | Windows ローカル Gradle パス問題 | 調査 · WSL2/短パス clone 検討 |

---

## 投入可能になる条件（チェックリスト）

- [ ] production AAB（versionCode ≥ 16 · EAS 署名 · monitor 無効 logcat 0 行）
- [ ] プライバシーポリシー URL を Play Console に登録
- [ ] Data Safety フォーム完了
- [ ] スクリーンショット + フィーチャーグラフィック
- [ ] コンテンツレーティング + サポートメール
- [ ] 実機スモーク PASS（`PRODUCTION_AAB_SMOKE_REPORT.md`）
- [ ] Play Console Internal Testing track へ AAB アップロード

**全項目完了時 → 投入可否: YES（Internal Testing）**

---

## タイムライン見込み

| イベント | 日付 |
|----------|------|
| EAS Free Android builds リセット | **2026-07-01** |
| 推奨 AAB 再ビルド | 2026-07-01 以降 |
| プライバシー URL 公開 | オーナー作業（並行可） |
| Internal Testing 初回 upload | AAB + URL + Data Safety 完了後 |

---

## 参照

- `docs/review/PRIVACY_POLICY_REPORT.md`
- `docs/review/PRODUCTION_AAB_BUILD_REPORT.md`
- `docs/review/PRODUCTION_AAB_SMOKE_REPORT.md`
- `docs/review/PHASE25_RELEASE_HARDENING_REPORT.md`
- `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md`

---

## GitHub sync

Commit: **71465f2**  
Push: **success** (`origin/cursor/top3-maxdd-capital-audit`)
