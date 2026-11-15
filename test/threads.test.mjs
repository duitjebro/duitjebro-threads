// Runs against a fake Threads server; never touches the real account.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const calls = [];
let n = 0;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    const params = Object.fromEntries(new URLSearchParams(body || url.search));
    calls.push({ method: req.method, path: url.pathname, params, auth: req.headers.authorization });
    res.setHeader("content-type", "application/json");
    if (url.pathname.endsWith("/me/threads") && req.method === "POST") return res.end(JSON.stringify({ id: `c${++n}` }));
    if (url.pathname.endsWith("/threads_publish")) return res.end(JSON.stringify({ id: `m${params.creation_id.slice(1)}` }));
    if (url.pathname.match(/\/v1\.0\/m\d+$/)) {
      const id = url.pathname.split("/").pop();
      return res.end(JSON.stringify({ id, permalink: `https://threads.com/p/${id}` }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { message: "nope" } }));
  });
});
await new Promise((r) => server.listen(0, r));
process.env.THREADS_HOST = `http://127.0.0.1:${server.address().port}`;
process.env.THREADS_PUBLISH_WAIT_MS = "0";
process.env.THREADS_TOKEN = "test-token";
const T = await import("../src/threads.mjs");

test("publishThread chains each post as a reply to the previous one", async () => {
  const r = await T.publishThread(["one", "two", "three"], { replyControl: "everyone" });
  assert.equal(r.posts.length, 3);
  const creates = calls.filter((c) => c.path.endsWith("/me/threads"));
  assert.equal(creates[0].params.reply_to_id, undefined);
  assert.equal(creates[0].params.reply_control, "everyone");
  assert.equal(creates[1].params.reply_to_id, r.posts[0].id);
  assert.equal(creates[2].params.reply_to_id, r.posts[1].id);
  assert.equal(creates[1].params.reply_control, undefined);
  assert.ok(calls.every((c) => c.auth === "Bearer test-token"));
});

test("checkPosts rejects posts over 500 bytes, counting emoji as bytes", () => {
  assert.deepEqual(T.checkPosts(["ok"]), []);
  assert.equal(T.checkPosts(["a".repeat(501)]).length, 1);
  assert.equal(T.checkPosts(["😳".repeat(126)]).length, 1); // 126 x 4 bytes = 504
  assert.equal(T.checkPosts([""]).length, 1);
});

test("API errors surface Meta's message", async () => {
  await assert.rejects(() => T.insights("zzz"), /404: nope/);
});

test.after(() => server.close());
