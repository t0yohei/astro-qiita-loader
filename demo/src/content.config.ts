import { defineCollection, z } from "astro:content";
import { qiitaLoader } from "astro-qiita-loader";

const qiitas = defineCollection({
  loader: qiitaLoader({
    url: "https://qiita.com//api/v2/items",
  }),
});

export const collections = {
  qiitas,
};
