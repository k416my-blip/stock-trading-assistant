# LOCAL_APK_BUILD_REPORT

## 概要

`createBundleReleaseJsAndAssets` PASS 後の `gradlew assembleRelease` 実行結果。

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-19 |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| Gradle タスク | `assembleRelease` |
| アーキテクチャ | `arm64-v8a` のみ（`-PreactNativeArchitectures=arm64-v8a`） |

---

## APK 生成結果

| 項目 | 値 |
|------|-----|
| 結果 | **PASS** — `BUILD SUCCESSFUL in 3m 18s` |
| versionCode | **16** |
| versionName | 1.0.0 |
| package | `com.assistant.stocktrading` |
| APK サイズ | 34.2 MB（35,877,133 bytes） |

### APK パス

| 用途 | パス |
|------|------|
| ビルド出力（短パスビルド） | `C:\p\sta\android\app\build\outputs\apk\release\app-release.apk` |
| リポジトリ artifacts | `artifacts/preview-v16-local.apk` |

---

## ビルド経路

### 1. 通常パス（`C:\Users\k416m\Documents\Projects\stock-trading-assistant`）

| 段階 | 結果 | 原因 |
|------|------|------|
| bundle | **PASS** | fs 分離修正済 |
| assembleRelease | **FAIL** | Windows MAX_PATH — ninja object パス > 260 文字 |

```
ninja: error: Stat(...RNCSafeAreaViewShadowNode.cpp.o): Filename longer than 260 characters
```

`LongPathsEnabled=0`、`newArchEnabled=true` 環境。

### 2. 短パスビルド（`C:\p\sta`）

| 段階 | 結果 |
|------|------|
| robocopy → `C:\p\sta` | 完了 |
| `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` | **PASS** |

CMake 警告（`CMAKE_OBJECT_PATH_MAX`）は出るが、短パスにより ninja ビルド完走。

---

## 実機インストール

| 項目 | 結果 |
|------|------|
| デバイス | `FYRWXSNNAIOR9DCM`（23090RA98G / Xiaomi） |
| 旧 APK アンインストール | **Success**（署名不一致のため `-r` 不可） |
| v16 インストール | **BLOCKED** — `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user` |

**対応:** HyperOS で「USB 経由のインストールを許可」または端末上のインストール確認ダイアログを承認後、以下を再実行:

```powershell
adb install "artifacts/preview-v16-local.apk"
```

---

## 推奨（恒久対策）

1. **LongPathsEnabled=1**（管理者 + 再起動）— 通常パスからの native ビルド可
2. または CI / EAS ビルド（quota 回復後）
3. ローカル Windows では **`C:\p\sta` 等の短パス** で `assembleRelease` を実行

---

## 結論

| 項目 | 状態 |
|------|------|
| APK 生成 | **成功** |
| versionCode | **16** |
| 実機インストール | **要ユーザー承認**（HyperOS 制限） |
