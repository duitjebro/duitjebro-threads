#!/usr/bin/env node
// Run on your own PC only, in your own terminal. Never paste tokens into chat.
//   node scripts/token.mjs          -> log in with Threads, get a 60-day token, save it to .env
//   node scripts/token.mjs refresh  -> refresh the token in .env for another 60 days
// .env is git-ignored. After either command, paste the token into the cloud
// environment's network secret (README step D).
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { exec } from "node:child_process";

const REDIRECT = "https://duitjebro.netlify.app/";
const SCOPES = [
  "threads_basic", "threads_content_publish", "threads_manage_replies", "threads_read_replies",
  "threads_manage_mentions", "threads_keyword_search", "threads_manage_insights",
].join(",");
const GRAPH = "https://graph.threads.com";
const ENV = new URL("../.env", import.meta.url);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(q)).trim();

async function getJson(url, init) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || JSON.stringify(json));
  return json;
}

function readEnv() {
  if (!existsSync(ENV)) return {};
  return Object.fromEntries(readFileSync(ENV, "utf8").split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
}

function saveEnv(values) {
  const env = { ...readEnv(), ...values };
  writeFileSync(ENV, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

async function check(token) {
  const me = await getJson(`${GRAPH}/v1.0/me?fields=id,username`, { headers: { Authorization: `Bearer ${token}` } });
  console.log(`\nConnected to Threads as @${me.username} (Bearer header works).`);
}

function finish(res) {
  const expires = new Date(Date.now() + res.expires_in * 1000).toISOString().slice(0, 10);
  const remind = new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
  saveEnv({ THREADS_TOKEN: res.access_token, THREADS_TOKEN_EXPIRES: expires });
  console.log(`\nSaved to .env. Valid until ${expires}. Refresh before ${remind}:  node scripts/token.mjs refresh`);
  console.log(`\nToken (copy it into the cloud network secret, nowhere else):\n\n${res.access_token}\n`);
}

try {
  if (process.argv[2] === "refresh") {
    const token = readEnv().THREADS_TOKEN;
    if (!token) throw new Error("No THREADS_TOKEN in .env. Run: node scripts/token.mjs");
    const res = await getJson(`${GRAPH}/refresh_access_token?` +
      new URLSearchParams({ grant_type: "th_refresh_token", access_token: token }));
    finish(res);
    await check(res.access_token);
  } else {
    const appId = readEnv().THREADS_APP_ID || await ask("Threads app ID: ");
    const secret = await ask("Threads app secret (stays on this PC): ");
    saveEnv({ THREADS_APP_ID: appId });

    const authUrl = "https://threads.com/oauth/authorize?" + new URLSearchParams({
      client_id: appId, redirect_uri: REDIRECT, scope: SCOPES, response_type: "code",
    });
    console.log(`\nOpening Threads login. If nothing opens, paste this into your browser:\n\n${authUrl}\n`);
    exec(`start "" "${authUrl}"`);
    console.log("Log in as @duitjebro and press Allow. You will land on duitjebro.netlify.app.");
    const landed = await ask("Copy the FULL address from the browser bar and paste it here: ");
    const code = (new URL(landed).searchParams.get("code") || "").replace(/#_$/, "");
    if (!code) throw new Error("No ?code= in that address. Try again.");

    const short = await getJson(`${GRAPH}/oauth/access_token`, {
      method: "POST",
      body: new URLSearchParams({ client_id: appId, client_secret: secret, code, grant_type: "authorization_code", redirect_uri: REDIRECT }),
    });
    const long = await getJson(`${GRAPH}/access_token?` + new URLSearchParams({
      grant_type: "th_exchange_token", client_secret: secret, access_token: short.access_token,
    }));
    finish(long);
    await check(long.access_token);
  }
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
