#!/usr/bin/env node
// CLI used by the cloud scheduled tasks. Every command prints JSON.
//   node bin/threads.mjs whoami
//   node bin/threads.mjs check-thread thread.json      (no posting; validates lengths)
//   node bin/threads.mjs publish-thread thread.json    ({"posts":["...", "..."]})
//   node bin/threads.mjs my-posts [limit]
//   node bin/threads.mjs my-replies [limit]           (our replies, incl. on other people's threads)
//   node bin/threads.mjs replies <mediaId>            (direct replies to one post or reply)
//   node bin/threads.mjs conversation <mediaId>
//   node bin/threads.mjs mentions [limit]
//   node bin/threads.mjs search "<keyword>" [limit]
//   node bin/threads.mjs reply <id> "<text>"
//   node bin/threads.mjs hide <replyId>
//   node bin/threads.mjs insights <mediaId>
//   node bin/threads.mjs limits
import { readFileSync } from "node:fs";
import * as T from "../src/threads.mjs";

const [cmd, a, b] = process.argv.slice(2);
const out = (x) => console.log(JSON.stringify(x, null, 2));
const readThread = (file) => {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const posts = Array.isArray(data) ? data : data.posts;
  if (!Array.isArray(posts) || !posts.length) throw new Error(`${file} needs {"posts": [...]}`);
  return posts;
};

const commands = {
  whoami: () => T.me(),
  "check-thread": () => {
    const posts = readThread(a);
    return { ok: T.checkPosts(posts).length === 0, problems: T.checkPosts(posts), bytes: posts.map(T.postLength) };
  },
  "publish-thread": () => T.publishThread(readThread(a), { replyControl: "everyone" }),
  "my-posts": () => T.myPosts({ limit: Number(a) || 25 }),
  "my-replies": () => T.myReplies({ limit: Number(a) || 50 }),
  conversation: () => T.conversation(a),
  replies: () => T.replies(a),
  mentions: () => T.mentions({ limit: Number(a) || 25 }),
  search: () => T.keywordSearch(a, { limit: Number(b) || 25 }),
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
