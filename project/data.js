// Static seed data for the prototype.
// AI tools — each carries its identity color used across calendar, chips, and dashboard.
const TOOLS = [
  { id: "chatgpt",  name: "ChatGPT Team",      short: "GPT",  glyph: "◉", seats: 3, color: "#10a37f", soft: "#e9f6f1" },
  { id: "claude",   name: "Claude Pro",         short: "CLA",  glyph: "✦", seats: 2, color: "#d97757", soft: "#faece4" },
  { id: "midjourney", name: "Midjourney",       short: "MJ",   glyph: "◐", seats: 2, color: "#0b1220", soft: "#e6e7ec" },
  { id: "gemini",   name: "Gemini Advanced",    short: "GEM",  glyph: "◆", seats: 1, color: "#1a73e8", soft: "#e6efff" },
  { id: "cursor",   name: "Cursor Pro",         short: "CUR",  glyph: "❖", seats: 2, color: "#7c3aed", soft: "#efe9fd" },
  { id: "copilot",  name: "GitHub Copilot",     short: "GH",   glyph: "◈", seats: 4, color: "#24292f", soft: "#e8eaed" },
  { id: "runway",   name: "Runway ML",          short: "RW",   glyph: "▶", seats: 1, color: "#22c55e", soft: "#e6f7ec" },
  { id: "eleven",   name: "ElevenLabs",         short: "EL",   glyph: "♪", seats: 1, color: "#ec4899", soft: "#fde7f1" },
];

const USERS = [
  { id: "u1", name: "陳怡君", initials: "陳", role: "產品設計",  avatar: "#8b887e" },
  { id: "u2", name: "林宗翰", initials: "林", role: "工程",      avatar: "#8b887e" },
  { id: "u3", name: "王俊豪", initials: "王", role: "工程",      avatar: "#8b887e" },
  { id: "u4", name: "張雅婷", initials: "張", role: "行銷",      avatar: "#8b887e" },
  { id: "u5", name: "李宜珊", initials: "李", role: "內容",      avatar: "#8b887e" },
  { id: "u6", name: "黃柏翰", initials: "黃", role: "PM",        avatar: "#8b887e" },
  { id: "u7", name: "周品妍", initials: "周", role: "設計",      avatar: "#8b887e" },
];

// Reservation status (預約狀態)
const RES_STATUS = {
  confirmed: { label: "已確認", color: "#0b8a3a", dot: "#22c55e" },
  pending:   { label: "待確認", color: "#a16207", dot: "#eab308" },
  cancelled: { label: "已取消", color: "#9ca3af", dot: "#9ca3af" },
};

// Usage status (使用狀態)
const USE_STATUS = {
  upcoming: { label: "未開始", color: "#475569" },
  active:   { label: "使用中", color: "#0b8a3a" },
  done:     { label: "已結束", color: "#94a3b8" },
};

// --- bookings ---
// Build a month of bookings around "today" (we lock "today" to a fixed date so the demo is stable).
const TODAY = new Date(2026, 4, 25); // 2026-05-25 (month is 0-indexed)
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOffset = (days) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d;
};

// helper: build booking
let _bid = 0;
const mk = (offset, startHour, endHour, toolId, userId, resStatus = "confirmed", useStatus = "upcoming", note = "") => {
  _bid += 1;
  return {
    id: `b${_bid}`,
    date: ymd(dateOffset(offset)),
    startHour,
    endHour, // exclusive; if endHour - startHour >= 8 we treat as full-day-ish
    toolId,
    userId,
    resStatus,
    useStatus,
    note,
  };
};

