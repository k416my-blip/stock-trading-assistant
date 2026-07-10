# Internal Testing Changelog

対象: 内部テスター / QA（エンドユーザー向けリリースノートではありません）

Updated: 2026-07-10T14:50+08:00  
Branch: `cursor/top3-maxdd-capital-audit`  
Target versionCode: **46**（P0 CompactSafetyNotice 入り）

---

## Internal testing build（versionCode 46）— P0 Safety Notice

| 項目 | 値 |
|------|-----|
| 目的 | CompactSafetyNotice（参考情報のみ / 利益保証なし / 証券アプリで手動）を含む配布ビルド |
| AAB build | **PASS** |
| build ID | `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` |
| commit | `1afa9f4` |
| versionCode | **46** |
| package | `com.assistant.stocktrading` |
| profile | EAS `production`（app-bundle / store） |
| artifact URL | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| CompactSafetyNotice in bundle | **PASS**（Hermes UTF-16 検証） |
| 実機 sideload | **PASS**（versionCode 46 起動確認） |
| 実機 notice 視認 | **PARTIAL PASS** — Home / Concierge / ManualOrderFlow / Settings OK。Allocation 未達 |
| RM5000（v46） | **PASS** — 「指定額: RM5000」。RM50000 なし |
| API 未設定 UX（v46） | **PASS** — Settings「保存状態: 未設定」。クラッシュなし |
| Play 内部テスト | **アップロード可能**（推奨: store-signed Opt-in 確認） |
| 前ビルド | versionCode **45** / `1545a8ba`（CompactSafetyNotice **未収録**） |

---

## Internal testing build（versionCode 45）

| 項目 | 値 |
|------|-----|
| AAB build | **PASS** |
| build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| commit | `4d79c8b` |
| versionCode | **45** |
| package | `com.assistant.stocktrading` |
| profile | EAS `production`（app-bundle / store） |
| artifact | `MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab` |
| artifact URL | https://expo.dev/artifacts/eas/MMepTuw8tN2IvdbxkfxGzP9vXA6yTdetIDjneNhUJT4.aab |
| Play 内部テスト | **アップロード可能**（ただし P0 新免責は未収録） |

---

## AI Concierge — 予算・数量の判断（PASS 済み）

- AI コンシェルジュは **指定額を無理に使い切らない**
- **残現金・見送り・おすすめなし** は正常な投資判断（エラーではない）
- 「買わない」「現金を残す」は正式な判断として扱う
- **今日のおすすめなし** を正常表示（空状態 UI）
- **beginner strict / AllocationPlan**: 弱候補を buy に昇格しない（実機 PASS）
- **1155 + RM5000** 表示統一（RM50000 誤表示なし、実機 PASS）

---

## OOM / 長時間安定性（12h PASS 済み）

- OOM hotfix 適用済み — 12h 15m 51s 完走（試行 #2）
- ERR_STRING_TOO_LONG なし
- RN / Metro / Expo DevTools 自動起動 0
- Metro / adb 12h 維持
- health_restart 0
- logcat **ストリーム + ローテーション**（全量 adb logcat -d 保持に逆戻りなし）
- memory_watch 153 エントリ継続（次回 run から session jsonl 固定出力）

---

## foreground WARN（12h 記録）

- 35 件（unknown 26 / launcher 9）— **停止条件外**
- runner / price refresh / AI analysis は継続
- 今後: `ensureAppForeground` 判定安定化（改善候補）

---

## 開発・運用インフラ

- **CURRENT_STATUS 保護修正** — `npm run status` が PASS セクションを上書きしない
- Memory note / Live snapshot のみ自動更新
- memory_watch: 次回以降 `logs/memory_watch_<session>.jsonl` を session 固定で出力

---

## ビルド / 配布（本フェーズ）

**配布対象は versionCode 46 のみ。** versionCode 45 は旧ビルド（CompactSafetyNotice 未収録）— **内部テストへアップロードしないこと。**

| 項目 | 値 |
|------|-----|
| versionCode | **46** |
| package | `com.assistant.stocktrading` |
| AAB | EAS `production` profile（app-bundle / store）— **生成成功** |
| build ID | `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` |
| commit | `1afa9f4` |
| artifact | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| Play 内部テスト | **アップロード待ち**（上記 AAB を使用） |

### 旧ビルド（参考のみ — 配布禁止）

| 項目 | 値 |
|------|-----|
| versionCode | 45 |
| build ID | `1545a8ba-7574-419a-aa24-47bdc1cafcd4` |
| commit | `4d79c8b` |
| 備考 | CompactSafetyNotice **未収録**。テスターへ配らない |

---

## 内部テスト時の確認ポイント

1. **CompactSafetyNotice**（参考情報のみ / 利益保証なし / 手動確認）が主要画面で見えるか
2. AI Concierge: 予算未消化・残現金が「失敗」表示にならないか
3. 今日のおすすめなし / beginner strict / RM5000 表示
4. 長時間利用時の OOM / Metro 停止がないか
5. API キー未設定時の graceful エラー表示

---

## 既知の制限（本ビルド — versionCode 46）

- **AAB は生成済み** — Play 内部テストへのアップロード待ち（**versionCode 46** を使用）
- **versionCode 45 は配布禁止**（P0 安全表示未収録）
- Play Opt-in / store-signed 経路の確認は **アップロード後の手動作業**
- AllocationPlan / 今日のおすすめ空状態 — 本 gate 時点で実機再確認未達（端末ロック画面）。コード配線済み。テスター重点確認項目
- typecheck / lint **17 errors** — 既存未解決（本ビルド BLOCKER ではない）
- npm test **6 fail** — 既存未解決（同上）
- foreground WARN（12h 記録 35 件）— 停止条件外
