// Mechanical checks for a Duit Je Bro thread (Job 1). Pure functions, no network.
// These run BEFORE the reviewer so the reviewer only judges what needs judgment
// (hooks, emotion, compliance). Rules come from knowledge/review-sheet.md.

const MAX_BYTES = 500;

// [pattern, what is wrong + what to write instead]
const BANNED = [
  [/\b(kitorang|kitaorang|kami)\b/i, 'writer says "saya", never kitorang/kami'],
  [/\bcontoh\b/i, '"contoh" (use Bayangkan / kalau / lebih kurang)'],
  [/info umum|angka bayangan|bukan angka rasmi|terma penuh|dokumen polisi|bukan nasihat/i, "disclaimer line"],
  [/\bpremium\b/i, '"premium" (use caruman)'],
  [/\b(dilaporkan|bermula|sekitar)\b/i, 'stiff news word (use "news ada cakap", "start", "lebih kurang")'],
  [/\bpay\s?later\b/, '"Pay Later" is two words with capitals'],
  [/\bPayLater\b/i, '"Pay Later" is two words'],
];

// Threads never name an operator, brand or plan.
const BRANDS = [
  /\betiqa\b/i, /\bAIA\b/, /\bprudential\b/i, /\bpru\s?bsn\b/i, /\bgreat eastern\b/i, /\ballianz\b/i,
  /\bzurich\b/i, /\btakaful ikhlas\b/i, /\bsyarikat takaful\b/i, /\bmanulife\b/i, /\btokio marine\b/i,
  /\bammetlife\b/i, /\bFWD\b/, /\bsun life\b/i, /\bgenerali\b/i, /\bMSIG\b/, /\bAXA\b/, /\btune protect\b/i,
];