// A realistic spread: today + ongoing, near future, past completed, all-day blocks, conflicts that fill seats.
const BOOKINGS = [
  // --- TODAY (offset 0) — active usage right now (~14:00 in demo) ---
  mk(0, 9, 12,  "chatgpt", "u1", "confirmed", "done",   "晨間：競品分析資料整理"),
  mk(0, 10, 14, "claude",  "u2", "confirmed", "active", "重構服務層 + 寫測試"),
  mk(0, 13, 17, "cursor",  "u3", "confirmed", "active", "對接 payment SDK"),
  mk(0, 14, 16, "midjourney","u4", "confirmed", "active", "Q3 campaign 視覺探索"),
  mk(0, 15, 18, "chatgpt", "u5", "confirmed", "upcoming","部落格長文撰寫"),
  mk(0, 9, 18,  "copilot", "u6", "confirmed", "active", "全日：sprint 程式 review"),
  mk(0, 16, 18, "gemini",  "u7", "pending",   "upcoming","等待確認：影片腳本"),

  // --- yesterday ---
  mk(-1, 10, 12, "claude",   "u1", "confirmed", "done", "UX flow 整理"),
  mk(-1, 13, 17, "midjourney","u4","confirmed", "done", "icon set 第二輪"),
  mk(-1, 9, 18,  "chatgpt",  "u5", "confirmed", "done", "全日：白皮書草稿"),
  mk(-1, 14, 16, "runway",   "u4", "confirmed", "done", "首頁 hero 影片"),

  // --- 2 days ago ---
  mk(-2, 9, 11,  "cursor",  "u2", "confirmed", "done", "bug-fix sprint"),
  mk(-2, 11, 13, "eleven",  "u5", "confirmed", "done", "podcast intro 配音"),
  mk(-2, 14, 17, "claude",  "u3", "confirmed", "done", ""),

  // --- 3 days ago ---
  mk(-3, 10, 14, "gemini",  "u6", "confirmed", "done", "市場研究"),
  mk(-3, 15, 17, "chatgpt", "u7", "cancelled", "done", "（已取消）會議筆記"),

  // --- 4–6 days ago — scatter ---
  mk(-4, 9, 12,  "chatgpt", "u1", "confirmed", "done", ""),
  mk(-4, 13, 18, "cursor",  "u3", "confirmed", "done", ""),
  mk(-5, 10, 12, "midjourney","u4", "confirmed", "done", ""),
  mk(-5, 14, 17, "claude",  "u2", "confirmed", "done", ""),
  mk(-6, 9, 18,  "copilot", "u6", "confirmed", "done", "全日：code review"),
  mk(-7, 10, 13, "chatgpt", "u5", "confirmed", "done", ""),
  mk(-8, 14, 16, "gemini",  "u7", "confirmed", "done", ""),
  mk(-9, 9, 12,  "claude",  "u1", "confirmed", "done", ""),
  mk(-10, 13, 17,"cursor",  "u2", "confirmed", "done", ""),
  mk(-11, 9, 11, "chatgpt", "u3", "confirmed", "done", ""),
  mk(-12, 14, 17,"midjourney","u4","confirmed", "done", ""),
  mk(-14, 10, 12,"runway",  "u4", "confirmed", "done", ""),

  // --- tomorrow (offset +1) ---
  mk(1, 9, 11,   "chatgpt", "u1", "confirmed", "upcoming","設計評審準備"),
  mk(1, 10, 14,  "claude",  "u2", "confirmed", "upcoming","技術文件撰寫"),
  mk(1, 13, 16,  "cursor",  "u3", "confirmed", "upcoming",""),
  mk(1, 14, 17,  "midjourney","u4","pending",  "upcoming","等待 art director 確認"),
  mk(1, 9, 18,   "copilot", "u6", "confirmed", "upcoming","全日"),
  mk(1, 15, 17,  "gemini",  "u7", "confirmed", "upcoming",""),

  // --- 2-7 days ahead ---
  mk(2, 9, 12,   "chatgpt", "u5", "confirmed", "upcoming","內容策略 brainstorm"),
  mk(2, 13, 18,  "claude",  "u1", "confirmed", "upcoming",""),
  mk(2, 10, 16,  "cursor",  "u3", "confirmed", "upcoming","新功能 spike"),
  mk(2, 14, 17,  "eleven",  "u5", "pending",   "upcoming","配音素材"),
  mk(3, 9, 18,   "midjourney","u4","confirmed","upcoming","全日：品牌視覺日"),
  mk(3, 10, 13,  "chatgpt", "u6", "confirmed", "upcoming",""),
  mk(3, 14, 17,  "claude",  "u2", "confirmed", "upcoming",""),
  mk(4, 9, 12,   "gemini",  "u7", "confirmed", "upcoming","市場簡報"),
  mk(4, 13, 17,  "copilot", "u3", "confirmed", "upcoming",""),
  mk(4, 10, 14,  "chatgpt", "u1", "confirmed", "upcoming",""),
  mk(5, 9, 18,   "claude",  "u2", "confirmed", "upcoming","全日：架構文件"),
  mk(5, 14, 16,  "runway",  "u4", "pending",   "upcoming","片頭動畫測試"),
  mk(6, 10, 12,  "chatgpt", "u5", "confirmed", "upcoming",""),
  mk(7, 9, 17,   "cursor",  "u3", "confirmed", "upcoming","全日：feature freeze 前衝刺"),
  mk(7, 13, 16,  "midjourney","u4","confirmed","upcoming",""),
  mk(8, 10, 14,  "claude",  "u1", "confirmed", "upcoming",""),
  mk(9, 9, 12,   "chatgpt", "u6", "confirmed", "upcoming",""),
  mk(10, 14, 18, "gemini",  "u7", "confirmed", "upcoming",""),
  mk(11, 9, 18,  "copilot", "u6", "confirmed", "upcoming","全日"),
  mk(12, 10, 13, "chatgpt", "u5", "confirmed", "upcoming",""),
  mk(13, 14, 17, "claude",  "u2", "confirmed", "upcoming",""),
  mk(14, 9, 12,  "midjourney","u4","pending",  "upcoming",""),
  mk(15, 10, 14, "cursor",  "u3", "confirmed", "upcoming",""),
  mk(16, 9, 18,  "chatgpt", "u1", "confirmed", "upcoming","全日：年度回顧"),
];

// --- Historical bookings (12 weeks back) for the stats heatmap.
// Seeded so the demo is stable.
function seedRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}
const rnd = seedRand(42);
for (let offset = -90; offset <= -15; offset++) {
  const d = dateOffset(offset);
  const dow = d.getDay();
  // Sparse weekends
  if ((dow === 0 || dow === 6) && rnd() > 0.18) continue;
  // 1–5 bookings per day, weighted
  const n = Math.max(1, Math.floor(rnd() * 5) + (rnd() > 0.45 ? 1 : 0));
  for (let i = 0; i < n; i++) {
    const tool = TOOLS[Math.floor(rnd() * TOOLS.length)];
    const user = USERS[Math.floor(rnd() * USERS.length)];
    const start = 9 + Math.floor(rnd() * 7);
    const dur = 1 + Math.floor(rnd() * 4);
    const end = Math.min(18, start + dur);
    if (end <= start) continue;
    const cancelled = rnd() > 0.96;
    BOOKINGS.push(mk(offset, start, end, tool.id, user.id,
      cancelled ? "cancelled" : "confirmed", "done", ""));
  }
}

window.AI_DATA = { TOOLS, USERS, RES_STATUS, USE_STATUS, BOOKINGS, TODAY, ymd, pad };
