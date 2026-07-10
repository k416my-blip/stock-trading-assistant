# P0 Safety Notice AAB Rebuild Final Smoke — Report

Generated: 2026-07-10T13:35+08:00  
Phase: **P0 Safety Notice AAB Rebuild and Final Internal Smoke**

---

## 1. 実施日時

2026-07-10（+08）

---

## 2. Git / build 識別

| 項目 | 値 |
|------|-----|
| branch | `cursor/top3-maxdd-capital-audit` |
| base（P0 Safety Fix） | `8d64ce6` |
| build commit | **`1afa9f4`**（versionCode 46 bump + changelog） |
| CompactSafetyNotice | HEAD に commit 済み（`8d64ce6`） |

---

## 3. versionCode

| ファイル | 値 |
|----------|-----|
| `app.json` | **46** |
| `android/app/build.gradle` | **46** |
| versionName | `1.0.0` |

---

## 4. ローカル確認

| コマンド | 結果 |
|----------|------|
| `npm run status` | 実行済。PASS セクション保護維持 |
| focused vitest 4 files | **35/35 PASS** |
| `npx expo export --platform android --clear` | **PASS**（Exported: dist） |
| typecheck/lint | 既存 FAIL（本フェーズ未修正・悪化なし） |

---

## 5. EAS production AAB

| 項目 | 値 |
|------|-----|
| 結果 | **PASS / FINISHED** |
| build ID | `4952baeb-d6cd-46e9-bff1-a2afc6fe1859` |
| gitCommit | `1afa9f46102c` |
| versionCode | **46** |
| versionName | `1.0.0` |
| package | `com.assistant.stocktrading` |
| profile | production（app-bundle / store） |
| signing | EAS remote keystore |
| artifact URL | https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab |
| build page | https://expo.dev/accounts/k416my/projects/stock-trading-assistant/builds/4952baeb-d6cd-46e9-bff1-a2afc6fe1859 |

---

## 6. CompactSafetyNotice が AAB に含まれるか

**PASS（バイナリ検証）**

方法: AAB → bundletool universal APK → `assets/index.android.bundle`（Hermes）を検査

| 検索 | 結果 |
|------|------|
| `CompactSafetyNotice`（ASCII） | **FOUND** |
| `SHORT_INTERNAL_TESTING_SAFETY_NOTICE` | **FOUND** |
| 「参考情報のみ」（UTF-16-LE） | **FOUND** |
| 「利益保証なし」（UTF-16-LE） | **FOUND** |
| 「手動確認」（UTF-16-LE） | **FOUND** |

→ 旧 AAB `1545a8ba`（`4d79c8b`）の欠落は解消。本 AAB は P0 安全表示入り。

---

## 7. 実機スモーク

| 項目 | 結果 |
|------|------|
| 方法 | bundletool universal APK + `adb install`（debug 再署名 sideload） |
| uninstall 旧アプリ | Success（v45 sideload を削除） |
| install v46 | **FAIL** — `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user` |
| 原因 | Xiaomi / HyperOS の **USB経由のインストール** 制限（端末側で拒否） |
| versionCode 46 実機起動 | **未達**（インストール不可のため） |
| CompactSafetyNotice 画面視認 | **未達**（同上） |
| APIキー未設定 UX（v46） | **未達**（同上）。v45 スモークではクラッシュなし確認済み |
| RM5000 | **未達** |
| クラッシュ / 真っ白 | インストール未完了のため N/A |

### 端末側で必要な操作（再スモーク前）

1. 設定 → 追加設定 → 開発者向けオプション  
2. **USBデバッグ（セキュリティ設定）** / **USB経由のインストール** を ON  
3. 必要なら端末に表示されるインストール許可ダイアログで許可  
4. その後 `adb install` 再実行、または Play Internal Opt-in で確認

---

## 8. Internal testing / Play 判定

| 項目 | 判定 |
|------|------|
| Internal testing | **CONDITIONAL GO** |
| Play 公開 | **NO**（維持） |

### CONDITIONAL GO の根拠

**満たした条件:**

- CompactSafetyNotice 入り AAB **生成済み**（バイナリ検証 PASS）
- versionCode **46**
- focused **35/35 PASS**
- expo export PASS
- 既存 v45 実機で API 未設定クラッシュなし・既存非自動売買明示は確認済み

**未達（正式 GO 前）:**

- versionCode **46 の実機起動・画面視認**（USB install 制限）
- RM5000 / 今日のおすすめ空状態の v46 実機確認
- Play Opt-in 経路での確認（推奨）

---

## 9. 残課題

1. 端末で USB インストール許可 → v46 sideload 再スモーク  
   または Play Console へ本 AAB を上げ Opt-in で確認  
2. CompactSafetyNotice の画面別視認（Home / Concierge / おすすめ / Manual / Allocation / Settings）  
3. RM5000 / おすすめなしの厳密確認  
4. typecheck 既存 FAIL（別フェーズ）

---

## 10. 最終判定

# **PARTIAL**

- AAB rebuild: **PASS**
- CompactSafetyNotice included: **PASS**（bundle 検証）
- device smoke v46: **FAIL/blocked**（USER_RESTRICTED）
- Internal: **CONDITIONAL GO**
- Play: **NO**
