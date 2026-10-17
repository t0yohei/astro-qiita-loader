import type { LiveDataEntry } from "astro";
import type { LiveLoader } from "astro/loaders";
import { z } from "astro/zod";
import { ItemSchema, type Item } from "./schema";

export function qiitaLiveLoader(options: {
  url: string;
  authToken?: string | (() => string | undefined);
}): LiveLoader<Item, { id: string }> {
  const url = new URL(options.url);

  const loadEntries = async (): Promise<LiveDataEntry<Item>[]> => {
    const entries: LiveDataEntry<Item>[] = [];
    const token = typeof options.authToken === "function"
      ? options.authToken()
      : options.authToken;

    for (let page = 1; ; page++) {
      const pageUrl = new URL(url);
      pageUrl.searchParams.set("per_page", "100");
      pageUrl.searchParams.set("page", String(page));
      const response = await fetch(pageUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch Qiita articles: ${response.status}`);
      }

      const items = z.array(ItemSchema).parse(await response.json());
      entries.push(...items.map(data => ({
        id: data.id,
        data,
        rendered: { html: data.rendered_body },
      })));
      if (items.length < 100) return entries;
    }
  };

  return {
    name: "qiita-live-loader",
    loadCollection: async () => ({ entries: await loadEntries() }),
    loadEntry: async ({ filter }) => (await loadEntries()).find(entry => entry.id === filter.id),
  };
}
