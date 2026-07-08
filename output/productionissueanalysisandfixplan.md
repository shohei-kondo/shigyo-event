# 本番デプロイ不具合 調査報告と修正計画（2026-07-01 / 07-02改訂）

対象: https://shigyo-event.comet-event.com/ （お名前.com サブドメイン・ドキュメントルート配信）
調査対象: リポジトリ全ブランチ + Cursor チャット履歴（cursor_chat_lawyer_page_loading_issue.json）+ 本ブランチでの再ビルド検証

> **2026-07-02 改訂**: Phase 0 / Phase 1 の実施結果と、`wip-multi-profession` ブランチの
> 検証結果を「5. 追記」に反映。**Phase 2 の起点ブランチと内容が変わっている**ため、
> 実装を依頼する場合はセクション5を正とすること。

---

## TL;DR（結論）

現在の障害は **独立した2つの原因の複合** であり、どちらも再ビルド検証で裏付けが取れた。

1. **ゲートウェイの表示崩れ・リンク404** … `build-time-unpack` ブランチは GitHub Pages 用の
   `base: '/shigyo-event/'` のままビルドされるため、CSS・内部リンクがすべて
   `/shigyo-event/...` 始まりになる。本番はルート配信なので全部 404 になる。
   1回目のアップロードが正常に見えたのは、**Cursor のローカル作業ツリーにだけ存在した
   未コミットの「ルート配信向けリンク生成」WIP** を含めてビルドしていたから。
   ブランチ分離時にその WIP は stash され、`build-time-unpack` には含まれていない。
2. **/lawyer/ の404** … 「ビルド時アンパック」は全アセットを base64 データURLとして
   HTML にインライン展開する実装のため、`dist/lawyer/index.html` が **43MB**
   （実測 43,076,675 bytes。/lawyer/v2/ も同じく43MB、dist 全体で83MB）になる。
   お名前.com ファイルマネージャー経由のアップロードがこのサイズで失敗（または途中破損）
   した可能性が高く、index.html がサーバーに存在しないため 404 になっている。

つまり「Cursor の修正（ビルド時アンパック）」の方向性自体は妥当だが、
**(a) ブランチ分離時に本番向け設定を落とした、(b) アンパック結果をファイルに書き出さず
HTML にインライン展開して43MBに膨張させた**、という2点が事故の実体。

---

## 1. 検証済みの事実関係

### 1-1. ブランチ構成

| ブランチ | 内容 |
|---|---|
| `main` (92c0991) | GitHub Pages 用。lawyer LP はクライアント側で「Unpacking…」する方式 |
| `build-time-unpack` (99834a4) | main + 「ビルド時アンパック」1コミットのみ。**ルート配信対応は含まれない** |
| （Cursor ローカルのみ） | 未コミットWIP: ルート配信向けリンク生成、士業横展開（gyosei/sharoshi/fudosan-kantei）、テスト等 |

### 1-2. `build-time-unpack` を実際にビルドした結果（本調査環境で再現）

- `dist/index.html`（ゲートウェイ）のリンク・CSS参照はすべて `/shigyo-event/` 始まり:
  - `href="/shigyo-event/_astro/index.B3_DPt0u.css"` → 本番ルート配信では **404 → 表示崩れ**
  - `href="/shigyo-event/lawyer/"` → **404**（実体は `/lawyer/`）
- `dist/lawyer/index.html` = **43,076,675 bytes**、`dist/lawyer/v2/index.html` = 43,059,120 bytes
- `src/lib/standaloneHtml.ts` にはロゴ等のURLが `/shigyo-event/comet-logo.png` などと
  **ハードコード**されており、base を直しただけでは lawyer LP 内の画像が壊れる。

### 1-3. 本番サーバーの状態（スクリーンショットより）

- ドキュメントルート直下に `_astro/ lawyer/ gyosei/ sharoshi/ fudosan-kantei/ tax-accountant/ forms/ ...` が存在。
- **`gyosei` / `sharoshi` / `fudosan-kantei` を生成するコードは GitHub 上のどのブランチにも存在しない。**
  → 1回目のアップロードが未コミットWIPからのビルドだったことの決定的証拠。
- 現在のサーバーは「1回目のアップロード（ルート配信対応・士業横展開あり）」と
  「2回目のアップロード（/shigyo-event/ ベース・43MB lawyer）」が**混在した不整合状態**。

