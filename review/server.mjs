#!/usr/bin/env node
// Local screen for recording the Meta App Review screencasts.
// Run on your own PC (uses the token in .env):  node review/server.mjs
// Then open http://127.0.0.1:5178 . Only listens on this computer.
import { createServer } from "node:http";
import * as T from "../src/threads.mjs";

const PORT = Number(process.env.PORT || 5178);

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Duit Je Bro Threads Tool</title>
<style>
  body{margin:0;background:#f6f5fb;color:#1d1b26;font:15px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif}
  header{background:#2d1f73;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  header b{font-size:17px} #acct{font-size:14px;opacity:.9}
  nav{display:flex;gap:8px;padding:12px 20px 0}
  nav button{border:0;background:#e3def7;color:#2d1f73;padding:8px 14px;border-radius:8px 8px 0 0;font-weight:600;cursor:pointer}
  nav button.on{background:#fff}
  section{background:#fff;margin:0 20px 20px;padding:18px;border-radius:0 10px 10px 10px;display:none} section.on{display:block}
  .row{display:flex;gap:8px;flex-wrap:wrap} input,textarea{font:inherit;padding:8px 10px;border:1px solid #c9c4dc;border-radius:8px}
  input{flex:1;min-width:200px} textarea{width:100%;box-sizing:border-box;min-height:70px;margin-top:8px}
  .btn{background:#5b3fd1;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}
  .card{border:1px solid #e3def7;border-radius:10px;padding:12px;margin-top:12px}
  .meta{color:#5d5a6b;font-size:13px} .ok{color:#137a3a;font-weight:600} .err{color:#b3261e;font-weight:600}
  p.note{color:#5d5a6b;font-size:13px;margin:6px 0 0}
</style></head><body>
<header><b>Duit Je Bro Threads Tool</b><span id="acct">Connecting…</span></header>
<nav><button data-t="search" class="on">Keyword search</button><button data-t="mentions">Mentions</button></nav>
<section id="search" class="on">
  <div class="row"><input id="q" value="takaful" aria-label="Keyword"><button class="btn" id="go">Search public posts</button></div>
  <p class="note">Uses threads_keyword_search to find recent public posts about takaful, medical cards and money problems.</p>
  <div id="sres"></div>
</section>
<section id="mentions">
  <button class="btn" id="loadm">Load mentions of @duit.jebro</button>
  <p class="note">Uses threads_manage_mentions to read posts that mention our account, so we can reply.</p>
  <div id="mres"></div>
</section>
<script>
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button,section").forEach(e=>e.classList.remove("on"));
  b.classList.add("on");$("#"+b.dataset.t).classList.add("on");});
async function api(p,opt){const r=await fetch(p,opt);const j=await r.json();if(j.error)throw new Error(j.error);return j;}
api("/api/me").then(m=>$("#acct").textContent="Signed in as @"+m.username).catch(e=>$("#acct").textContent=e.message);
function render(list,box){
  box.innerHTML=list.length?"":'<p class="meta">No posts found.</p>';
  for(const p of list){
    const d=document.createElement("div");d.className="card";
    d.innerHTML='<div class="meta">@'+esc(p.username)+' · '+esc((p.timestamp||"").replace("T"," ").slice(0,16))+
      (p.permalink?' · <a href="'+esc(p.permalink)+'" target="_blank" rel="noopener">open on Threads</a>':"")+'</div>'+
      '<div>'+esc(p.text)+'</div><textarea placeholder="Write a reply from @duit.jebro"></textarea>'+
      '<div class="row" style="margin-top:8px"><button class="btn">Publish reply</button><span class="st"></span></div>';
    const st=d.querySelector(".st");
    d.querySelector("button").onclick=async()=>{
      const text=d.querySelector("textarea").value.trim();if(!text){st.textContent="Write a reply first.";return;}
      st.textContent="Publishing… (about 30 seconds)";st.className="st meta";
      try{const r=await api("/api/reply",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:p.id,text})});
        st.innerHTML='Reply published. <a href="'+esc(r.permalink)+'" target="_blank" rel="noopener">View</a>';st.className="st ok";}
      catch(e){st.textContent=e.message;st.className="st err";}};
    box.appendChild(d);}
}
$("#go").onclick=async()=>{const box=$("#sres");box.innerHTML='<p class="meta">Searching…</p>';
  try{render((await api("/api/search?q="+encodeURIComponent($("#q").value))).data||[],box);}catch(e){box.innerHTML='<p class="err">'+esc(e.message)+'</p>';}};
$("#loadm").onclick=async()=>{const box=$("#mres");box.innerHTML='<p class="meta">Loading…</p>';
  try{render((await api("/api/mentions")).data||[],box);}catch(e){box.innerHTML='<p class="err">'+esc(e.message)+'</p>';}};
</script></body></html>`;

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type + "; charset=utf-8" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    if (url.pathname === "/") return send(res, 200, page, "text/html");
    if (url.pathname === "/api/me") return send(res, 200, await T.me());
    if (url.pathname === "/api/search") return send(res, 200, await T.keywordSearch(url.searchParams.get("q") || "takaful", { limit: 25 }));
    if (url.pathname === "/api/mentions") return send(res, 200, await T.mentions({ limit: 25 }));
    if (url.pathname === "/api/reply" && req.method === "POST") {
      let raw = ""; for await (const c of req) raw += c;
      const { id, text } = JSON.parse(raw || "{}");
      if (!id || !text) return send(res, 400, { error: "id and text are required" });
      return send(res, 200, await T.reply(id, text));
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 200, { error: e.message });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Review screen: http://127.0.0.1:${PORT}`));
