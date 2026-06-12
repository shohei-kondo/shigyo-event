# フォーム受信用 GAS（Google Apps Script）

LP のフォーム送信を受け取り、次の3点を自動で行う Web アプリです。

1. Google スプレッドシートへ1行追記（フォーム種別ごとにシートを分割）
2. 申込者へお礼メール（自動返信文＋入力内容のコピー）
3. 自社（管理者）へ通知メール

静的サイト(GitHub Pages)のフォーム JS が、本アプリの公開URL（`/exec`）へ JSON を POST します。
本アプリは HTML を配信しません（`doGet` はヘルスチェック用 JSON のみ）。

## 仕組み

```text
[LPフォーム(GitHub Pages)] --POST(JSON)--> [GAS Web App: doPost]
                                              ├─ スプレッドシートへ追記
                                              ├─ 申込者へお礼メール
                                              └─ 自社へ通知メール
```

## セットアップ手順

### 1. スプレッドシートを用意

1. Google ドライブで新しいスプレッドシートを作成する。
2. URL の `https://docs.google.com/spreadsheets/d/<ここがID>/edit` から **スプレッドシートID** を控える。
   - シート（タブ）は自動作成されるため、最初は空のままで構いません。
   - フォーム種別ごとに `free-consultation` / `venue-support` / `script-support` というタブが自動で増えます。

### 2. Apps Script プロジェクトを作成

1. [script.google.com](https://script.google.com) で新規プロジェクトを作成。
2. このフォルダの [`Code.gs`](Code.gs) の内容を、プロジェクトの `コード.gs` に貼り付ける。
3. マニフェストを使う場合: プロジェクト設定で「`appsscript.json` マニフェスト ファイルをエディタで表示する」を有効化し、[`appsscript.json`](appsscript.json) の内容を貼り付ける。
   - （clasp を使う場合は、このフォルダをそのまま push できます。）

### 3. スクリプト プロパティを設定

「プロジェクトの設定 > スクリプト プロパティ」で以下を設定します。

| キー | 必須 | 説明 |
|---|---|---|
| `SPREADSHEET_ID` | 必須 | 手順1で控えたスプレッドシートID |
| `OWNER_EMAIL` | 必須 | 自社通知の宛先（カンマ区切りで複数可） |
| `SENDER_NAME` | 任意 | 送信者表示名（既定: `イベント幹事サポート`） |
| `SENDER_EMAIL` | 任意 | 送信元 Gmail エイリアス（設定時はGmailの送信エイリアス登録が必要） |
| `REPLY_TO_EMAIL` | 任意 | 返信先（未設定なら `SENDER_EMAIL`） |
| `SEND_USER_COPY` | 任意 | `false` で申込者へのお礼メールを停止 |

### 4. Web アプリとしてデプロイ

1. エディタ右上「デプロイ」>「新しいデプロイ」>種類「ウェブアプリ」。
2. 設定:
   - 次のユーザーとして実行: **自分**（`USER_DEPLOYING`）
   - アクセスできるユーザー: **全員**（`ANYONE_ANONYMOUS`）
3. 初回は権限承認を求められるので許可する（スプレッドシート/メール送信の権限）。
4. 発行された **ウェブアプリURL（`https://script.google.com/macros/s/.../exec`）** を控える。

### 5. LP 側にURLを設定

リポジトリの [`src/config.ts`](../src/config.ts) を開き、手順4のURLを貼り付ける。

```ts
export const FORM_ENDPOINT = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

コミット & push すると GitHub Actions が再デプロイし、フォームが実送信に切り替わります。
（空のままだとフォームは「スタブ動作」のままで、実送信せず確認画面のみ表示します。）

## 動作確認

- ヘルスチェック: ブラウザでウェブアプリURLを開くと `{"ok":true,"service":"shigyo-event-form",...}` が返ればOK。
- 本番テスト: LP のフォームから送信し、スプレッドシートへの追記と、申込者・自社へのメール到達を確認する。

## 受信データ（payload）

フォームからは次の形の JSON が POST されます。`fields` は各フォームの入力項目をラベル付きで保持します。

```json
{
  "formType": "free-consultation",
  "formTitle": "企画の無料相談",
  "plan": "free",
  "sourcePage": "lawyer",
  "professionType": "弁護士会",
  "email": "taro@example.com",
  "name": "山田 太郎",
  "fields": [
    { "label": "お名前", "value": "山田 太郎" },
    { "label": "相談したいこと", "value": "当日の流れを相談したい" }
  ],
  "submittedAt": "2026-06-10T09:00:00.000Z",
  "userAgent": "...",
  "monitoring": false
}
```

スプレッドシートは「受信日時 / 流入元LP / プラン / フォーム名」の固定列に続けて、
`fields` のラベルを列として動的に追加していきます（新項目が来ても自動で列が増えます）。