### 1-4. 43MB の内訳（standalone HTML のマニフェスト解析結果）

`artifact/lawyer-standalone/lawyer-v3-standalone.html`（19.7MB）のマニフェスト255エントリの実態:

| 種別 | 個数 | 展開後サイズ |
|---|---|---|
| font/woff2 | **248** | **12.3 MB** |
| image/png | 6 | 2.0 MB |
| text/javascript | 1 | 0.05 MB |

ビルド時アンパックはこれらを base64 データURLとして HTML に埋め込み、しかも
同じフォントの data URL が平均2〜3回重複して埋め込まれる（ビルド後HTML内の
`data:font/woff2` 出現回数は **620回**）。これで 19.7MB → 43MB に膨張している。
LP本体のテンプレートHTML自体は **わずか576KB** しかない。

### 1-5. Cursor チャット履歴から確定した時系列

1. 1回目アップロード（WIPビルド）: ゲートウェイ正常、`/lawyer/` が「Unpacking…」のままハング。
2. Cursor が調査: 本番のHTMLサイズはローカルと一致（欠損なし）、ローカルe2eは通過、
   本番へのブラウザ検証は node_modules 破損で実施できず。
   → **「Unpacking…」ハングの真因は最後まで特定されていない**（19.7MB HTML＋巨大JSON.parse
   がブラウザ/回線条件でハングするという仮説どまり。ビルド時アンパックへの転換で「回避」する判断）。
3. ユーザー指示で `build-time-unpack` ブランチを分離。Cursor は **WIP全体を stash → main から
   ブランチ作成 → アンパック処理だけを最小移植してコミット&プッシュ → stash 復元**。
   Cursor 自身も「43MBはアップロード制限に抵触する可能性がある」「データURLが重複して
   膨張している」「gzip圧縮対象が1件のみだった」と認識していたが、対処せず出荷。
4. 2回目アップロード（`build-time-unpack` ビルド = base `/shigyo-event/`・43MB lawyer）
   → ゲートウェイ崩れ + `/lawyer/` 404（現状）。

---

## 2. 問題点の一覧

| # | 問題 | 深刻度 |
|---|---|---|
| P1 | デプロイ先が2つ（GitHub Pages / 本番ルート配信）あるのに base を切り替える仕組みがなく、`/shigyo-event/` が config と standaloneHtml.ts にハードコードされている | 高（今回の直接原因①） |
| P2 | ビルド時アンパックが全アセットを base64 インライン展開し、1ページ43MB。フォント248書体(12.3MB)は明らかに過剰で、しかも2〜3重に埋め込まれる | 高（今回の直接原因②） |
| P3 | 「動いていた状態」のソース（ルート配信対応＋士業横展開WIP）が**未コミットでCursorのローカルにしか存在しない**。消失リスクと再現性ゼロ | 高 |
| P4 | 本番サーバーが1回目/2回目アップロードの混在状態 | 中 |
| P5 | 手動ファイルマネージャーアップロードで大容量ファイルの成否確認をしていない。検収チェックリストなし | 中 |
| P6 | lawyer LP が「出所不明の巨大 standalone HTML を正規表現でパッチする」構造で、保守困難（今回のようなデバッグ不能事案の温床） | 中（中期課題） |

---

## 3. 修正計画

### Phase 0: 即時確認（コード変更なし・5分）

- お名前.com ファイルマネージャーで `lawyer/` フォルダを開き、`index.html` の有無とサイズを確認する。
  - 無い/0バイト/43MB未満 → アップロード失敗確定（P2裏付け）。
  - 43,076,675 bytes で存在するのに404 → サーバー設定（サイズ上限等）の線を追加調査。

### Phase 1: 資産保全（最優先・他作業より先）

- Cursor のローカル作業ツリーにある未コミットWIP（ルート配信リンク生成・士業横展開・
  gyosei/sharoshi/fudosan-kantei のデータ等）を**そのままブランチにコミットしてプッシュ**する。
  例: `git checkout -b wip-multi-profession && git add -A && git commit && git push -u origin wip-multi-profession`
- これが済むまで stash 操作・ブランチ切替・他AIツールへの依頼をしない（唯一の「動いた状態」の保全）。

### Phase 2: base 切替の実装（P1対応）

