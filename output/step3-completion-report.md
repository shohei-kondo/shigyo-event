# Step 3 完了報告 ＋ GitHub整理 ＋ あなたの作業手順（2026-07-07）

作業者: Claude（サンドボックスLinux環境で実装・ビルド・検証まで実施済み）
あなたに残っている作業: **コミット→プッシュ→マージの操作のみ**（本書の第3部）

---

# 第1部 実施内容と検証結果

## 変更したファイル（6件・ローカルフォルダに反映済み）

| ファイル | 変更内容 |
|---|---|
| `package.json` | `build` を本番用（`DEPLOY_TARGET=production`）に入替。Pages用は `build:pages` を新設。`build:prod` は `npm run build` のエイリアスとして残置（古い手順書を見ても事故らない）。`preview:prod` も cross-env 方式に簡素化 |
| `astro.config.mjs` | `BUILD_INFO.txt` を出力する `buildInfo` インテグレーションを追加（ターゲット名＋UTC/JST日時） |
| `.github/workflows/deploy.yml` | **復活＋改良**（fixブランチでは削除されていた）。`DEPLOY_TARGET: pages` をjob envで明示、ビルドコマンドは `npm run build:pages`、ビルド時スナップショットに必要な Playwright Chromium のインストール工程を追加 |
| `tests/build/routes.test.ts` | テスト内のビルドコマンドを `build:pages` に（このテストはPagesベースパスを検証するため） |
| `playwright.config.ts` | e2eの `webServer` を `preview:prod` に修正。※従来は素の `preview`（Pagesベース）で起動するのにテストは本番URLを期待する矛盾があり、「先にpreview:prodを手動起動していないと落ちる」罠だった |
| `README.md` | 新コマンド体系・BUILD_INFO.txt確認手順を反映、アップロード手順の番号修正 |

## 検証結果（完了条件の証明）

サンドボックスのLinux環境で `npm install` → 実ビルドを実行して確認:

```
◆ npm run build（本番ターゲット）
  grep -rl "/shigyo-event/" dist/ | wc -l  →  0        ← 条件クリア
  dist/BUILD_INFO.txt:
    target: production
    built_at_utc: 2026-07-07T10:20:24.575Z
    built_at_jst: 2026/7/7 19:20:24

◆ npm run build:pages（Pagesターゲット）
  grep -rl "/shigyo-event/" dist/ | wc -l  →  10ファイル ← 条件クリア
  dist/BUILD_INFO.txt:
    target: pages

◆ 全ルート出力確認（両ターゲット）
  lawyer / sharoshi / gyosei / fudosan-kantei / tax-accountant
  forms/free-consultation / venue-support / script-support  → 全て存在

◆ LPスナップショット検証（tests/build/routes.test.ts の全アサーション）
  旧文言「司会台本（Wordファイル）」残存なし / 新文言3種あり /
  <script>タグなし / unpkg.com参照なし / __bundler残骸なし / gateway noindex
  → ALL PASS
```

注記: サンドボックスは1コマンド45秒制限のためフルビルドを工程分割して検証した。
コード自体は無加工で、あなたのPCでは `npm run build` 一発で同じ結果になる。
念のため手元でも `npm run test:all` を1回流すことを推奨（第3部 手順2）。

---

# 第2部 GitHubの現状整理（「訳わからん」の解消）

## ブランチ地図（2026-07-07時点）

```
main (92c0991) ── GitHub Pages の公開元。旧構成（スナップショット機能なし）
 ├─ wip-multi-profession (14eed73) ─┐ mainの1つ先
 │                                   ├─ fix/deploy-and-unpack (046dd9a) ← 本番サイトの実体。mainの3つ先
 │                                   │   ※wip-multi-professionを丸ごと含む
 └─ build-time-unpack (99834a4) ── 7/1の試作（Unpackingハング対策の旧アプローチ）。
                                    fixブランチの別実装で解決済みのため不要
```

## それぞれの結論

