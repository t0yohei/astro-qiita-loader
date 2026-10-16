import type { Loader } from "astro/loaders";
import { ItemSchema, type Item } from "./schema";

export const qiitaLoader = (options: {
  url: string;
  authToken?: string;
}) => {
  const qiitaUrl = new URL(options.url);
  return {
    name: "qiita-loader",
    load: async ({
      store,
      logger,
      parseData,
      meta,
      generateDigest,
    }): Promise<void> => {
      logger.info("Loading posts from Qiita");

      const headers = options.authToken
        ? {
            Authorization: `Bearer ${options.authToken}`,
          }
        : {};
      const response = await fetch(qiitaUrl, {
        headers: headers as HeadersInit,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`);
      }

      const responseJson: Item[] = await response.json();
      const entries = [];

      for (const item of responseJson) {
        const data = await parseData({
          id: item.id,
          data: item,
        });

        const digest = generateDigest(data);

        entries.push({
          id: data.id,
          data,
          rendered: {
            html: data.rendered_body,
          },
          digest,
        });
      }

      const ids = new Set(entries.map((entry) => entry.id));
      for (const entry of entries) {
        store.set(entry);
      }
      for (const id of store.keys()) {
        if (!ids.has(id)) {
          store.delete(id);
        }
      }

      logger.info(`Loaded ${responseJson.length} posts from Qiita`);
    },
    schema: ItemSchema,
  } satisfies Loader;
};