1. `astro.config.mjs` を環境変数で切替:
   ```js
   const target = process.env.DEPLOY_TARGET ?? 'pages';
   export default defineConfig({
     site: target === 'production'
       ? 'https://shigyo-event.comet-event.com'
       : 'https://shohei-kondo.github.io',
     base: target === 'production' ? '/' : '/shigyo-event/',
     trailingSlash: 'always',
   });
   ```
2. `package.json` に本番用ビルドを追加（Windows 環境なら `cross-env` を devDependencies に追加）:
   ```json
   "build:prod": "cross-env DEPLOY_TARGET=production astro build"
   ```
3. `src/lib/standaloneHtml.ts` のハードコードURL（`LOGO_URL` 等5定数の `/shigyo-event/...`）を
   `import.meta.env.BASE_URL` を使った組み立てに置換する。
   （`src/lib/url.ts` の `withBase()` は既に BASE_URL 参照なので変更不要。）
4. 検証: `npm run build:prod` 後に `grep -r "/shigyo-event/" dist/` が **0件** であることを確認。
   `npm run build`（Pages用）では従来どおり `/shigyo-event/` が付くことも確認。

### Phase 3: アンパック方式の変更 — インライン埋め込み → 実ファイル書き出し（P2対応）

`unpackBundleAtBuildTime` を「データURL埋め込み」から「アセットの実ファイル化」に変更する。

1. マニフェスト255エントリをビルド時にデコードし、`public/lp-assets/<uuid>.<ext>`
   （または Astro integration で `dist/lp-assets/` へ直接）として書き出す。
2. テンプレート内の UUID 参照を `data:` URL ではなく `${BASE_URL}lp-assets/<uuid>.woff2` 等の
   通常URLに置換する。
3. 期待効果: `lawyer/index.html` は **43MB → 1MB 未満**。フォント・画像は個別ファイルになり
   ブラウザキャッシュが効き、必要なものだけ遅延ロードされる（未使用フォントはダウンロードすらされない）。
   アップロード制限問題も消滅。
4. 追加最適化（任意・後回し可）: CSS の `@font-face` を解析し、実際に使用される書体のみ残して
   フォント248個を数個〜十数個に削減する。
5. 検証: `ls -la dist/lawyer/index.html`（1MB未満）、`npx astro preview` でローカル表示確認、
   v2/compare ページも同様に確認。

### Phase 4: 本番のクリーン再デプロイ（P4/P5対応）

1. サーバー側のドキュメントルート直下のサイト関連ファイルを**一旦全削除**（不安なら
   `_backup_YYYYMMDD/` フォルダへ移動退避）。混在状態を残さない。
2. `npm run build:prod` の `dist/` を **ZIP 1ファイル**にしてアップロードし、
   ファイルマネージャーの解凍機能でサーバー側展開する（数百ファイルの個別アップロード失敗を防ぐ）。
3. 検収チェックリスト（ブラウザのシークレットウィンドウで実施）:
   - [ ] `/` が正常表示（CSS適用・ロゴ表示）
   - [ ] `/lawyer/`・`/lawyer/v2/`・`/tax-accountant/` が正常表示（Unpacking画面が出ないこと）
   - [ ] DevTools の Network タブで 404 が0件
   - [ ] フォームリンク遷移（`/forms/free-consultation/` 等）と GAS 送信テスト
   - [ ] スマホ実機で `/lawyer/` の初回表示速度を確認

### Phase 5: 中期課題（今回のリリース後）

- **P6**: standalone HTML ＋正規表現パッチ（`injectCommonLpAdjustments` 等）依存からの脱却。
  LP本体テンプレートは576KBしかないので、Astro コンポーネントへの静的移植は現実的。
  移植すれば「本番でだけハングして原因がデバッグ不能」という今回の事故類型が構造的に消える。
- GitHub Actions からの FTP/SFTP 自動デプロイ（お名前.com は FTP 対応）で手動アップロード自体を排除。
- `main` へのマージ方針整理: WIP（Phase 1）＋ Phase 2/3 の修正を統合し、
  GitHub Pages / 本番の両方が同一ソースからビルドできる状態を正とする。

---

## 4. 実装を他のAIツールへ依頼する場合の指示文（コピペ用）

