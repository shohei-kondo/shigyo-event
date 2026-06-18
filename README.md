# 士業団体向け イベント幹事サポート LP

士業団体・支部・研究会などのイベント幹事に向けた「イベント幹事サポート」サービスの
ランディングページ（LP）です。Astro 製の静的サイトで、GitHub Pages に公開します。

設計の詳細は [`input/shigyo_event_lp_design.md`](input/shigyo_event_lp_design.md) を参照してください。

## 構成

| URL（base 込み） | 役割 |
|---|---|
| `/shigyo-event/` | ゲートウェイ（営業・管理用 / noindex） |
| `/shigyo-event/lawyer/` | 弁護士会向けLP |
| `/shigyo-event/tax-accountant/` | 税理士会向けLP |
| `/shigyo-event/forms/free-consultation/` | 企画の無料相談フォーム |
| `/shigyo-event/forms/venue-support/` | 会場選びサポートフォーム |
| `/shigyo-event/forms/script-support/` | 台本作成サポートフォーム |

```text
src/
├─ data/                # コンテンツ（共通コピー・士業別データ・フォーム選択肢）
│  ├─ common.ts
│  ├─ forms.ts
│  └─ professions/      # 士業別データ（横展開はここに追加）
├─ layouts/BaseLayout.astro
├─ components/          # LP用・フォーム用コンポーネント
├─ lib/url.ts           # base 対応のリンクヘルパー
└─ pages/
   ├─ index.astro              # ゲートウェイ
   ├─ [profession]/index.astro # 個別LP（getStaticPaths で生成）
   └─ forms/                   # 3フォーム
```

## ローカル開発

```bash
npm install
npm run dev      # http://localhost:4321/shigyo-event/
npm run build    # dist/ に静的出力
npm run preview  # ビルド結果をプレビュー
```

## GitHub Pages への公開

1. GitHub で新規リポジトリ **`shigyo-event`** を作成し、このプロジェクトを push する。
   - リポジトリ名を `shigyo-event` にすることで、公開URLが
     `https://<ユーザー名>.github.io/shigyo-event/...` となり設計書のURL構造と一致します。
2. `astro.config.mjs` の `site` を自分の GitHub ユーザー名/Organization に合わせて変更する。
   - 例: `site: 'https://your-name.github.io'`
3. リポジトリの **Settings → Pages → Build and deployment → Source** を
   **「GitHub Actions」** に設定する。
4. `main` ブランチへ push すると [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   が自動でビルド・デプロイします。

## 横展開（士業の追加）

新しい士業向けLPを追加する手順:

1. `src/data/professions/` に新しいデータファイル（例 `social-insurance-labor-consultant.ts`）を作成。
2. `src/data/professions/index.ts` の `professions` 配列に登録。

これだけで `/shigyo-event/<slug>/` のLPが自動生成されます。

## フォーム送信について（GAS 3点セット）

フォーム送信は Google Apps Script(GAS) のWebアプリで処理し、次の3点を自動で行います。

1. Google スプレッドシートへ1行追記（フォーム種別ごとにシートを分割）
2. 申込者へお礼メール（自動返信文＋入力内容のコピー）
3. 自社（管理者）へ通知メール

仕組みは「静的サイトのフォームJS → GASのWebアプリURLへ JSON を POST → GASが受信して処理」です。
GAS は HTML を配信しません（`doGet` はヘルスチェック用JSON）。

- GAS のコードと導入手順は [`gas/`](gas/) を参照（[`gas/README.md`](gas/README.md)）。
- LP 側の送信先は [`src/config.ts`](src/config.ts) の `FORM_ENDPOINT` に GAS の exec URL を設定します。
  - **未設定（空文字）の場合はスタブ動作**（実送信せず確認画面のみ表示）になります。
- 各フォームは流入元・プランなどを送信データに含めます
  （`formType` / `plan` / `sourcePage` と、各入力項目をラベル付きの `fields[]` で保持）。
- LP の各CTAは `?from=<slug>&plan=<plan>` 付きでフォームへ遷移し、流入元を引き継ぎます。
