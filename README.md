[日本語版はこちら](https://github.com/t0yohei/astro-qiita-loader/blob/master/README-ja.md)

# Astro Qiita Loader

This package provides a Qiita loader for Astro, allowing you to use [Qiita posts as content collections](https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF).

## Requirements

This package requires Astro 5.0.0 or later.

## Installation

```bash
npm install astro-qiita-loader
```

## Usage

You can use the `qiitaLoader` in your content configuration at `src/content/config.ts`:

```ts
import { qiitaLoader } from "astro-qiita-loader";

export const collections = {
  qiitas: qiitaLoader({
    url: "https://qiita.com/api/v2/items",
    authToken: "your_qiita_api_token", // Optional
  }),
};
```

You can then use these like any other content collection in Astro:

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

## Options

`qiitaLoader` has the following options:

- `url`: Qiita API URL. Set the URL of the posts you want to fetch.
- `authToken`: Qiita API authentication token. Optional: 1000 req/hr with token, 60 req/hr without

## Sample

See the [sample](https://github.com/t0yohei/astro-qiita-loader/tree/master/demo) for reference.

## License

[MIT](https://github.com/t0yohei/astro-qiita-loader/blob/master/LICENSE)