> このリポジトリは Astro 製静的サイトで、GitHub Pages（base=/shigyo-event/）と
> お名前.com サブドメインのルート配信（base=/）の2箇所へデプロイする。
> 次の2点を `build-time-unpack` ブランチ起点で実装してほしい。
>
> 1. `astro.config.mjs` の `site`/`base` を環境変数 `DEPLOY_TARGET` で切替可能にし、
>    `package.json` に `build:prod`（cross-env 使用）を追加。
>    `src/lib/standaloneHtml.ts` 内の `/shigyo-event/` ハードコードURL5件を
>    `import.meta.env.BASE_URL` ベースに置換。
>    完了条件: `npm run build:prod` 後 `grep -r "/shigyo-event/" dist/` が0件。
> 2. `src/lib/standaloneHtml.ts` の `unpackBundleAtBuildTime` を変更し、
>    マニフェストのアセット（woff2×248, png×6, js×1）を data URL としてHTMLに
>    インライン展開するのをやめ、ビルド時に実ファイルとして出力（例: `lp-assets/<uuid>.<拡張子>`）
>    してURL参照に置換する。
>    完了条件: `dist/lawyer/index.html` が1MB未満、`astro preview` で /lawyer/ と /lawyer/v2/ が
>    画像・フォント含め正常表示、コンソール・Networkに404なし。
>
> 注意: Cursor ローカルの未コミットWIP（士業横展開）には触れない。stash 操作をしない。

---

## 5. 追記（2026-07-02）: Phase 0/1 の結果と計画の改訂

### 5-1. Phase 0 の結果 — 前回404の原因が確定

- 再ビルド＆再アップロード後、本番の `lawyer/index.html` は **41.08MB（≒43MB）で存在**を確認
  （ローカル・ファイルマネージャー両方で一致）。
- → **前回の `/lawyer/` 404 は「43MBファイルのアップロード失敗」だったことが確定**。
  今回のアップロードは成功した。
- ただし「1ページ43MB」自体は残っている。共有サーバーはこのサイズのHTMLを圧縮配信しない
  可能性が高く、初回表示に数十秒〜（モバイル回線ではそれ以上）かかる。
  **Phase 3（アセットの実ファイル化）は引き続き必須**。
- 未確認事項: 今回アップロードしたビルドがどのソースツリー由来かで、ゲートウェイの
  表示崩れが既に直っているかが決まる（WIP復元後のツリー＝base `/` なら直っているはず）。
  → **ブラウザ（シークレットウィンドウ）で `/` と `/lawyer/` の現況を確認して記録すること**。

### 5-2. Phase 1 の結果 — WIP保全を確認（ただし重要な注意あり）

`origin/wip-multi-profession`（14eed73、38ファイル・+852/-851行）の存在と中身を実際に
取得・検証した。Cursorの報告どおり以下が保全されている:

- `astro.config.mjs`: `site` を本番ドメイン、**`base: '/'` に恒久変更**（切替なし）
- `src/lib/url.ts`: ルート配信向けリンク生成 + `buildProfessionFormLinks()`
- `src/lib/standaloneHtml.ts`: `renderProfessionLp()`（**ビルド時アンパック内蔵**）+
  `normalizeLegacyUrls()`（`/shigyo-event/` → `/` の正規表現置換）
- 士業横展開データ（gyosei / sharoshi / fudosan-kantei）、動的ルーティング、テスト一式

**⚠ 注意点が2つ:**

1. **このブランチは base を `'/'` に固定している**。このまま `main` にマージすると、
   今度は GitHub Pages 側（`/shigyo-event/` 配下で配信）が今回と逆向きに壊れる。
   → Phase 2（環境変数切替）が依然として必要な理由。
2. **43MB問題（P2）はこのWIPにもそのまま含まれている**。`renderProfessionLp` は
   ビルド時アンパックでデータURLをインライン展開する実装のまま。
   → 士業5ページ × 約43MB ＝ dist が200MB超になる見込み。Phase 3 は横展開前に必須。

### 5-3. 改訂後の Phase 2 — 起点を `wip-multi-profession` に変更

当初計画は `build-time-unpack` 起点だったが、WIPの方が新しく本番対応も含むため、
**以後の作業はすべて `wip-multi-profession` を起点にする**（`build-time-unpack` は役目終了）。

