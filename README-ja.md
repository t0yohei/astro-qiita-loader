[English version here](https://github.com/t0yohei/astro-qiita-loader/blob/master/README.md)

# Astro Qiita Loader

このパッケージは、[Qiita の投稿をコンテンツコレクション](https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF)として使用できる Astro 用の Qiita ローダーを提供します。

## 必要要件

ビルド時取得用の `qiitaLoader` は Astro 5・6・7 に対応しています。実行時取得用の `qiitaLiveLoader` には Astro 6 または 7 が必要です。開発と Astro 7 のデモには Node.js 22.22.0 以降が必要です。

## インストール

```bash
npm install astro-qiita-loader
```

## 使用方法

`src/content.config.ts` に以下のように記述します。

```ts
import { defineCollection } from "astro:content";
import { qiitaLoader } from "astro-qiita-loader";

export const collections = {
  qiitas: defineCollection({
    loader: qiitaLoader({
      url: "https://qiita.com/api/v2/items",
      authToken: "your_qiita_api_token", // オプション
    }),
  }),
};
```

次に、Astro では以下のように使用できます。

```astro
---
import { getCollection } from "astro:content";

const qiitas = await getCollection("qiitas");
---

<ul>
  {qiitas.map((qiita) => (
    <li>
      <a href={qiita.data.url} target="_blank" rel="noopener">
        {qiita.data.title}
      </a>
    </li>
  ))}
</ul>
```

これで、他のコンテンツコレクションと同じように使用できます。

## オプション

`qiitaLoader`には以下のオプションがあります。

- `url`: Qiita API の URL。取得したい投稿用の URL を設定する。
- `authToken`: Qiita API の認証トークン。トークンあり:1000 回/時、なし:60 回/時まで

## 同期

ローダーは実行のたびに設定された URL へアクセスし、取得した全記事の検証が成功してからコレクションを更新します。変更のない記事は digest の比較で書き込みを省略し、レスポンスに含まれなくなった記事を削除します。空の配列を取得した場合は、保存済みの記事をすべて削除します。

取得、JSON の解析、スキーマ検証に失敗した場合は、エラーを返し、保存済みの記事を変更しません。同期の対象は設定された URL のレスポンスに限り、追加のページは取得しません。

## Live Collection（Astro 6・7）

`astro-qiita-loader/live` の `qiitaLiveLoader` を使うと、サイトを再ビルドせずに実行時に記事を取得できます。`src/live.config.ts` にコレクションを定義します。

```ts
import { defineLiveCollection } from "astro:content";
import { qiitaLiveLoader } from "astro-qiita-loader/live";

export const collections = {
  qiitas: defineLiveCollection({
    loader: qiitaLiveLoader({
      url: "https://qiita.com/api/v2/users/t0yohei/items",
      authToken: () => process.env.QIITA_AUTH_TOKEN, // オプション
    }),
  }),
};
```

オンデマンドでレンダリングするページから記事を取得します。

```astro
---
import { getLiveCollection } from "astro:content";

export const prerender = false;
const { entries: qiitas, error } = await getLiveCollection("qiitas");
if (error) throw error;
---

<ul>
  {qiitas.map((qiita) => (
    <li><a href={qiita.data.url}>{qiita.data.title}</a></li>
  ))}
</ul>
```

オンデマンドのページには Astro のサーバーアダプターが必要です。ページのキャッシュ方針はサイト側で設定してください。ローダー自体は API のレスポンスをキャッシュしません。

`qiitaLiveLoader` には、Qiita の記事一覧 API の `url` と、省略可能な `authToken` を指定します。トークンには文字列、または文字列か `undefined` を返す同期関数を渡せます。関数は取得処理の開始時に毎回呼び出されるため、実行時の認証情報を参照できます。

取得はページ 1 から開始し、1 ページあたり 100 件を取得します。100 件未満のページに達するまで次のページを取得し、URL のほかのクエリパラメーターは保持します。各 API リクエストのタイムアウトは 10 秒です。HTTP エラー、JSON の解析エラー、スキーマ検証エラーが発生した場合は、空の結果や途中までの結果を返さず、取得処理を失敗として扱います。

記事には既存の `Item` 型を使い、日付を `Date` オブジェクトに変換します。`rendered_body` は Astro の `render()` で表示できます。1 件だけ取得する場合は `getLiveEntry("qiitas", { id: "article-id" })` を使います。この場合も一覧の全ページを取得してから対象の記事を探します。

## サンプル

[サンプル](https://github.com/t0yohei/astro-qiita-loader/tree/master/demo)を参照してください。

## ライセンス

[MIT](https://github.com/t0yohei/astro-qiita-loader/blob/master/LICENSE)
