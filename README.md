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

## フォーム送信について（初期スコープ）

現在フォームは **UIのみ** で、送信バックエンドは未接続です。
送信するとクライアント側バリデーションののち、確認メッセージを表示します
（実際の送信・自動返信メールは行いません）。

- 各フォームは hidden 項目で `source_page`（流入元LP）・`profession_type`・`plan`・`form_type` を保持します。
- LP の各CTAは `?from=<slug>&plan=<plan>` 付きでフォームへ遷移し、流入元を引き継ぎます。
- 送信先を接続する場合は [`src/components/form/FormShell.astro`](src/components/form/FormShell.astro)
  の `<form action>` と、スクリプト内「スタブ送信」分岐を実サービス（Formspree 等）向けに差し替えてください。
