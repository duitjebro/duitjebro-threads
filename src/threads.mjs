// Duit Je Bro Threads API client (Meta Threads Graph API, graph.threads.com).
// Auth: THREADS_TOKEN env var (local), or, in a Claude cloud environment, a
// network secret on host graph.threads.com that the proxy attaches as an
// Authorization: Bearer header. Leave THREADS_TOKEN unset in the cloud.

const HOST = process.env.THREADS_HOST || "https://graph.threads.com";
const VERSION = "v1.0";
const TOKEN = process.env.THREADS_TOKEN || "";
const MAX_CHARS = 500;
const WAIT_MS = Number(process.env.THREADS_PUBLISH_WAIT_MS ?? 30000); // Meta: wait ~30s before publish

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, params = {}) {
  const url = new URL(`${HOST}/${VERSION}/${path.replace(/^\//, "")}`);
  const body = new URLSearchParams();
  const target = method === "GET" ? url.searchParams : body;
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") target.set(k, String(v));
  }
  const headers = {};
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { method, headers, body: method === "GET" ? undefined : body });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (res.ok) return json;
    const transient = res.status >= 500 || res.status === 429;
    if (!transient || attempt === 3) {
      const msg = json?.error?.message || text.slice(0, 300);
      throw new Error(`Threads API ${method} ${path} -> ${res.status}: ${msg}`);
    }
    await sleep(5000 * attempt);
  }
}

// Threads counts emoji by UTF-8 bytes; use byte length as a safe upper bound.
export function postLength(text) {
  return Buffer.byteLength(text, "utf8");
}

export function checkPosts(posts) {
  const problems = [];
  posts.forEach((t, i) => {
    if (!t || !t.trim()) problems.push(`post ${i + 1} is empty`);
    else if (postLength(t) > MAX_CHARS) problems.push(`post ${i + 1} is ${postLength(t)} bytes (max ${MAX_CHARS})`);
    const links = (t.match(/https?:\/\/|\b[\w-]+\.(?:app|com|my|net|org)\b/g) || []).length;
    if (links > 5) problems.push(`post ${i + 1} has more than 5 links`);
  });
  return problems;
}

export const me = () =>
  call("GET", "me", { fields: "id,username,name,threads_profile_picture_url" });

async function createAndPublish(params) {
  const container = await call("POST", "me/threads", { media_type: "TEXT", ...params });
  if (WAIT_MS) await sleep(WAIT_MS);
  const published = await call("POST", "me/threads_publish", { creation_id: container.id });
  return published.id;
}

export async function publishPost(text, { replyToId, replyControl } = {}) {
  const problems = checkPosts([text]);
  if (problems.length) throw new Error(problems.join("; "));
  const id = await createAndPublish({ text, reply_to_id: replyToId, reply_control: replyControl });
  const info = await call("GET", id, { fields: "id,permalink,timestamp" });
  return info;
}

// A thread = root post plus a chain where each post replies to the previous one.
export async function publishThread(posts, { replyControl } = {}) {
  const problems = checkPosts(posts);
  if (problems.length) throw new Error(problems.join("; "));
  const published = [];
  let parent;
  for (const [i, text] of posts.entries()) {
    try {
      const info = await publishPost(text, { replyToId: parent, replyControl: i === 0 ? replyControl : undefined });
      published.push(info);
      parent = info.id;
    } catch (err) {
      err.message = `Stopped at post ${i + 1}/${posts.length} (${published.length} published). ${err.message}`;
      err.published = published;
      throw err;
    }
  }
  return { root: published[0], posts: published };
}

const REPLY_FIELDS = "id,text,username,timestamp,permalink,is_reply_owned_by_me,replied_to,root_post,has_replies,hide_status";

export const myPosts = ({ limit = 25, since } = {}) =>
  call("GET", "me/threads", { fields: "id,text,timestamp,permalink,is_reply,has_replies", limit, since });

// Our own replies (including those on other people's threads).
export const myReplies = ({ limit = 50 } = {}) =>
  call("GET", "me/replies", { fields: "id,text,timestamp,permalink,root_post,replied_to,has_replies", limit });

export const conversation =(mediaId, { limit = 100 } = {}) =>
  call("GET", `${mediaId}/conversation`, { fields: REPLY_FIELDS, reverse: false, limit });

export const replies = (mediaId, { limit = 100 } = {}) =>
  call("GET", `${mediaId}/replies`, { fields: REPLY_FIELDS, reverse: false, limit });

export const mentions = ({ limit = 25 } = {}) =>
  call("GET", "me/mentions", { fields: "id,text,username,timestamp,permalink,has_replies", limit });

export const keywordSearch = (q, { type = "RECENT", limit = 25, since } = {}) =>
  call("GET", "keyword_search", {
    q, search_type: type, limit, since,
    fields: "id,text,username,timestamp,permalink,has_replies,is_reply",
  });

export const reply = (toId, text) => publishPost(text, { replyToId: toId });

export const hideReply = (replyId, hide = true) => call("POST", `${replyId}/manage_reply`, { hide });

export const insights = (mediaId) =>
  call("GET", `${mediaId}/insights`, { metric: "views,likes,replies,reposts,quotes,shares" });

export const profileInsights = (since, until) =>
  call("GET", "me/threads_insights", { metric: "views,likes,replies,reposts,quotes,followers_count", since, until });

export const publishingLimit = () =>
  call("GET", "me/threads_publishing_limit", { fields: "quota_usage,config,reply_quota_usage,reply_config" });

// Token helpers (need the token in the query string, so they only run locally).
export async function exchangeForLongLived(shortToken, appSecret) {
  const url = new URL(`${HOST}/access_token`);
  url.search = new URLSearchParams({ grant_type: "th_exchange_token", client_secret: appSecret, access_token: shortToken });
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || JSON.stringify(json));
  return json;
}

export async function refreshLongLived(longToken) {
  const url = new URL(`${HOST}/refresh_access_token`);
  url.search = new URLSearchParams({ grant_type: "th_refresh_token", access_token: longToken });
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || JSON.stringify(json));
  return json;
}
