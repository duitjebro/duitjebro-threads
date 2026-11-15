#!/usr/bin/env node
// Run on your own PC only. Never commit tokens.
//   node scripts/token.mjs exchange <SHORT_LIVED_TOKEN> <APP_SECRET>   -> 60-day token
//   node scripts/token.mjs refresh  <LONG_LIVED_TOKEN>                  -> fresh 60 days
// Then paste the new token into the cloud environment's network secret.
import { exchangeForLongLived, refreshLongLived } from "../src/threads.mjs";

const [cmd, token, secret] = process.argv.slice(2);
try {
  const res = cmd === "exchange" ? await exchangeForLongLived(token, secret)
    : cmd === "refresh" ? await refreshLongLived(token)
    : null;
  if (!res) throw new Error("Use: exchange <short_token> <app_secret> | refresh <long_token>");
  const days = Math.floor((res.expires_in || 0) / 86400);
  const expires = new Date(Date.now() + (res.expires_in || 0) * 1000).toISOString().slice(0, 10);
  console.log(`\nNew token (valid ${days} days, until ${expires}):\n\n${res.access_token}\n`);
  console.log("Set a reminder to refresh it before", new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10));
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
