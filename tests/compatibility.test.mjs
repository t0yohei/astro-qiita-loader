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

async function runSyncSequence(batches) {
  const directory = await createFixture(items);
  await writeFile(
    `${directory}/src/content.config.ts`,
    `import { writeFile } from "node:fs/promises";
import { defineCollection } from "astro:content";
import { qiitaLoader } from "astro-qiita-loader";
const batches = ${JSON.stringify(batches)};
const loader = qiitaLoader({ url: "data:application/json,[]" });
export const collections = {
  qiitas: defineCollection({
    loader: {
      ...loader,
      async load(context) {
        const results = [];
        for (const batch of batches) {
          const writes = [];
          const deletes = [];
          let clears = 0;
          const store = {
            ...context.store,
            set(entry) {
              const changed = context.store.set(entry);
              if (changed) writes.push(entry.id);
              return changed;
            },
            delete(id) {
              deletes.push(id);
              context.store.delete(id);
            },
            clear() {
              clears++;
              context.store.clear();
            },
          };
          const url = batch.url ?? "data:application/json," + encodeURIComponent(batch.raw ?? JSON.stringify(batch.items));
          let error = null;
          try {
            await qiitaLoader({ url }).load({ ...context, store });
          } catch (cause) {
            error = String(cause);
          }
          results.push({ writes, deletes, clears, error, entries: context.store.values() });
        }
        await writeFile(${JSON.stringify(`${directory}/results.json`)}, JSON.stringify(results));
      },
    },
  }),
};`,
  );
  await writeFile(`${directory}/src/pages/index.astro`, "<p>Synchronization completed</p>");
  await build({ root: pathToFileURL(`${directory}/`), logLevel: "silent" });
  return JSON.parse(await readFile(`${directory}/results.json`, "utf8"));
}

test("uses digests to skip unchanged entries and reconcile additions and removals", async () => {
  const first = items[0];
  const second = { ...first, id: "second-article" };
  const metadataUpdate = { ...first, likes_count: first.likes_count + 1 };
  const htmlUpdate = { ...metadataUpdate, rendered_body: "<h2>Updated HTML</h2>" };
  const added = { ...first, id: "added-article" };
  const results = await runSyncSequence([
    { items: [first, second] },
    { items: [first, second] },
    { items: [metadataUpdate, second] },
    { items: [htmlUpdate, second] },
    { items: [htmlUpdate, added] },
    { items: [] },
  ]);
  assert.ok(results.every((result) => result.error === null && result.clears === 0));
  assert.deepEqual(results.map((result) => result.writes), [
    [first.id, second.id], [], [first.id], [first.id], [added.id], [],
  ]);
  assert.equal(results[2].entries.find((entry) => entry.id === first.id).data.likes_count, metadataUpdate.likes_count);
  assert.equal(results[3].entries.find((entry) => entry.id === first.id).rendered.html, htmlUpdate.rendered_body);
  assert.deepEqual(results[4].deletes, [second.id]);
  assert.deepEqual(results[4].entries.map((entry) => entry.id).sort(), [added.id, first.id].sort());
  assert.deepEqual(results[5].deletes.sort(), [added.id, first.id].sort());
  assert.deepEqual(results[5].entries, []);
});

test("preserves the previous snapshot when fetching, JSON parsing, or validation fails", async () => {
  const first = items[0];
  const second = { ...first, id: "second-article" };
  const results = await runSyncSequence([
    { items: [first, second] },
    { url: "data:broken" },
    { raw: "{" },
    { items: { message: "Unexpected response" } },
    { items: [{ ...first, title: "Must not be stored" }, { ...second, created_at: "invalid-date" }] },
  ]);
  assert.equal(results[0].error, null);
  for (const result of results.slice(1)) {
    assert.ok(result.error);
    assert.equal(result.clears, 0);
    assert.deepEqual(result.writes, []);
    assert.deepEqual(result.deletes, []);
    assert.deepEqual(result.entries, results[0].entries);
  }
});
