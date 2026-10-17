import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dev } from "astro";

const require = createRequire(import.meta.url);
const { version } = require("astro/package.json");
const root = fileURLToPath(new URL("../", import.meta.url));
const [article] = JSON.parse(await readFile(new URL("./fixtures/qiita-items.json", import.meta.url), "utf8"));

test("live collections fetch and render Qiita entries at request time", {
  skip: Number(version.split(".")[0]) < 6 ? "Live Loader requires Astro 6 or later" : false,
}, async t => {
  const originalToken = process.env.QIITA_LIVE_TEST_TOKEN;
  const state = { items: [article], status: 200, raw: undefined, hang: false, requests: [] };
  const api = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    state.requests.push({ url, authorization: request.headers.authorization });
    if (state.hang) return;
    response.writeHead(state.status, { "Content-Type": "application/json" });
    const page = Number(url.searchParams.get("page"));
    response.end(state.raw ?? JSON.stringify(state.items.slice((page - 1) * 100, page * 100)));
  });
  let server;
  let directory;
  t.after(async () => {
    if (originalToken === undefined) delete process.env.QIITA_LIVE_TEST_TOKEN;
    else process.env.QIITA_LIVE_TEST_TOKEN = originalToken;
    await server?.stop();
    api.closeAllConnections();
    await new Promise(resolve => api.close(resolve));
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const url = `http://127.0.0.1:${api.address().port}/items?query=tag%3Aastro&page=9&per_page=1`;

  await mkdir(`${root}.astro`, { recursive: true });
  directory = await mkdtemp(`${root}.astro/live-`);
  await mkdir(`${directory}/src/pages`, { recursive: true });
  await mkdir(`${directory}/node_modules`, { recursive: true });
  await symlink(root, `${directory}/node_modules/astro-qiita-loader`, "dir");
  await writeFile(`${directory}/package.json`, '{"type":"module"}');
  await writeFile(`${directory}/src/live.config.ts`, `
import { defineLiveCollection } from "astro:content";
import { qiitaLiveLoader } from "astro-qiita-loader/live";
export const collections = {
  qiitas: defineLiveCollection({ loader: qiitaLiveLoader({
    url: ${JSON.stringify(url)},
    authToken: () => process.env.QIITA_LIVE_TEST_TOKEN,
  }) }),
  authenticated: defineLiveCollection({ loader: qiitaLiveLoader({
    url: ${JSON.stringify(url)}, authToken: "static-test-token",
  }) }),
};`);
  await writeFile(`${directory}/src/pages/index.astro`, `---
import { getLiveCollection, render } from "astro:content";
export const prerender = false;
const { entries, error } = await getLiveCollection("qiitas");
if (error) throw error;
const posts = await Promise.all(entries.map(async entry => {
  if (!(entry.data.created_at instanceof Date) || !(entry.data.updated_at instanceof Date)) {
    throw new Error("Article dates must be parsed as Date objects");
  }
  return { entry, Content: (await render(entry)).Content };
}));
---
<ul>{posts.map(({ entry, Content }) => <li>
  <a href={entry.data.url}>{entry.data.title}</a>
  <time>{entry.data.created_at.toISOString()}</time>
  <Content />
</li>)}</ul>`);
  await writeFile(`${directory}/src/pages/collection.json.ts`, `
import { getLiveCollection } from "astro:content";
export const prerender = false;
export async function GET({ url }) {
  const collection = url.searchParams.has("static") ? "authenticated" : "qiitas";
  const { entries, error } = await getLiveCollection(collection);
  return Response.json(error ? { error: error.message } : entries, { status: error ? 500 : 200 });
}`);
  await writeFile(`${directory}/src/pages/entry.json.ts`, `
import { getLiveEntry } from "astro:content";
export const prerender = false;
export async function GET({ url }) {
  const { entry, error } = await getLiveEntry("qiitas", { id: url.searchParams.get("id") });
  return Response.json(error ? { error: error.message } : entry,
    { status: error ? (error.name === "LiveEntryNotFoundError" ? 404 : 500) : 200 });
}`);
  delete process.env.QIITA_LIVE_TEST_TOKEN;
  server = await dev({ root: pathToFileURL(`${directory}/`), server: { host: "127.0.0.1", port: 0 }, logLevel: "silent" });
  const base = `http://127.0.0.1:${server.address.port}`;

  await t.test("paginates all articles, parses dates, and renders HTML through the public subpath", async () => {
    state.items = [...Array.from({ length: 100 }, (_, index) => ({ ...article, id: `article-${index}` })),
      { ...article, id: "last-article", title: "Last page article" }];
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/<li(?:\s|>)/g) ?? []).length, 101);
    assert.ok(html.includes("Last page article"));
    assert.ok(html.includes(article.url));
    assert.ok(html.includes(article.rendered_body));
    assert.ok(html.includes(new Date(article.created_at).toISOString()));
    assert.deepEqual(state.requests.map(({ url }) => url.searchParams.get("page")), ["1", "2"]);
    assert.ok(state.requests.every(({ url, authorization }) =>
      url.searchParams.get("per_page") === "100" && url.searchParams.get("query") === "tag:astro" && authorization === undefined));
  });

  await t.test("resolves entries on later pages and reports missing entries", async () => {
    const response = await fetch(`${base}/entry.json?id=last-article`);
    assert.equal(response.status, 200);
    const entry = await response.json();
    assert.equal(entry.id, "last-article");
    assert.equal(entry.rendered.html, article.rendered_body);
    assert.equal((await fetch(`${base}/entry.json?id=missing`)).status, 404);
  });

  await t.test("reflects article changes and token rotation without rebuilding", async () => {
    state.items = [{ ...article, title: "Published after server startup" }];
    process.env.QIITA_LIVE_TEST_TOKEN = "first-test-token";
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("Published after server startup"));
    assert.equal(state.requests.at(-1).authorization, "Bearer first-test-token");
    process.env.QIITA_LIVE_TEST_TOKEN = "rotated-test-token";
    await fetch(`${base}/entry.json?id=${article.id}`);
    assert.equal(state.requests.at(-1).authorization, "Bearer rotated-test-token");
    assert.equal((await fetch(`${base}/collection.json?static`)).status, 200);
    assert.equal(state.requests.at(-1).authorization, "Bearer static-test-token");
  });

  await t.test("returns an empty collection when the API has no articles", async () => {
    state.items = [];
    const response = await fetch(`${base}/collection.json`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.equal((await fetch(`${base}/entry.json?id=missing`)).status, 404);
  });

  await t.test("surfaces HTTP, JSON, validation, and later-page errors instead of partial results", async () => {
    state.status = 429;
    let response = await fetch(`${base}/collection.json`);
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /429/);
    assert.equal((await fetch(`${base}/entry.json?id=missing`)).status, 500);
    state.status = 200;
    state.raw = "{";
    assert.equal((await fetch(`${base}/collection.json`)).status, 500);
    state.raw = JSON.stringify({ message: "Unexpected response" });
    assert.equal((await fetch(`${base}/collection.json`)).status, 500);
    state.raw = undefined;
    state.items = [...Array.from({ length: 100 }, (_, index) => ({ ...article, id: String(index) })),
      { ...article, id: "invalid", created_at: "invalid-date" }];
    response = await fetch(`${base}/collection.json`);
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /created_at/);
    state.items = [article];
    assert.equal((await fetch(`${base}/collection.json`)).status, 200);
  });

  await t.test("aborts a stalled API request after ten seconds", { timeout: 15000 }, async () => {
    state.hang = true;
    const response = await fetch(`${base}/collection.json`, { signal: AbortSignal.timeout(14000) });
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /timeout|aborted/i);
    state.hang = false;
  });
});
