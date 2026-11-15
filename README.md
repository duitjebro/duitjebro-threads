# Duit Je Bro Threads Autopilot

Posts 6 threads of 4-5 posts a day (up to 30 posts) and replies to comments, mentions and relevant public posts, 24/7, with no PC switched on.

## How it fits together

| Part | What | Cost |
|---|---|---|
| Brain | `.claude/skills/threads-autopilot` (your thread-writer voice, auto mode) | your Claude plan |
| Hands | `bin/threads.mjs` CLI + `mcp/server.mjs` MCP server, Meta Threads API | free |
| Clock | 3 Claude cloud scheduled tasks at claude.ai/code/routines | your Claude plan |
| Memory | DuitJeBro CRM Google Sheet (Topic Ledger, Pain Points, Bot Log, Performance) | free |
| Code home | private GitHub repo | free |

## Setup (one time, about 45 minutes)

### A. GitHub (free)
1. Sign up at github.com.
2. Create a **private** repo named `duitjebro-threads`.
3. Upload this folder to it (Claude can do this step for you once you are signed in).
4. At claude.ai/code, connect your GitHub account when asked.

### B. Meta developer app
1. Go to developers.facebook.com, log in with the Facebook account linked to the Duit Je Bro Instagram.
2. **Create app**, then choose the **Access the Threads API** use case.
3. In the use case **Permissions**, add: `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_read_replies`, `threads_manage_mentions`, `threads_keyword_search`, `threads_manage_insights`.
4. **App roles → Roles → Add Threads Tester** → `duitjebro`. On Threads: Settings → Account → Website permissions → Invites → accept.
5. Note the **Threads app ID** and **Threads app secret** (App settings → Basic).

> Without Meta's **App Review** (advanced access), keyword search only finds your own posts and mentions only show testers. Posting and replying to comments under your own threads work straight away. To join other people's posts, submit App Review for `threads_keyword_search` and `threads_manage_mentions` (needs business verification and a short screen recording).

### C. Get the 60-day token
1. In the app's **Settings**, put `https://duitjebro.netlify.app/` in **Redirect callback URLs**, **Uninstall callback URL** and **Delete callback URL**, then **Save**.
2. On your PC, in this folder, in your own terminal: `node scripts/token.mjs`
   It asks for the app ID and secret, opens the Threads login, and you paste back the address you land on.
   It saves the 60-day token to `.env` (never uploaded) and prints it once.
3. Before 50 days are up: `node scripts/token.mjs refresh`, then update the secret in step D.

### D. Cloud environment
At claude.ai/code → environment settings → **Add environment** named `duitjebro-bot`:
- **Network access:** Full (the writer researches news sites).
- **Network secrets → Add secret:** type **Bearer**, allowed website `graph.threads.com`, header `Authorization` with prefix `Bearer`, value = just the token.
  If the first test says the token is missing, delete that secret and instead set an environment variable `THREADS_TOKEN=<your token>`.

### E. Google Sheet tabs
In the DuitJeBro CRM sheet, add tabs with these header rows:
- `Pain Points`: Description, Who, Phrasing, Source link, Article read, Used on
- `Bot Log`: Timestamp, Type, Target id, Username, Text, Link, Notes
- `Performance`: Date, Topic, Pillar, Views, Likes, Replies, Reposts, Quotes, Shares
Copy the current pain-point bank into `Pain Points`.

### F. Scheduled tasks
At claude.ai/code/routines, create three tasks, each with repo `duitjebro-threads`, environment `duitjebro-bot`, and connectors **Google Sheets** and **Claude Docs** only:

| Task | Prompt file | Schedule (cron, UTC) | Malaysia time |
|---|---|---|---|
| DJB thread | `routines/daily-thread.md` | `30 0,3,5,8,12,14 * * *` | 8:30am, 11:30am, 1:30pm, 4:30pm, 8:30pm, 10:30pm (6 threads x 4-5 posts = up to 30 posts) |
| DJB engage | `routines/engage.md` | `0 0,3,6,9,12,15 * * *` | 8am, 11am, 2pm, 5pm, 8pm, 11pm |
| DJB weekly report | `routines/weekly-report.md` | `0 2 * * 0` | Sunday 10am |

Paste the text of each prompt file as the task prompt. Press **Run now** on each once to test.

## Settings
Edit `config.json`: posts per thread, keywords, reply caps. Voice and safety rules are in `.claude/skills/threads-autopilot/SKILL.md`.

## Local use (optional)
`.mcp.json` registers the Threads MCP server, so Claude on your PC can post, read replies and check insights when opened in this folder (needs `THREADS_TOKEN` set).

## Test
`npm test` runs against a fake Threads server and never posts.