1. `astro.config.mjs` を `DEPLOY_TARGET` 環境変数で切替可能にする
   （production → base `/` + 本番ドメイン、それ以外 → base `/shigyo-event/` + github.io）。
   `package.json` に `build:prod`（`cross-env` 使用）を追加。
   ※ GitHub Pages を今後使わないと決めるなら本項は省略可だが、
   本番アップロード前の実機確認環境（ステージング）として残すことを推奨。
2. `normalizeLegacyUrls()` の正規表現置換は暫定対応として残してよいが、
   Pages 用ビルドでは base 置換が逆効果になるため、`BASE_URL` を使った置換に改める。
3. 検証: `npm run build:prod` → `grep -r "/shigyo-event/" dist/` が0件、
   `npm run build` → ゲートウェイのリンクが `/shigyo-event/` 付きであること。

### 5-4. Phase 3 以降は当初計画どおり（起点ブランチのみ変更）

- Phase 3（アンパックのデータURL→実ファイル書き出し化、目標: HTML 1MB未満）を
  `wip-multi-profession` 上で実施。実装後、士業横展開ページを含む全LPで検証。
- Phase 4（サーバー全削除→ZIP一括再デプロイ＋検収チェックリスト）は変更なし。
- セクション4の「他AIツールへの依頼文」は起点ブランチを `wip-multi-profession` に
  読み替えること（依頼文の完了条件はそのまま有効）。

### 5-5. 判定: **Phase 2 以降へ進行可**

前提条件は Phase 1（資産保全）の完了のみであり、これは検証済み。着手前に1点だけ、
現在の本番 `/` と `/lawyer/` の表示状態をブラウザで確認・記録しておくこと
（最新アップロードで base 問題が既に解消しているかどうかの切り分けになり、
Phase 4 の検収時に比較基準として使える）。

---

## 6. 追記2（2026-07-02）: /lawyer/ が「古い内容」で表示される問題の検証結果

### 6-1. 症状

再アップロード後、本番 `/lawyer/` は（時間はかかるが）表示されるようになった。しかし
成果物セクション等が **旧コンテンツ（司会台本 Word ファイル・ホテル実名の会場資料など）**
のまま表示される。GitHub Pages 版（進行台本・幹事メモ・会場ご提案資料）と内容が異なる。

### 6-2. 検証結果 — サーバー側の問題ではなく、ビルド成果物の構造的バグ（再現済み）

`build-time-unpack` 系のビルド成果物（43MBの `dist/lawyer/index.html`）をローカル配信し、
ヘッドレス Chromium で読み込んで検証した。判明した事実:

1. **43MBページの実体は「旧コンテンツの静的DOM ＋ 末尾の差し替えスクリプト」**。
   元LPの旧コンテンツがそのままHTMLに含まれており、ファイル末尾（43MB地点）の
   注入スクリプト（`injectCommonLpAdjustments` 由来）がブラウザ上で新コンテンツに
   差し替える構造になっている。差し替えが動かなければ旧コンテンツが表示される。
2. **このLPは今も実行時に unpkg.com（CDN）から React を読み込んで描画している**。
   「ビルド時アンパック」後も静的HTMLにはなっておらず、CDN 依存が残っている
   （CDNがブロック/低速な環境では何も表示されない。営業LPとして重大なリスク）。
3. **React を正常にロードさせた状態でも、差し替えは30秒待っても一切適用されず、
   旧コンテンツのまま**（JSエラーなし）。差し替えスクリプトには「8秒で監視を打ち切る」
   実装もあるが、それ以前に差し替え関数自体がビルド時アンパック後の DOM 構造では
   対象を見つけられず、静かに失敗している。
4. サーバー上のファイルはローカルビルドと同一サイズであり、アップロード欠損・キャッシュ・
   「古いファイルが残っている」類の問題では **ない**。

**結論: 「別問題」ではなく、同じ根本原因チェーン（P2: ビルド時アンパックの実装不備、
P6: 実行時パッチ構造の脆弱さ）から出た新しい症状**。GitHub Pages で正しく見えるのは、
Pages が旧方式（クライアント側アンパック→再構築後に差し替え）の main ブランチを
配信しており、その順序でだけ差し替えが成功するため。

### 6-3. Phase 3 の改訂 — 「アセット外部化」だけでは不足

当初の Phase 3（アセットの実ファイル化）に加えて、**差し替え結果の静的化**が必要。

