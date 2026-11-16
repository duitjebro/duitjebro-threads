#!/usr/bin/env node
// CLI used by the cloud scheduled tasks. Every command prints JSON.
//   node bin/threads.mjs whoami
//   node bin/threads.mjs diag                         (connection check, prints no secrets)
//   node bin/threads.mjs check-thread thread.json      (no posting; length, banned words, jargon, figures, emojis, CTA)
//   node bin/threads.mjs publish-thread thread.json    ({"posts":["...", "..."]})
//   node bin/threads.mjs my-posts [limit]
//   node bin/threads.mjs my-replies [limit]           (our replies, incl. on other people's threads)
//   node bin/threads.mjs replies <mediaId>            (direct replies to one post or reply)
//   node bin/threads.mjs conversation <mediaId>
//   node bin/threads.mjs mentions [limit]
//   node bin/threads.mjs search "<keyword>" [limit]
//   node bin/threads.mjs author-check <username>      (their posts mentioning takaful/insurance/agent)
//   node bin/threads.mjs reply <id> "<text>"
//   node bin/threads.mjs hide <replyId>
//   node bin/threads.mjs insights <mediaId>
//   node bin/threads.mjs limits
import { readFileSync } from "node:fs";
import * as T from "../src/threads.mjs";
import { checkThread, figures } from "../src/checks.mjs";

const [cmd, a, b] = process.argv.slice(2);
const out = (x) => console.log(JSON.stringify(x, null, 2));
const readThread = (file) => {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const posts = Array.isArray(data) ? data : data.posts;
  if (!Array.isArray(posts) || !posts.length) throw new Error(`${file} needs {"posts": [...]}`);
  return posts;
};

// Thread settings (post count, figure and emoji caps, CTA link) for check-thread.
const threadConfig = () => {
  try { return JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8")).thread || {}; } catch { return {}; }
};

const commands = {
  whoami: () => T.me(),
  // Connection check that never prints secrets: Node version, proxy vs direct, and whether /me answers.
  diag: async () => {
    const proxyVars = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "NO_PROXY", "no_proxy", "NODE_EXTRA_CA_CERTS"]
      .filter((k) => process.env[k]);
    let me;
    try { me = { ok: true, username: (await T.me()).username }; } catch (e) { me = { ok: false, error: e.message }; }
    return { node: process.version, connection: T.via(), proxyVarsSet: proxyVars, threadsTokenEnvSet: Boolean(process.env.THREADS_TOKEN), me };
  },
  // No posting. Mechanical rules only (see src/checks.mjs); run it before every review.
  "check-thread": () => {
    const posts = readThread(a);
    const problems = checkThread(posts, threadConfig());
    return { ok: problems.length === 0, problems, bytes: posts.map(T.postLength), figures: figures(posts) };
  },
  "publish-thread": () => T.publishThread(readThread(a), { replyControl: "everyone" }),
  "my-posts": () => T.myPosts({ limit: Number(a) || 25 }),
  "my-replies": () => T.myReplies({ limit: Number(a) || 50 }),
  conversation: () => T.conversation(a),
  replies: () => T.replies(a),
  mentions: () => T.mentions({ limit: Number(a) || 25 }),
  search: () => T.keywordSearch(a, { limit: Number(b) || 25 }),
  // Does this account post about selling takaful/insurance? Runs several searches limited to that author.
  "author-check": async () => {
    const terms = ["takaful", "insurans", "insurance", "ejen", "agent", "medical card", "hibah", "quotation", "asuransi"];
    const hits = [];
    for (const q of terms) {
      const r = await T.keywordSearch(q, { type: "TOP", limit: 5, author: a });
      for (const p of r.data || []) hits.push({ term: q, text: (p.text || "").slice(0, 200), permalink: p.permalink });
    }
    return { username: a, postsMatching: hits.length, samples: hits.slice(0, 8) };
  },
  reply: () => T.reply(a, b),
  hide: () => T.hideReply(a, true),
  insights: () => T.insights(a),
  limits: () => T.publishingLimit(),
};

if (!commands[cmd]) {
  console.error(`Unknown command "${cmd}". Commands: ${Object.keys(commands).join(", ")}`);
  process.exit(2);
}
try {
  out(await commands[cmd]());
} catch (err) {
  out({ error: err.message, published: err.published });
  process.exit(1);
}
