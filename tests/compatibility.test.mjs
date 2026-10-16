import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "astro";

const root = fileURLToPath(new URL("../", import.meta.url));
const items = JSON.parse(
  await readFile(new URL("./fixtures/qiita-items.json", import.meta.url), "utf8"),
);

async function createFixture(data) {
  await mkdir(`${root}.astro`, { recursive: true });
  const directory = await mkdtemp(`${root}.astro/compatibility-`);
  // Failed builds can still have pending content-store writes.
  process.once("exit", () => rmSync(directory, { recursive: true, force: true }));
  await mkdir(`${directory}/src/pages`, { recursive: true });
  await mkdir(`${directory}/node_modules`, { recursive: true });
  await symlink(root, `${directory}/node_modules/astro-qiita-loader`, "dir");
  await writeFile(`${directory}/package.json`, '{"type":"module"}');
  const url = `data:application/json;base64,${Buffer.from(JSON.stringify(data)).toString("base64")}`;
  await writeFile(
    `${directory}/src/content.config.ts`,
    `import { defineCollection } from "astro:content";
import { qiitaLoader } from "astro-qiita-loader";
export const collections = {
  qiitas: defineCollection({ loader: qiitaLoader({ url: ${JSON.stringify(url)} }) }),
};`,
  );
  await writeFile(
    `${directory}/src/pages/index.astro`,
    `---
import { getCollection, render } from "astro:content";
const [entry] = await getCollection("qiitas");
if (!(entry.data.created_at instanceof Date) || !(entry.data.updated_at instanceof Date)) {
  throw new Error("Article dates must be parsed as Date objects");
}
const { Content } = await render(entry);
---
<h1>{entry.data.title}</h1>
<a href={entry.data.url}>{entry.data.user.name}</a>
<Content />`,
  );
  return directory;
}

test("loads, validates, and renders Qiita entries through Astro", async () => {
  const directory = await createFixture(items);
  await build({ root: pathToFileURL(`${directory}/`), logLevel: "silent" });
  const html = await readFile(`${directory}/dist/index.html`, "utf8");
  assert.ok(html.includes(items[0].title));
  assert.ok(html.includes(items[0].url));
  assert.ok(html.includes(items[0].rendered_body));
  assert.ok(html.includes(items[0].user.name));
});

test("rejects invalid article data using the loader schema", async () => {
  const directory = await createFixture([{ ...items[0], created_at: "invalid-date" }]);
  await assert.rejects(
    build({ root: pathToFileURL(`${directory}/`), logLevel: "silent" }),
    /created_at/,
  );
});