- **方式A（推奨）: ビルド時ブラウザレンダリング＋DOMスナップショット**
  ビルド時に Playwright（`wip-multi-profession` に既に導入済み）でページを実際に描画し、
  React 実行と差し替え完了後の DOM を静的HTMLとして保存する。あわせてアセットを
  実ファイル化する。これで React CDN 依存・差し替えの実行時レース・43MB問題が
  すべて構造的に消える。
- **方式B（次善）**: 差し替え内容をビルド時に Node 側で静的適用（正規表現/HTMLパーサ）し、
  アセットを実ファイル化する。実装は軽いが、正規表現パッチ依存（P6）が残る。

**改訂後の完了条件（Cursorへの依頼文に追加すること）:**

- `dist/lawyer/index.html` に旧コンテンツの文言（例:「司会台本（Wordファイル）」）が
  **含まれない**こと（`grep` で確認）
- **JavaScript を無効にしたブラウザでも** `/lawyer/` の全セクションが新コンテンツで
  表示されること（＝真の静的化の証明）
- ページが unpkg.com 等の外部CDNへリクエストを発行しないこと（DevTools Network で確認）
- `dist/lawyer/index.html` が 1MB 未満であること（従来条件）

---

### 6-4. `fix/deploy-and-unpack`（02e65ba）の独立検証結果（2026-07-02）

Cursor実装分を取得し、本番/Pages両ターゲットのビルドとヘッドレスブラウザ検証を実施した。

**合格した項目:**

- Phase 2（base切替）: `build:prod` で `/shigyo-event/` 出現0件、通常 `build` では
  従来どおり `/shigyo-event/` 付き。両ターゲット正常。✅
- Phase 3 前半（アセット外部化）: `lawyer/index.html` 43MB → **635KB**、
  dist 全体 19MB（うち `lp-assets/` 255ファイル・15MB、content-hashで重複排除）。
  アップロード制限問題は解消。✅
- スコープ遵守: 変更は対象ファイルのみ、artifact/ 無変更、1コミット。✅

**不合格の項目（セクション6-3の完了条件、4項目すべて未達）:**

| 完了条件 | 結果 |
|---|---|
| 旧文言「司会台本（Wordファイル）」がHTMLに無いこと | ❌ lawyer/gyosei 等に残存 |
| JS無効ブラウザで新コンテンツ表示 | ❌ 旧コンテンツが表示される |
| 外部CDNへのリクエスト無し | ❌ unpkg.com から React/Babel を実行時ロード（`lp-assets/` 内のJSに残存） |
| （実挙動）CDN正常時に新コンテンツ表示 | ❌ 12秒待っても差し替え不発＝本番で再び「古い内容」が出る |

さらに CDN遮断環境（企業ネットワーク等）では**ページが完全に白紙**になることを確認。

**Cursorの検証が「合格」に見えた理由**: 追加された `preview-verify.spec.ts` は
「コンソールエラーと404が無いこと」しか検証しておらず、表示内容の新旧を一切
確認していないため。

**判定: このままPhase 4（本番デプロイ）へ進んではならない。**
残作業＝6-3の「差し替え結果の静的化」（方式A: ビルド時にヘッドレスブラウザで
描画してDOMスナップショット保存、または方式B: Node側で差し替えを静的適用）。
完了条件は6-3の表の4項目をそのまま使うこと。

---

## 7. 構成方針の判断メモ（2026-07-02）: Astro継続 vs 静的HTML化

### 結論（推奨）

**Phase 2/3 完了後に「静的HTML/CSSへ移行（Astro卒業）」を推奨。** ただし判断は
Phase 2/3 完了後でよい。理由: Astroの仕事は静的HTMLを出力することであり、
Phase 3 完了後の `dist/` はそのまま「シンプルなHTML/CSSサイト」になる。
移行＝書き直しではなく「以後どちらを編集対象にするかの宣言」であり、
**切り替えコストの大部分は、どのみち必要な Phase 2/3 に含まれている**。

### 判断基準

| 条件 | 静的化が有利 | Astro残留が有利 |
|---|---|---|
| サイト全体の共通文言・料金の変更頻度 | 四半期1回以下 | 月1回以上 |
| 新しい士業LPの追加予定 | なし（候補出し切り済み＝現状） | 多数あり |
| 保守担当者のスキル | 素のHTML/CSSなら自分で検証できる | ビルド環境を扱える |
| デザイン全面刷新の予定 | なし | あり |

