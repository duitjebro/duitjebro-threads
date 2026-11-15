# Meta App Review: step by step

**Goal:** advanced access for `threads_keyword_search`, so the bot can find strangers' posts, and for `threads_manage_mentions`, so it sees every mention of @duit.jebro, not only testers'.
Your other permissions (posting and replies on your own account) already work and need no review.

Do the steps in order. Each one says who does it.

---

## Step 1. Put the privacy pages online (you, 3 min)
1. Open app.netlify.com, then your **duitjebro** site, then the **Deploys** tab.
2. Drag the whole `app-review/netlify-deploy` folder onto the box that says "drag and drop your site output folder here".
   - The folder holds your current live page, unchanged, plus `privacy.html` and `data-deletion.html`. Your landing page stays exactly as it is now.
3. Check that these two links open:
   - https://duitjebro.netlify.app/privacy.html
   - https://duitjebro.netlify.app/data-deletion.html

## Step 2. App settings (you, 5 min)
In developers.facebook.com, go to **My Apps**, open your app, then **App settings → Basic**:

| Field | What to enter |
|---|---|
| App icon | Your Duit Je Bro logo or profile picture: square, 512–1024 px, PNG or JPG |
| Privacy Policy URL | `https://duitjebro.netlify.app/privacy.html` |
| User data deletion | choose "Data deletion instructions URL", then enter `https://duitjebro.netlify.app/data-deletion.html` |
| Category | Business and Pages (or Utility if that is not listed) |
| Contact email | your email |

Click **Save changes**.

In the Threads use case **Settings** (where you set the redirect URL before), put the same data-deletion link in **Delete callback URL**. Keep `https://duitjebro.netlify.app/` in Redirect and Uninstall.

## Step 3. Business verification (you, only if the dashboard asks)
If App Review shows "Business verification required", follow its link. Use your SSM registration or your agency details, and have an IC and a business document ready. Meta usually takes 1–5 working days. If the dashboard does not ask for it, skip this step.

## Step 4. Record two short screen videos (you, 10 min)
On your PC, in the `8. Threads autopilot` folder, open PowerShell and run:

```
node review/server.mjs
```

Open http://127.0.0.1:5178 in Chrome. Record with the **Windows key + Alt + R** shortcut (Xbox Game Bar) or the Snipping Tool's video mode. Keep each video under 2 minutes, in English, with no voice needed.

**Video 1: threads_keyword_search**
1. Start with the Threads login screen to show how the account connects. Run `node scripts/token.mjs` in a second PowerShell window. When the Threads permission screen opens, let the camera see it, click Allow, then stop there. You do not need to paste the code back.
2. Switch to the review screen. The header shows "Signed in as @duit.jebro".
3. On the **Keyword search** tab, type `takaful` and click **Search public posts**. Wait for the results.
4. On one result, type a short reply, for example "Hi, what kind of cover are you looking for?", and click **Publish reply**. Wait for "Reply published", click **View**, and show the reply on Threads.
   - Use one of your own posts for this demo, so you do not reply to a stranger before approval.
5. Stop recording.

**Video 2: threads_manage_mentions**
1. Before you record, ask a friend to post on Threads with "@duit.jebro" in it, or post one from a second account of your own.
2. Record: open the review screen, click the **Mentions** tab, then **Load mentions of @duit.jebro**.
3. Type a reply to the mention, click **Publish reply**, then click **View** to show it on Threads.
4. Stop recording.

Until Meta approves, mentions only show accounts that are Threads Testers on your app, so the friend's account may not appear yet. If it doesn't, add that account as a Threads Tester first (App roles → Roles), the same way you added duit.jebro.

## Step 5. Request the permissions (you, 10 min; copy the text below)
Go to **App Review → Permissions and Features** (or the Threads use case's **Permissions** list). Next to each permission, click **Request advanced access**, then fill in the form.

### threads_keyword_search
**How will your app use this permission?**
> Duit Je Bro (@duit.jebro) is a personal finance and takaful (Islamic insurance) awareness account in Malaysia, run by a licensed takaful agent. This app is used only by our own Threads account; members of the public do not log in to it.
>
> We use threads_keyword_search to find recent public posts where people in Malaysia ask about takaful, medical cards, hibah or money problems, using search terms such as "takaful", "medical card" and "hibah". For a relevant post, the app reads the post text and the author's username, skips accounts that sell insurance, and publishes a short reply from @duit.jebro that asks about the person's situation, says we are an Etiqa Agent, and offers a link to a form if they want more information.
>
> Replies are drafted with AI assistance under fixed rules and published automatically. They are rate limited: at most one reply per post, two per person per day, and 100 per day in total. We store only a log of the posts we replied to (post ID, username, our reply, link), kept for up to 12 months. Anyone can ask us to delete their data or stop replying, as described in our data deletion instructions.

**Screencast:** upload Video 1.

### threads_manage_mentions
**How will your app use this permission?**
> Duit Je Bro (@duit.jebro) is a personal finance and takaful awareness account in Malaysia. This app is used only by our own Threads account.
>
> We use threads_manage_mentions to read public posts that mention @duit.jebro, for example when someone tags us in a question about medical cards or family protection, so we can reply from @duit.jebro and answer them. Replies are drafted with AI assistance under fixed rules and published automatically, at most one reply per mention. We log only the mention ID, username, our reply and link, kept for up to 12 months.

**Screencast:** upload Video 2.

**Testing instructions (if asked):**
> This is a server-side tool for our own Threads account (@duit.jebro). There is no public login. The screencasts show the full flow: Threads login and permission screen, then the keyword search or mentions list, then publishing a reply and viewing it on Threads.

Click **Submit for review**.

## Step 6. Publish the app (you, 1 min)
If the dashboard says the app must be **Published / Live** before the review, go to **Publish** in the left menu and click **Publish**.

## Step 7. Wait, then tell Claude "check Meta"
You will get an email when the review is done, usually within a few days to 2 weeks, and you can also see the status under **App Review → Requests**. Once the review is approved:
- Claude runs a test search to confirm that strangers' posts now come back.
- Claude switches on the hourly "join conversations" job.

If Meta rejects it, paste the rejection reason to Claude. The usual fixes are a clearer video or a clearer description.
