[English version here](https://github.com/t0yohei/astro-qiita-loader/blob/master/README.md)

# Astro Qiita Loader

このパッケージは、[Qiita の投稿をコンテンツコレクション](https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF)として使用できる Astro 用の Qiita ローダーを提供します。

## 必要要件

このパッケージは Astro 5.0.0 以降が必要です。

## インストール

```bash
npm install astro-qiita-loader
```

## 使用方法

`src/content/config.ts`に以下のように記述します。

```ts
import { qiitaLoader } from "astro-qiita-loader";

export const collections = {
  qiitas: qiitaLoader({
    url: "https://qiita.com/api/v2/items",
    authToken: "your_qiita_api_token", // オプション
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

## サンプル

[サンプル](https://github.com/t0yohei/astro-qiita-loader/tree/master/demo)を参照してください。

## ライセンス

[MIT](https://github.com/t0yohei/astro-qiita-loader/blob/master/LICENSE)