- フォームの修正（送信先GAS URL変更等）は「静的HTML＋POSTするJS」なので
  **構成選択と無関係**（どちらでも簡単）。
- 静的化で失うのは「共通部分の一括変更」のみ。約10ページへの同一修正は
  AIへのコピペ依頼で対応可能だが、「直し漏れ」事故類型が生まれる点は認識しておく。

### 折衷案「Git=Astro維持、サーバー=別構成」は不採用とする

真実のソースが2つになる構成は事故の再生産装置（本番だけ手編集→次のビルド＆
アップロードで消える。「WIPがstashで消えた」と同型）。本番は常にGit管理物の
機械的な写しにする。静的化する場合も、静的ファイル自体をGitで管理し、
それをアップロードする。

### 移行手順（Phase 4 完了後に実施）

1. リポジトリに `static-site` ブランチ（または専用フォルダ）を作成し、
   検収済みの `dist/` 一式をコミットして「以後の編集対象」と宣言する。
2. Astroソース（src/ 等）は削除せずアーカイブとして残す（大規模改修時の保険）。
3. リンクを**相対パス化**する（AIに一括依頼可）。相対パスなら GitHub Pages
   （サブパス配信）とお名前.com（ルート配信）の両方でそのまま動き、
   baseパス問題（P1）が概念ごと消滅する。
4. README に「フォームのGAS URLはどのファイルのどこにあるか」を明記し、
   最頻の将来修正をAI無しでも5分でできる状態にする。
5. 以後の運用: ファイル編集 → 該当ファイルをアップロード（npm・ビルド・base設定は不要）。

### アーカイブの具体的な扱い（Q&Aより・2026-07-02追記）

- **アーカイブは GitHub 上の話**。お名前.com には静的サイトのファイル以外
  （`src/`・`package.json`・`node_modules` 等）を一切置かない。
- GitHub 側の推奨操作:
  1. Phase 4 完了時点で `astro-archive` ブランチを作成しプッシュ（現状の丸ごと保存）。
  2. `main` は「静的サイトのファイル＋README」だけに作り替える。
     普段の編集対象しか目に入らない状態にし、AIツールが誤ってAstroソースを
     修正する事故を防ぐ。
  3. **`.github/workflows/deploy.yml` を削除または静的直接配信用に書き換える**
     （放置すると静的化後の main へのプッシュでAstroビルドが走り失敗し続ける）。
     GitHub Pages をプレビューとして残す場合は「ビルド無し配信」へ書き換え、
     残さない場合はワークフロー削除＋Pages設定オフ。

### 軽微な文言修正の運用ルール（Q&Aより・2026-07-02追記）

- **修正するのは静的HTML側だけ。Astroアーカイブとの同期はしない（禁止）。**
  アーカイブは「移行日時点のスナップショット」であり、以後古くなっていくのが正しい。
  同期を試みると二重管理となり、今回の事故（2つの状態のズレ）を再生産する。
- 将来Astroを復活させる大改修が発生した場合のみ、その時点で一回だけ
  「アーカイブと現行静的サイトの差分」をAIに移植させる。
- 修正手順: エディタのフォルダ内検索で対象文言を探す（共通文言は全ファイル置換）
  → Git にコミット → 変更ファイルのみアップロード → シークレットウィンドウで確認。
- 移行時に README へ「ページ⇔ファイル対応表」を記載する
  （例: 弁護士LP → `lawyer/index.html`、無料相談フォーム →
  `forms/free-consultation/index.html`、GAS送信先URLは各フォームHTML内の定数）。

---

## 8. 補足: 当初の「Unpacking…」ハングについて

真因は未特定のまま（本番HTMLは欠損なし・ローカルe2e通過）。有力仮説は
「19.7MBのHTMLに含まれる巨大マニフェストの JSON.parse ＋ DOMParser 再構築が、
回線・端末条件（特にモバイル/Safari、非圧縮配信の共有サーバー）でハング/OOMする」。
Phase 3 でクライアント側処理自体がなくなるため、この問題は構造的に解消される。
GitHub Pages で問題が出なかったのは、Pages が Brotli/gzip 圧縮配信するため
base64 主体の19.7MBが数MB程度に圧縮されて転送されていたことが一因と推測される。