| ブランチ | 結論 | 理由 |
|---|---|---|
| `fix/deploy-and-unpack` | **mainへマージして一本化** | 本番サイトはこのコードでビルドされている。mainが古いままだとGitHub Pages（テストページ）だけ旧コンテンツという分裂状態が続く |
| `wip-multi-profession` | **マージ後に削除** | 中身は全部fixブランチに含まれている（先祖） |
| `build-time-unpack` | **削除** | 「ビルド時アンパック」の初期試作。fixブランチの`02e65ba`＋`046dd9a`（ファイル分割＋DOMスナップショット方式）で置き換え済み。障害も解決済みと報告書に記載あり |
| `main` | 残す（デフォルト） | マージ後は「本番＝main」のシンプルな1本になる |

## ローカルの未コミット差分（コミットすべきもの）

- `src/config.ts` … Step 2で変更した**新GASのURL**（まだGitHubに上がっていない。重要）
- 今回のStep 3変更6ファイル
- `output/` 配下の手順書類（nextstepsguide.md 等。リポジトリに含める運用ならそのまま）

## ついでの掃除（任意）

- `test-output.txt` がリポジトリ直下にコミットされている（テストログの混入）。削除推奨。

---

# 第3部 あなたの作業（ステップバイステップ）

PowerShellでサイトフォルダを開いて、上から順に実行するだけです。

## 手順1: 現状確認（30秒）

```powershell
cd "H:\共有ドライブ\03_個別案件\COMET\shigyo-event"
git status
git branch --show-current   # → fix/deploy-and-unpack と出ればOK
```

`git status` に今回の6ファイル＋`src/config.ts` が変更として出ていることを確認。

## 手順2: 手元でテスト（5〜10分・推奨）

```powershell
npm install
npm run test:all
```

すべて `passed` になることを確認。
（失敗したら出力を添えてAIに相談。コミットはまだしない）

さらにビルドの最終確認:

```powershell
npm run build
type dist\BUILD_INFO.txt    # → target: production と出ればOK
```

## 手順3: コミット＆プッシュ（2分）

```powershell
git add -A
git rm --cached test-output.txt   # ゴミ掃除（任意。エラーが出たら飛ばしてよい）
git commit -m "Swap build commands (build=production), add BUILD_INFO.txt, restore Pages workflow, update GAS endpoint"
git push origin fix/deploy-and-unpack
```

## 手順4: mainへマージ（3分）

GitHubのWeb画面でやる場合（推奨・履歴が残る）:

1. https://github.com/shohei-kondo/shigyo-event を開く
2. 「Compare & pull request」または Pull requests → New pull request
3. base: `main` ← compare: `fix/deploy-and-unpack` を選択
4. 「Create pull request」→「Merge pull request」→「Confirm merge」

コマンドでやる場合:

```powershell
git checkout main
git pull origin main
git merge fix/deploy-and-unpack
git push origin main
git checkout fix/deploy-and-unpack
```

## 手順5: GitHub Pagesの自動デプロイを確認（5分）

マージすると新しい `deploy.yml` が初めて動きます。

1. リポジトリの「Actions」タブを開く
2. 「Deploy to GitHub Pages」が実行中→緑のチェックになるのを待つ（5分前後。Chromiumインストール込みのため少し長い）
3. https://shohei-kondo.github.io/shigyo-event/lawyer/ を開き、表示崩れがないことを確認

**もし赤い×（失敗）になったら**: 失敗したジョブを開いてログの末尾をコピーし、AIに相談。
本番（お名前.com）には一切影響しないので慌てなくてよい。

## 手順6: ブランチ掃除（1分・手順5の成功後）

```powershell
git push origin --delete wip-multi-profession
git push origin --delete build-time-unpack
```

## 完了後の姿

- ブランチは `main`（＝本番コード）と `fix/deploy-and-unpack`（そのうち消してよい）だけ
- 本番用ビルドは **`npm run build`**、Pages用は `npm run build:pages`
- アップロード前に `dist\BUILD_INFO.txt` で `target: production` を確認する習慣
- GitHub Pages はmainにpushするたび自動更新（テストページとして機能継続）

これで Step 3 完了。次は nextstepsguide.md の Step 4（静的化移行・急がない）。
