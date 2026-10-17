[日本語版はこちら](https://github.com/t0yohei/astro-qiita-loader/blob/master/README-ja.md)

# Astro Qiita Loader

This package provides a Qiita loader for Astro, allowing you to use [Qiita posts as content collections](https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF).

## Requirements

The build-time `qiitaLoader` supports Astro 5, 6, and 7. The `qiitaLiveLoader` requires Astro 6 or 7. Development and the Astro 7 demo require Node.js 22.22.0 or later.

## Installation

```bash
npm install astro-qiita-loader
```

## Usage

You can use the `qiitaLoader` in your content configuration at `src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { qiitaLoader } from "astro-qiita-loader";

export const collections = {
  qiitas: defineCollection({
    loader: qiitaLoader({
      url: "https://qiita.com/api/v2/items",
      authToken: "your_qiita_api_token", // Optional
    }),
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

## Synchronization

Each load fetches the configured URL and validates all returned entries before updating the collection. Astro uses each entry's digest to skip writes for unchanged entries. Entries absent from the response are removed, including when the response is empty.

If fetching, JSON parsing, or schema validation fails, the load rejects and existing entries remain unchanged. Synchronization covers only the configured URL's response; the loader does not fetch additional pages.

## Live collections (Astro 6 and 7)

Use `qiitaLiveLoader` from `astro-qiita-loader/live` to fetch articles at runtime, without rebuilding your site. Define the collection in `src/live.config.ts`:

```ts
import { defineLiveCollection } from "astro:content";
import { qiitaLiveLoader } from "astro-qiita-loader/live";

export const collections = {
  qiitas: defineLiveCollection({
    loader: qiitaLiveLoader({
      url: "https://qiita.com/api/v2/users/t0yohei/items",
      authToken: () => process.env.QIITA_AUTH_TOKEN, // Optional
    }),
  }),
};
```

Query it from a page rendered on demand:

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

On-demand pages require an Astro server adapter. Keep any page caching policy in your site configuration; the loader does not cache API responses.

`qiitaLiveLoader` accepts a `url` for a Qiita article-list endpoint and an optional `authToken`. The token can be a string or a synchronous function returning a string or `undefined`. The function is called at the start of each load, so it can read runtime credentials.

Each load starts at page 1, requests 100 articles per page, and continues until a page contains fewer than 100 articles. Other URL query parameters are preserved. Each API request has a 10-second timeout. HTTP errors, invalid JSON, and schema validation errors fail the load instead of returning empty or partial results.

Entries use the existing `Item` type, parse dates as `Date` objects, and expose `rendered_body` through Astro's `render()` helper. For a single entry, use `getLiveEntry("qiitas", { id: "article-id" })`; this also fetches the collection's pages before finding the requested entry.

## Sample

See the [sample](https://github.com/t0yohei/astro-qiita-loader/tree/master/demo) for reference.

## License

[MIT](https://github.com/t0yohei/astro-qiita-loader/blob/master/LICENSE)
