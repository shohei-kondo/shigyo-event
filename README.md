# 士業団体向け イベント幹事サポート LP

士業団体・支部・研究会などのイベント幹事に向けた「イベント幹事サポート」サービスのランディングページ（LP）です。Astro 製の静的サイトで、**お名前.com レンタルサーバ**（`shigyo-event.comet-event.com`）に公開します。

設計の詳細は [`input/shigyo_event_lp_design.md`](input/shigyo_event_lp_design.md) を参照してください。

## 構成

| URL | 役割 |
|---|---|
| `https://shigyo-event.comet-event.com/` | ゲートウェイ（営業・管理用 / noindex） |
| `…/lawyer/` | 弁護士会向けLP |
| `…/tax-accountant/` | 税理士会向けLP |
| `…/sharoshi/` | 社労士会向けLP |
| `…/gyosei/` | 行政書士会向けLP |
| `…/fudosan-kantei/` | 不動産鑑定士協会向けLP |
| `…/forms/free-consultation/` | 企画の無料相談フォーム |
| `…/forms/venue-support/` | 会場選びサポートフォーム |
| `…/forms/script-support/` | 台本作成サポートフォーム |

```text
src/
├─ data/
│  ├─ common.ts
│  ├─ forms.ts
│  └─ professions/       # 士業別データ（横展開はここに追加）
├─ layouts/BaseLayout.astro
├─ components/form/      # フォーム用コンポーネント
├─ lib/
│  ├─ standaloneHtml.ts  # v3 LP レンダラ（全士業共通）
│  └─ url.ts
└─ pages/
   ├─ index.astro              # ゲートウェイ（noindex）
   ├─ [profession]/index.astro # 個別LP
   └─ forms/
```

## ローカル開発

### 事前準備（初回のみ）

1. [Node.js LTS（20.x 推奨）](https://nodejs.org/) をインストール
2. ターミナル（Cursor: `` Ctrl+` ``）でプロジェクトフォルダを開く
3. バージョン確認:

```powershell
node -v
npm -v
```

4. 依存パッケージのインストール:

```powershell
npm install
npx playwright install chromium
```

※ Google ドライブ上で `npm install` が失敗する場合は、`C:\work\shigyo-event` などローカルにコピーして実行してください。

### 開発サーバー

```powershell
npm run dev
```

→ `http://localhost:4321/` で確認（ホットリロード付き）。`Ctrl+C` で停止。

### テスト

**前提:** 下の `npm install` が済んでいること（`node_modules/vitest` があること）。  
未インストールだと `'vitest' は認識されていません` と出て **テストは1件も実行されていません**（期待される結果ではない）。

```powershell
npm test              # Vitest（ユニット・ビルドテスト）… 約10〜90秒
npm run test:e2e      # Playwright（要: 先に npm run build）… 約40秒
npm run test:all      # 上記2つを連続実行
```

**成功時の目安（末尾に近い表示）:**

```text
Test Files  4 passed (4)
     Tests  21 passed (21)

  15 passed (38.1s)    ← Playwright（test:all の後半）
```

すべて `passed` / 終了コード 0 なら OK。`failed` やコマンド未認識エラーは NG。

弁護士 LP の視覚比較基準を GitHub Pages 公開版から取得する場合（初回 or 基準更新時）:

```powershell
npm run baseline:capture
```

### 本番ビルド

```powershell
npm run build
```

`dist/` フォルダに静的 HTML が出力されます。

### ビルド結果のプレビュー

```powershell
npm run preview
```

→ `http://localhost:4321/` で **ビルド済み** の内容を確認（本番と同じ状態）。

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発中のリアルタイム確認 |
| `npm run preview` | アップロード前の最終確認 |

## お名前.com への公開

[manga.comet-event.com](https://manga.comet-event.com/) と同様のサブドメイン運用です。

### 初回: サブドメイン設定

1. お名前.com で `shigyo-event.comet-event.com` をレンタルサーバに割り当て
2. SSL（Let's Encrypt）を有効化

### 更新のたび

1. `npm run test:all` でテスト通過を確認
2. `npm run build`
3. （推奨）`npm run preview` で目視確認
4. **ファイルマネージャー**で `dist/` **の中身**をサブドメインのドキュメントルートへアップロード  
   - NG: `dist` フォルダごと上げる → `…/dist/lawyer/` になる  
   - OK: `index.html`, `lawyer/`, `forms/` 等をルート直下に配置

## 横展開（士業の追加）

1. `src/data/professions/` に新しいデータファイルを作成
2. `src/data/professions/index.ts` の `professions` 配列に登録
3. `npm run test:all` → `npm run build`

## フォーム送信（GAS）

フォーム送信は Google Apps Script (GAS) の Web アプリで処理します。詳細は [`gas/README.md`](gas/README.md)。

- 送信先: [`src/config.ts`](src/config.ts) の `FORM_ENDPOINT`
- 未設定時はスタブ動作（確認画面のみ）
