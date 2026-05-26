// 統計檢視 — Overview / By Tool / By User
// KPI tiles + GitHub-style heatmap, with time-range filter and per-entity small multiples.

const { useState: useS3, useMemo: useM3 } = React;

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

// Build the heatmap matrix anchored to "today": 13 columns × 7 rows (Sun→Sat),
// where the rightmost column contains today.
function buildHeatmap(bookings, anchorDate, weeks = 13, filterFn = () => true) {
  const totalDays = weeks * 7;
  const lastSat = new Date(anchorDate);
  lastSat.setDate(lastSat.getDate() + (6 - lastSat.getDay())); // upcoming Saturday
  const start = new Date(lastSat); start.setDate(start.getDate() - totalDays + 1);

  const cells = []; // index by [col][row]
  const dayMap = {};
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = window.AI_DATA.ymd(d);
    dayMap[key] = { date: d, key, total: 0, byTool: {}, count: 0 };
  }
  for (const b of bookings) {
    if (b.resStatus === "cancelled") continue;
    if (!filterFn(b)) continue;
    const cell = dayMap[b.date];
    if (!cell) continue;
    const h = b.endHour - b.startHour;
    cell.total += h;
    cell.byTool[b.toolId] = (cell.byTool[b.toolId] || 0) + h;
    cell.count += 1;
  }
  // arrange in column-major (week columns)
  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const i = w * 7 + r;
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = window.AI_DATA.ymd(d);
      col.push(dayMap[key]);
    }
    grid.push(col);
  }
  return { grid, start, end: lastSat, dayMap, totalDays };
}

