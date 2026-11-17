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
process.env.THREADS_DIRECT = "1"; // the fake server is local: never go through a proxy
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

const { checkThread, figures, emojiCount } = await import("../src/checks.mjs");
const good = [
  "Kalau you TAKDE esok, siapa bayar sewa rumah? 😬\n\nGaji masuk, bil keluar. Itu rutin you tiap bulan kan?",
  "Bayangkan anak you tanya kenapa kena pindah rumah.\n\nBukan sebab you tak sayang. Sebab takde siapa ganti gaji you.",
  "Saya faham, bulan-bulan pun dah ketat.\n\nMula dengan satu benda je: tulis semua bil tetap you.",
  "Protection ni bukan kos.\n\nIni cara you cakap sayang kat family, walaupun you dah takde.",
  "Follow saya untuk tip duit macam ni.\n\n👉🏻 duitjebro.netlify.app/?src=threads\n\nFamily you tahu tak nak buat apa kalau jadi apa-apa? 😅\n\nDuit Je Bro",
];

test("checkThread passes a clean thread", () => {
  assert.deepEqual(checkThread(good), []);
});

test("checkThread catches voice, brand, jargon, labels and stiff words", () => {
  const bad = (text) => checkThread([text, ...good.slice(1)]).join(" | ");
  assert.match(bad("Kitorang faham."), /saya/);
  assert.match(bad("Aku dah cakap."), /voice: mixes/);
  assert.deepEqual(checkThread(["Kau dah cakap. Aku pun.", "Gaji kau habis?", "Korang pernah?", "Follow aku.\n\n👉🏻 duitjebro.netlify.app/?src=threads\n\nDuit Je Bro"]), []);
  assert.match(bad("Etiqa ada plan."), /never name/);
  assert.match(bad("Plan AIA pun sama."), /never name/);
  assert.match(bad("Ada deductible RM500."), /jargon/);
  assert.match(bad("Check waiting period dulu."), /jargon/);
  assert.match(bad("Hook: Gaji you habis?"), /section label/);
  assert.match(bad("Nanti gaji you jadi separuh."), /kalau/);
  assert.match(bad("Sekitar 3 bulan je."), /stiff/);
  assert.match(bad("Info umum sahaja."), /disclaimer/);
  assert.equal(checkThread(["Nanti kalau gaji you jadi separuh, macam mana?", ...good.slice(1)]).length, 0);
});

test("checkThread caps figures at 2 and emojis at 3 per post", () => {
  assert.deepEqual(figures(["Gaji RM3,000, sewa RM800.", "Gaji RM3,000 tu 48% je. 3 anak, 6 bulan."]), ["rm3,000", "rm800", "48%"]);
  assert.match(checkThread(["Gaji RM3,000, sewa RM800, 48% orang.", ...good.slice(1)]).join(), /3 different money\/percent figures/);
  assert.equal(emojiCount("👉🏻 ok 😬😅"), 3);
  assert.match(checkThread(["Wei 😬😅💀🔥", ...good.slice(1)]).join(), /4 emojis/);
});

test("checkThread enforces post count, CTA link line and sign-off", () => {
  assert.match(checkThread(good.slice(0, 3)).join(), /needs 4-5/);
  const noTag = [...good.slice(0, 4), good[4].replace("/?src=threads", "")];
  assert.match(checkThread(noTag).join(" | "), /must be exactly/);
  const noSign = [...good.slice(0, 4), good[4].replace("\n\nDuit Je Bro", "")];
  assert.match(checkThread(noSign).join(), /must end with exactly/);
});

test.after(() => server.close());
