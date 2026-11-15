#!/usr/bin/env node
// Threads MCP server (stdio). Lets Claude (desktop or cloud) post and engage on Threads.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as T from "../src/threads.mjs";

const server = new McpServer({ name: "threads-duitjebro", version: "1.0.0" });

const tool = (name, description, shape, fn) =>
  server.tool(name, description, shape, async (args) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await fn(args), null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: err.message, published: err.published }) }] };
    }
  });

tool("whoami", "The connected Threads account.", {}, () => T.me());

tool("check_thread", "Validate a thread before posting (500-byte limit per post, link count). Posts nothing.",
  { posts: z.array(z.string()).min(1) },
  ({ posts }) => ({ problems: T.checkPosts(posts), bytes: posts.map(T.postLength) }));

tool("publish_thread", "Publish a multi-post thread: first post is the root, each next post replies to the previous one. Takes ~35s per post.",
  { posts: z.array(z.string()).min(1) },
  ({ posts }) => T.publishThread(posts, { replyControl: "everyone" }));

tool("publish_post", "Publish one standalone text post.", { text: z.string() }, ({ text }) => T.publishPost(text));

tool("my_posts", "Recent posts by the account.", { limit: z.number().int().max(100).optional() },
  ({ limit }) => T.myPosts({ limit }));

tool("conversation", "All replies at every depth under one of our root posts, with is_reply_owned_by_me.",
  { media_id: z.string() }, ({ media_id }) => T.conversation(media_id));

tool("mentions", "Public posts that mention the account.", { limit: z.number().int().max(100).optional() },
  ({ limit }) => T.mentions({ limit }));

tool("keyword_search", "Search recent public posts by keyword.",
  { q: z.string(), limit: z.number().int().max(100).optional() },
  ({ q, limit }) => T.keywordSearch(q, { limit }));

tool("reply", "Reply to a post or reply by id.", { reply_to_id: z.string(), text: z.string() },
  ({ reply_to_id, text }) => T.reply(reply_to_id, text));

tool("hide_reply", "Hide a reply under one of our posts (spam, scams, abuse).", { reply_id: z.string() },
  ({ reply_id }) => T.hideReply(reply_id, true));

tool("insights", "Views, likes, replies, reposts, quotes, shares of one post.", { media_id: z.string() },
  ({ media_id }) => T.insights(media_id));

tool("publishing_limit", "How much of the 24h posting and reply quota is used.", {}, () => T.publishingLimit());

await server.connect(new StdioServerTransport());
