[English version here](https://github.com/t0yohei/astro-qiita-loader/blob/master/README.md)

# Astro Qiita Loader

このパッケージは、[Qiita の投稿をコンテンツコレクション](https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF)として使用できる Astro 用の Qiita ローダーを提供します。

## 必要要件

このパッケージは Astro 5・6・7 に対応しています。開発と Astro 7 のデモには Node.js 22.22.0 以降が必要です。

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

## サンプル

[サンプル](https://github.com/t0yohei/astro-qiita-loader/tree/master/demo)を参照してください。

## ライセンス

[MIT](https://github.com/t0yohei/astro-qiita-loader/blob/master/LICENSE)