function computeStats(bookings, filterFn = () => true, range = "all", anchor) {
  const todayKey = window.AI_DATA.ymd(anchor);
  let cutoff = null;
  if (range === "30d") { const d = new Date(anchor); d.setDate(d.getDate() - 29); cutoff = window.AI_DATA.ymd(d); }
  if (range === "7d")  { const d = new Date(anchor); d.setDate(d.getDate() - 6);  cutoff = window.AI_DATA.ymd(d); }
  const list = bookings.filter((b) =>
    b.resStatus !== "cancelled" &&
    filterFn(b) &&
    (cutoff ? b.date >= cutoff : true) &&
    b.date <= todayKey
  );

  const sessions = list.length;
  const hours = list.reduce((s, b) => s + (b.endHour - b.startHour), 0);
  const days = new Set(list.map((b) => b.date));
  const activeDays = days.size;
  const avgLen = sessions ? +(hours / sessions).toFixed(1) : 0;

  // peak hour
  const hourBuckets = new Array(24).fill(0);
  for (const b of list) for (let h = b.startHour; h < b.endHour; h++) hourBuckets[h] += 1;
  const peakHour = hourBuckets.reduce((best, v, i) => v > hourBuckets[best] ? i : best, 9);
  const peakHasData = hourBuckets[peakHour] > 0;

  // favorite tool
  const toolHours = {};
  for (const b of list) toolHours[b.toolId] = (toolHours[b.toolId] || 0) + (b.endHour - b.startHour);
  const favTool = Object.entries(toolHours).sort((a, b) => b[1] - a[1])[0]?.[0];

  // favorite user
  const userHours = {};
  for (const b of list) userHours[b.userId] = (userHours[b.userId] || 0) + (b.endHour - b.startHour);
  const favUser = Object.entries(userHours).sort((a, b) => b[1] - a[1])[0]?.[0];

  // streaks (from today back, using days set)
  const allDaysList = Array.from(days).sort();
  let curStreak = 0;
  {
    const d = new Date(anchor);
    while (days.has(window.AI_DATA.ymd(d))) {
      curStreak += 1;
      d.setDate(d.getDate() - 1);
    }
  }
  let longest = 0; let run = 0; let prev = null;
  for (const k of allDaysList) {
    const d = new Date(k);
    if (prev) {
      const diff = (d - prev) / 86400000;
      if (diff === 1) run += 1;
      else run = 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { sessions, hours, activeDays, avgLen, peakHour, peakHasData,
           curStreak, longest, favTool, favUser, toolHours, userHours };
}

function StatTile({ label, value, unit, sub, accent }) {
  return (
    <div className={`stile ${accent ? "is-accent" : ""}`}>
      <div className="stile__label">{label}</div>
      <div className="stile__value">
        <span>{value === null || value === undefined ? "—" : value}</span>
        {unit && value !== "—" && value !== null && value !== undefined && <span className="stile__unit">{unit}</span>}
      </div>
      {sub && <div className="stile__sub">{sub}</div>}
    </div>
  );
}

// A 13-week × 7-day heatmap. Color either by total hours (mono ramp) or by dominant tool.
function Heatmap({ data, color, mode = "mono", tools, onHover }) {
  // Find max for normalisation
  let max = 1;
  for (const col of data.grid) for (const c of col) if (c && c.total > max) max = c.total;

  const intensity = (v) => {
    if (!v) return 0;
    return Math.min(1, 0.18 + 0.82 * (v / max));
  };

  const monthLabels = useM3(() => {
    const labels = [];
    let lastMonth = -1;
    for (let w = 0; w < data.grid.length; w++) {
      const firstDay = data.grid[w][0];
      const m = firstDay.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ w, label: `${m + 1}月` });
        lastMonth = m;
      }
    }
    return labels;
  }, [data]);

  const todayKey = window.AI_DATA.ymd(window.AI_DATA.TODAY);

  return (
    <div className="hmap">
      <div className="hmap__months">
        {monthLabels.map((m) => (
          <span key={m.w} className="hmap__month" style={{ left: `calc(${m.w} * (var(--cell) + 3px) + 22px)` }}>{m.label}</span>
        ))}
      </div>
      <div className="hmap__body">
        <div className="hmap__dow">
          {["", "一", "", "三", "", "五", ""].map((d, i) => (
            <span key={i} className="hmap__dow-lbl">{d}</span>
          ))}
        </div>
        <div className="hmap__grid">
          {data.grid.map((col, ci) => (
            <div key={ci} className="hmap__col">
              {col.map((cell, ri) => {
                if (!cell) return <span key={ri} className="hmap__cell is-empty" />;
                const isFuture = cell.key > todayKey;
                const isToday = cell.key === todayKey;
                const v = intensity(cell.total);
                let bg = "transparent";
                if (cell.total > 0 && mode === "mono") {
                  bg = `color-mix(in oklab, ${color} ${Math.round(v * 100)}%, var(--surface-2))`;
                } else if (cell.total > 0 && mode === "tools") {
                  // pick dominant tool color
                  const top = Object.entries(cell.byTool).sort((a, b) => b[1] - a[1])[0];
                  const t = tools.find((x) => x.id === top[0]);
                  bg = `color-mix(in oklab, ${t.color} ${Math.round(v * 100)}%, var(--surface-2))`;
                }
                return (
                  <span
                    key={ri}
                    className={`hmap__cell ${cell.total > 0 ? "is-on" : ""} ${isFuture ? "is-future" : ""} ${isToday ? "is-today" : ""}`}
                    style={{ background: cell.total > 0 ? bg : undefined }}
                    title={`${cell.date.getMonth()+1}/${cell.date.getDate()} · ${cell.total}h · ${cell.count} 筆`}
                    onMouseEnter={() => onHover && onHover(cell)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="hmap__legend">
        <span>少</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((v, i) => (
          <span key={i} className="hmap__lcell" style={{
            background: `color-mix(in oklab, ${color} ${Math.round(v * 100)}%, var(--surface-2))`,
          }} />
        ))}
        <span>多</span>
        <span className="hmap__legend-spacer" />
        <span>共 {data.totalDays} 天</span>
      </div>
    </div>
  );
}

function HourDistribution({ bookings, filterFn, color }) {
  const hours = Array.from({ length: 10 }, (_, i) => 9 + i);
  const counts = hours.map((h) => bookings.filter((b) =>
    b.resStatus !== "cancelled" && filterFn(b) && b.startHour <= h && b.endHour > h
  ).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="hourdist">
      {hours.map((h, i) => (
        <div key={h} className="hourdist__col">
          <div className="hourdist__bar" style={{
            height: `${(counts[i] / max) * 100}%`,
            background: color,
          }} title={`${h}:00 · ${counts[i]} 筆`}/>
          <div className="hourdist__lbl">{h}</div>
        </div>
      ))}
    </div>
  );
}

function StatsView({ tools, users, bookings, today }) {
  const [tab, setTab] = useS3("overview");
  const [range, setRange] = useS3("all");

  const filterByTab = () => true; // overview uses all

  return (
    <div className="stats">
      <div className="stats__topbar">
        <div className="stats__tabs">
          <button className={tab === "overview" ? "is-on" : ""} onClick={() => setTab("overview")}>總覽</button>
          <button className={tab === "tool" ? "is-on" : ""} onClick={() => setTab("tool")}>依工具</button>
          <button className={tab === "user" ? "is-on" : ""} onClick={() => setTab("user")}>依使用者</button>
        </div>
        <div className="stats__range seg">
          <button className={range === "all" ? "is-on" : ""} onClick={() => setRange("all")}>全部</button>
          <button className={range === "30d" ? "is-on" : ""} onClick={() => setRange("30d")}>30 天</button>
          <button className={range === "7d" ? "is-on" : ""} onClick={() => setRange("7d")}>7 天</button>
        </div>
      </div>

      <div className="stats__scroll">
        {tab === "overview" && <OverviewPane bookings={bookings} tools={tools} users={users} today={today} range={range} />}
        {tab === "tool"     && <SmallMultiples kind="tool"  entities={tools} bookings={bookings} tools={tools} users={users} today={today} range={range} />}
        {tab === "user"     && <SmallMultiples kind="user"  entities={users} bookings={bookings} tools={tools} users={users} today={today} range={range} />}
      </div>
    </div>
  );
}

function OverviewPane({ bookings, tools, users, today, range }) {
  const [selectedToolId, setSelectedToolId] = useS3(null); // null = all tools
  const heatmapFilter = selectedToolId ? (b) => b.toolId === selectedToolId : () => true;

  const stats = useM3(() => computeStats(bookings, () => true, range, today), [bookings, range, today]);
  const heatmap = useM3(() => buildHeatmap(bookings, today, 13, heatmapFilter), [bookings, today, selectedToolId]);
  const favTool = tools.find((t) => t.id === stats.favTool);
  const favUser = users.find((u) => u.id === stats.favUser);

  const selectedTool = selectedToolId ? tools.find((t) => t.id === selectedToolId) : null;
  const heatmapColor = selectedTool ? selectedTool.color : "#6b6a64";
  const heatmapHours = bookings
    .filter((b) => b.resStatus !== "cancelled" && heatmapFilter(b))
    .reduce((s, b) => s + (b.endHour - b.startHour), 0);

  const sortedTools = tools.map((t) => ({ ...t, hours: stats.toolHours[t.id] || 0 }))
    .sort((a, b) => b.hours - a.hours);
  const totalH = sortedTools.reduce((s, t) => s + t.hours, 0) || 1;

  return (
    <div className="pane">
      <div className="stats__tiles">
        <StatTile label="總預約數" value={stats.sessions} unit="筆" />
        <StatTile label="總使用時數" value={stats.hours} unit="h" />
        <StatTile label="平均時長" value={stats.avgLen} unit="h" />
        <StatTile label="活躍天數" value={stats.activeDays} unit="天" />
        <StatTile label="目前連續" value={stats.curStreak} unit="天" />
        <StatTile label="最長連續" value={stats.longest} unit="天" />
        <StatTile
          label="尖峰時段"
          value={stats.peakHasData ? `${String(stats.peakHour).padStart(2,"0")}:00` : "—"}
        />
        <StatTile
          label="主力工具"
          value={favTool ? favTool.short : "—"}
          sub={favTool && favTool.name}
        />
      </div>

      <div className="card">
        <div className="card__head">
          <h3>使用熱度</h3>
          <span className="muted">{selectedTool ? `${selectedTool.name} · ${heatmapHours}h` : `全部工具 · ${heatmapHours}h`}</span>
        </div>
        <div className="tool-filter">
          <button
            className={`tool-filter__chip ${!selectedToolId ? "is-on" : ""}`}
            onClick={() => setSelectedToolId(null)}
          >
            <span className="tool-filter__dot tool-filter__dot--all" />
            全部
          </button>
          {tools.map((t) => {
            const on = selectedToolId === t.id;
            return (
              <button
                key={t.id}
                className={`tool-filter__chip ${on ? "is-on" : ""}`}
                onClick={() => setSelectedToolId(t.id)}
                style={on ? { "--c": t.color, borderColor: t.color, color: t.color, background: t.soft } : {}}
              >
                <span className="tool-filter__dot" style={{ background: t.color }} />
                {t.short}
              </button>
            );
          })}
        </div>
        <Heatmap data={heatmap} color={heatmapColor} mode="mono" tools={tools} />
      </div>

      <div className="dual">
        <div className="card">
          <div className="card__head">
            <h3>工具使用佔比</h3>
            <span className="muted">{stats.hours} 小時</span>
          </div>
          <div className="stack-bar">
            {sortedTools.filter((t) => t.hours).map((t) => (
              <div key={t.id} className="stack-bar__seg" style={{
                flex: t.hours, background: t.color,
              }} title={`${t.name} · ${t.hours}h`} />
            ))}
          </div>
          <div className="legend-list">
            {sortedTools.filter((t) => t.hours).map((t) => (
              <div key={t.id} className="legend-list__row">
                <span className="legend-list__dot" style={{ background: t.color }} />
                <span className="legend-list__name">{t.name}</span>
                <span className="legend-list__pct">{Math.round((t.hours / totalH) * 100)}%</span>
                <span className="legend-list__hrs">{t.hours}h</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <h3>時段分布</h3>
            <span className="muted">09:00 – 18:00</span>
          </div>
          <HourDistribution bookings={bookings} filterFn={() => true} color="#4f46e5" />
        </div>
      </div>
    </div>
  );
}

function SmallMultiples({ kind, entities, bookings, tools, users, today, range }) {
  const [focusId, setFocusId] = useS3(null);

  const cards = entities.map((e) => {
    const filterFn = (b) => kind === "tool" ? b.toolId === e.id : b.userId === e.id;
    const stats = computeStats(bookings, filterFn, range, today);
    const hm = buildHeatmap(bookings, today, 13, filterFn);
    const color = kind === "tool" ? e.color : (e.avatar || "#4f46e5");
    return { e, stats, hm, color, filterFn };
  });

  // Sort by hours desc
  cards.sort((a, b) => b.stats.hours - a.stats.hours);

  const focused = focusId ? cards.find((c) => c.e.id === focusId) : null;

  return (
    <div className="pane">
      {focused && (
        <FocusPane card={focused} kind={kind} tools={tools} users={users}
                   bookings={bookings} today={today} onClose={() => setFocusId(null)} />
      )}
      <div className="sm-grid">
        {cards.map((c) => (
          <button
            key={c.e.id}
            className="sm-card"
            onClick={() => setFocusId(c.e.id)}
            style={{ "--c": c.color }}
          >
            <div className="sm-card__head">
              {kind === "tool" ? (
                <>
                  <span className="sm-card__dot" style={{ background: c.color }} />
                  <span className="sm-card__name">{c.e.name}</span>
                  <span className="sm-card__sub">{c.e.short}</span>
                </>
              ) : (
                <>
                  <span className="sm-card__avatar" style={{ background: c.color }}>{c.e.initials}</span>
                  <div className="sm-card__id">
                    <div className="sm-card__name">{c.e.name}</div>
                    <div className="sm-card__sub">{c.e.role}</div>
                  </div>
                </>
              )}
              <div className="sm-card__nums">
                <div className="sm-card__hours">{c.stats.hours}<span>h</span></div>
                <div className="sm-card__sess">{c.stats.sessions} 筆</div>
              </div>
            </div>
            <div className="sm-card__mini">
              <Heatmap data={c.hm} color={c.color} mode="mono" tools={tools} />
            </div>
            <div className="sm-card__foot">
              <span>活躍 {c.stats.activeDays} 天</span>
              <span>·</span>
              <span>連續 {c.stats.curStreak} 天</span>
              <span>·</span>
              <span>尖峰 {c.stats.peakHasData ? `${String(c.stats.peakHour).padStart(2,"0")}:00` : "—"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusPane({ card, kind, tools, users, bookings, today, onClose }) {
  const { e, stats, hm, color, filterFn } = card;
  const otherSide = kind === "tool" ? users : tools;
  const otherKey = kind === "tool" ? "userId" : "toolId";
  const otherHours = {};
  for (const b of bookings) {
    if (b.resStatus === "cancelled") continue;
    if (!filterFn(b)) continue;
    otherHours[b[otherKey]] = (otherHours[b[otherKey]] || 0) + (b.endHour - b.startHour);
  }
  const otherRanked = otherSide
    .map((x) => ({ ...x, hours: otherHours[x.id] || 0 }))
    .filter((x) => x.hours)
    .sort((a, b) => b.hours - a.hours);
  const maxOther = Math.max(1, ...otherRanked.map((x) => x.hours));

  return (
    <div className="focus">
      <div className="focus__head">
        <div className="focus__title">
          {kind === "tool" ? (
            <>
              <span className="focus__swatch" style={{ background: color }} />
              <h2>{e.name}</h2>
              <span className="focus__meta">{e.short} · {e.seats} 座位</span>
            </>
          ) : (
            <>
              <span className="focus__avatar" style={{ background: color }}>{e.initials}</span>
              <h2>{e.name}</h2>
              <span className="focus__meta">{e.role}</span>
            </>
          )}
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="關閉">✕</button>
      </div>

      <div className="stats__tiles">
        <StatTile label="總預約" value={stats.sessions} unit="筆" />
        <StatTile label="總時數" value={stats.hours} unit="h" />
        <StatTile label="平均時長" value={stats.avgLen} unit="h" />
        <StatTile label="活躍天數" value={stats.activeDays} unit="天" />
        <StatTile label="目前連續" value={stats.curStreak} unit="天" />
        <StatTile label="最長連續" value={stats.longest} unit="天" />
        <StatTile label="尖峰時段" value={stats.peakHasData ? `${String(stats.peakHour).padStart(2,"0")}:00` : "—"} />
        <StatTile
          label={kind === "tool" ? "主要使用者" : "主力工具"}
          value={kind === "tool"
            ? (users.find((u) => u.id === stats.favUser)?.name || "—")
            : (tools.find((t) => t.id === stats.favTool)?.short || "—")}
        />
      </div>

      <div className="card">
        <div className="card__head">
          <h3>使用熱度</h3>
          <span className="muted">過去 13 週</span>
        </div>
        <Heatmap data={hm} color={color} mode="mono" tools={tools} />
      </div>

      <div className="dual">
        <div className="card">
          <div className="card__head">
            <h3>{kind === "tool" ? "誰在用" : "用什麼"}</h3>
            <span className="muted">{otherRanked.length} 項</span>
          </div>
          <div className="bar-list">
            {otherRanked.map((x) => (
              <div key={x.id} className="bar">
                <div className="bar__label">
                  {kind === "tool" ? (
                    <>
                      <span className="mini-avatar" style={{ background: x.avatar }}>{x.initials}</span>
                      <span className="bar__name" style={{ fontFamily: "var(--font-sans)" }}>{x.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="bar__dot" style={{ background: x.color }} />
                      <span className="bar__name">{x.short}</span>
                    </>
                  )}
                </div>
                <div className="bar__track">
                  <div className="bar__fill" style={{
                    width: `${(x.hours / maxOther) * 100}%`,
                    background: kind === "tool" ? x.avatar : x.color,
                  }} />
                </div>
                <div className="bar__value">{x.hours}h</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head"><h3>時段分布</h3><span className="muted">09:00 – 18:00</span></div>
          <HourDistribution bookings={bookings} filterFn={filterFn} color={color} />
        </div>
      </div>
    </div>
  );
}

window.StatsView = StatsView;