// Finance jargon a makcik at the pasar would not understand, with the plain way to say it.
const JARGON = [
  [/\bco-?(takaful|payment|insurance|insurans)\b/i, "bahagian bil yang you kena bayar sendiri"],
  [/\bdeductible\b/i, "bahagian bil yang you kena bayar sendiri"],
  [/\bsum (covered|assured|insured)\b/i, "jumlah duit yang family dapat"],
  [/\bnominee\b/i, "orang yang you namakan untuk terima duit"],
  [/\b(beneficiary|benefisiari)\b/i, "orang yang terima duit"],
  [/\b(mortality|morbidity|underwriting|liquidity|kecairan|portfolio|annuity|anuiti)\b/i, "say it in everyday words"],
  [/\binvestment[- ]linked\b/i, "plan yang ada simpanan sekali"],
  [/\brider\b/i, "tambahan pada plan"],
  [/\b(waiting period|tempoh menunggu)\b/i, "kena tunggu beberapa bulan dulu baru boleh claim"],
  [/\b(exclusions?|pengecualian)\b/i, "ada benda yang dia tak tanggung"],
  [/\bpre-?existing\b/i, "penyakit yang dah ada sebelum ambil plan"],
  [/\b(surrender value|cash value|nilai tunai)\b/i, "duit yang dapat balik kalau berhenti awal"],
  [/\b(tabarru'?|wakalah|mudharabah)\b/i, "say it in everyday words"],
  [/\bitemi[sz]ed\b/i, "bil yang ada senarai satu-satu"],
  [/\bmark-?up\b/i, "harga dinaikkan"],
  [/\b(ILP|TPD|PAC|MHIT|CI)\b/, "no acronyms: say it in plain words"],
  [/\bBNPL\b/, "Pay Later"],
];

const LABEL = /^\s*(hook|relatable|agitate|empathy|tips?|reframe|cta|step\s*\d+|post\s*\d+)\s*[:：-]/i;

// Money amounts, percentages and big counts. Small everyday counts ("3 anak", "6 bulan") are not figures.
const FIGURE = /RM\s?\d[\d.,]*(?:\s?(?:k|ribu|juta|bilion|billion)\b)?|\d[\d.,]*\s?(?:%|peratus\b)|\d[\d.,]*\s?(?:ribu|juta|bilion|billion)\b|\b\d{1,3}(?:,\d{3})+\b/gi;

export const postLength = (text) => Buffer.byteLength(text, "utf8");

export function figures(posts) {
  const found = new Set();
  for (const t of posts) {
    for (const m of t.match(FIGURE) || []) found.add(m.toLowerCase().replace(/\s+/g, "").replace(/[.,]+$/, ""));
  }
  return [...found];
}

export function emojiCount(text) {
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  let n = 0;
  for (const { segment } of seg.segment(text)) if (/\p{Extended_Pictographic}/u.test(segment)) n++;
  return n;
}

export function checkThread(posts, thread = {}) {
  const {
    minPostsPerThread = 4, maxPostsPerThread = 5, maxFigures = 2, maxEmojisPerPost = 3,
    ctaLink = "duitjebro.netlify.app/?src=threads", signOff = "Duit Je Bro",
  } = thread;
  const problems = [];
  const say = (i, msg) => problems.push(`post ${i + 1}: ${msg}`);

  if (posts.length < minPostsPerThread || posts.length > maxPostsPerThread) {
    problems.push(`thread has ${posts.length} posts (needs ${minPostsPerThread}-${maxPostsPerThread})`);
  }

  posts.forEach((t, i) => {
    if (!t || !t.trim()) return say(i, "is empty");
    if (postLength(t) > MAX_BYTES) say(i, `is ${postLength(t)} bytes (max ${MAX_BYTES})`);
    for (const [re, why] of BANNED) if (re.test(t)) say(i, `"${t.match(re)[0]}" - ${why}`);
    for (const re of BRANDS) if (re.test(t)) say(i, `"${t.match(re)[0]}" - threads never name an operator, brand or plan`);
    for (const [re, plain] of JARGON) if (re.test(t)) say(i, `jargon "${t.match(re)[0]}" - say: ${plain}`);
    const lines = t.split("\n");
    for (const line of lines) if (LABEL.test(line)) say(i, `section label "${line.trim().slice(0, 30)}" - no labels, one flowing story`);
    const first = lines.find((l) => l.trim()) || "";
    if (/^\s*nanti\b/i.test(first) && !/\bkalau\b/i.test(first)) say(i, 'opener "Nanti ..." needs "kalau" (never a worst case as certain)');
    const emojis = emojiCount(t);
    if (emojis > maxEmojisPerPost) say(i, `has ${emojis} emojis (max ${maxEmojisPerPost}, 👉🏻 counts)`);
    for (const m of t.match(/duitjebro\.netlify\.app\S*/gi) || []) {
      if (m !== ctaLink) say(i, `link "${m}" must be exactly ${ctaLink}`);
    }
  });

  // One voice per thread (Arman, 17 Nov 2026): saya + you/korang, or aku + kau/korang. Never mixed.
  const all = posts.join("\n");
  const akuKau = all.match(/\b(aku|kau)\b/i);
  const sayaYou = all.match(/\b(saya|you)\b/i);
  if (akuKau && sayaYou) {
    problems.push(`voice: mixes "${akuKau[0]}" with "${sayaYou[0]}" (one voice per thread: saya + you/korang, or aku + kau/korang)`);
  }

  const figs = figures(posts);
  if (figs.length > maxFigures) {
    problems.push(`thread has ${figs.length} different money/percent figures (${figs.join(", ")}); max ${maxFigures}: 20% facts, 80% emotion`);
  }

  const last = posts[posts.length - 1] || "";
  const lastLines = last.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lastLines.includes(`👉🏻 ${ctaLink}`)) problems.push(`last post needs the line "👉🏻 ${ctaLink}" on its own`);
  if (lastLines[lastLines.length - 1] !== signOff) problems.push(`last post must end with exactly "${signOff}"`);

  return problems;
}
