// Calendar — Month view (C: compact agenda) + Week view (B: tool swimlanes).
// Bookings click → onSelectBooking. Empty cell click → onCreate(date, hour, toolId?).

const { useMemo, useState, useRef } = React;

// 4-category status palette
const CAL_STATUS = {
  active:   { c: "#0d8a36", s: "#dcf4e3", label: "使用中" },
  upcoming: { c: "#1e6cff", s: "#e3edff", label: "未使用" },
  booked:   { c: "#b97309", s: "#fcf0d6", label: "已預約" },
  done:     { c: "#7a7973", s: "#ebe9e2", label: "已結束" },
};
function calStatusCat(b, todayKey) {
  if (b.useStatus === "active") return "active";
  if (b.useStatus === "done") return "done";
  return b.date === todayKey ? "upcoming" : "booked";
}
window.CAL_STATUS = CAL_STATUS;
window.calStatusCat = calStatusCat;

function startOfMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const d = new Date(first);
  d.setDate(d.getDate() - first.getDay());
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9 → 18
const HOUR_SEGMENTS = 9; // 9–18 = 9 one-hour segments

// =============================================================
// MonthView (C-style: hour-coverage bar + compact full-text chips)
// =============================================================
function MonthView({ date, bookings, tools, users, today, onCreate, onSelectBooking, onOpenDay }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const gridStart = startOfMonthGrid(year, month);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const todayKey = window.AI_DATA.ymd(today);
  const byDay = useMemo(() => {
    const m = {};
    for (const b of bookings) (m[b.date] ||= []).push(b);
    return m;
  }, [bookings]);

  const [hover, setHover] = useState(null);
  const dismissTimer = useRef(null);
  const enterCell = (key, listLen, ev) => {
    if (listLen === 0) { clearTimeout(dismissTimer.current); setHover(null); return; }
    clearTimeout(dismissTimer.current);
    const rect = ev.currentTarget.getBoundingClientRect();
    setHover({ key, rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } });
  };
  const scheduleDismiss = () => {
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setHover(null), 140);
  };
  const cancelDismiss = () => clearTimeout(dismissTimer.current);

  return (
    <div className="cal-month">
      <div className="cal-month__head">
        {WEEKDAYS.map((d) => <div key={d} className="cal-month__hday">週{d}</div>)}
      </div>
      <div className="cal-month__grid">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const key = window.AI_DATA.ymd(d);
          const isToday = key === todayKey;
          const list = (byDay[key] || []).slice().sort((a, b) => a.startHour - b.startHour);
          const active = list.filter((b) => b.resStatus !== "cancelled");
          // Build a tool-breakdown bar (same style as hover card): one segment per tool,
          // sized proportional to total booked hours that day.
          const byTool = {};
          for (const b of active) byTool[b.toolId] = (byTool[b.toolId] || 0) + (b.endHour - b.startHour);
          const breakdown = Object.entries(byTool)
            .map(([id, h]) => ({ color: tools.find((t) => t.id === id)?.color, h }))
            .filter((x) => x.color)
            .sort((a, b) => b.h - a.h);
          const visible = list.slice(0, 3);
          const overflow = list.length - visible.length;
          return (
            <div
              key={i}
              className={`cal-month__cell ${inMonth ? "" : "is-out"} ${isToday ? "is-today" : ""} ${hover && hover.key === key ? "is-hover" : ""}`}
              onClick={(e) => { if (e.target === e.currentTarget) onOpenDay && onOpenDay(key); }}
              onMouseEnter={(e) => enterCell(key, list.length, e)}
              onMouseLeave={scheduleDismiss}
            >
              <div className="cal-month__date">
                <button
                  className={isToday ? "cal-month__num is-today" : "cal-month__num"}
                  onClick={(e) => { e.stopPropagation(); onOpenDay && onOpenDay(key); }}
                  aria-label="查看當日詳情"
                >
                  {d.getDate()}
                </button>
                {list.length > 0 && (
                  <span className="cal-month__count" title={`${list.length} 筆預約`}>
                    {list.length}
                  </span>
                )}
              </div>

              {/* Tool-breakdown bar — same style as the hover card */}
              {breakdown.length > 0 && (
                <div className="cal-month__cov" aria-hidden="true">
                  {breakdown.map((x, idx) => (
                    <span
                      key={idx}
                      style={{ flex: x.h, background: x.color }}
                      title={`${x.h}h`}
                    />
                  ))}
                </div>
              )}

              <div className="cal-month__chips">
                {visible.map((b) => {
                  const tool = tools.find((t) => t.id === b.toolId);
                  const user = users.find((u) => u.id === b.userId);
                  const isFullDay = b.endHour - b.startHour >= 8;
                  const isCancelled = b.resStatus === "cancelled";
                  const cat = calStatusCat(b, todayKey);
                  const sc = CAL_STATUS[cat];
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                      className={`mchip is-${cat} ${isCancelled ? "is-cancelled" : ""} ${b.resStatus === "pending" ? "is-pending" : ""}`}
                      style={{ "--c": sc.c, "--s": sc.s }}
                      title={`${String(b.startHour).padStart(2,"0")}–${String(b.endHour).padStart(2,"0")} · ${tool.name} · ${user.name} · ${sc.label}`}
                    >
                      <span className="mchip__logo">{tool.glyph}</span>
                      <span className="mchip__name">
                        {isFullDay ? "全日 " : ""}{tool.short}
                      </span>
                      {b.useStatus === "active" && <span className="mchip__live" />}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <button
                    className="cal-month__more"
                    onClick={(e) => { e.stopPropagation(); onOpenDay && onOpenDay(key); }}
                  >
                    + {overflow} 筆
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hover && byDay[hover.key] && (
        <DayHoverCard
          dateKey={hover.key}
          anchor={hover.rect}
          bookings={byDay[hover.key]}
          tools={tools} users={users}
          today={today}
          onMouseEnter={cancelDismiss}
          onMouseLeave={scheduleDismiss}
          onOpenDay={() => { setHover(null); onOpenDay && onOpenDay(hover.key); }}
          onSelectBooking={(b) => { setHover(null); onSelectBooking(b); }}
        />
      )}
    </div>
  );
}

// =============================================================
// DayHoverCard — preserved from before
// =============================================================
function DayHoverCard({ dateKey, anchor, bookings, tools, users, today, onMouseEnter, onMouseLeave, onOpenDay, onSelectBooking }) {
  const date = new Date(dateKey);
  const list = bookings.slice().sort((a, b) => a.startHour - b.startHour);
  const active = list.filter((b) => b.resStatus !== "cancelled");
  const totalH = active.reduce((s, b) => s + (b.endHour - b.startHour), 0);
  const todayKey = window.AI_DATA.ymd(today);
  const isToday = dateKey === todayKey;
  const dowLabel = ["日","一","二","三","四","五","六"][date.getDay()];

  const CARD_W = 320;
  const GAP = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placeLeft = anchor.right + GAP + CARD_W > vw - 8;
  const left = placeLeft
    ? Math.max(8, anchor.left - CARD_W - GAP)
    : anchor.right + GAP;
  const estH = Math.min(vh - 16, 110 + list.length * 44);
  const top = Math.max(8, Math.min(vh - estH - 8, anchor.top));

  const byTool = {};
  for (const b of active) byTool[b.toolId] = (byTool[b.toolId] || 0) + (b.endHour - b.startHour);
  const breakdown = Object.entries(byTool)
    .map(([id, h]) => ({ tool: tools.find((t) => t.id === id), h }))
    .sort((a, b) => b.h - a.h);

  return (
    <div
      className="hover-card"
      style={{ left: `${left}px`, top: `${top}px`, width: `${CARD_W}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="hover-card__head">
        <span className={`hover-card__num ${isToday ? "is-today" : ""}`}>{date.getDate()}</span>
        <div className="hover-card__head-main">
          <div className="hover-card__title">
            {date.getMonth() + 1} 月 {date.getDate()} 日
            <span className="hover-card__dow">週{dowLabel}</span>
          </div>
          <div className="hover-card__meta">
            {list.length} 筆預約 · 共 {totalH} 小時
          </div>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="hover-card__bar">
          {breakdown.map(({ tool, h }) => (
            <span key={tool.id} style={{ flex: h, background: tool.color }} title={`${tool.name} · ${h}h`} />
          ))}
        </div>
      )}

      <div className="hover-card__list">
        {list.map((b) => {
          const tool = tools.find((t) => t.id === b.toolId);
          const user = users.find((u) => u.id === b.userId);
          const isFull = b.endHour - b.startHour >= 8;
          const isCancelled = b.resStatus === "cancelled";
          const cat = calStatusCat(b, window.AI_DATA.ymd(today));
          const sc = CAL_STATUS[cat];
          return (
            <button
              key={b.id}
              className={`hover-row is-${cat} ${isCancelled ? "is-cancelled" : ""}`}
              style={{ "--c": sc.c, "--s": sc.s, "--tc": tool.color }}
              onClick={() => onSelectBooking(b)}
            >
              <span className="hover-row__time">
                {isFull ? "全日" : `${String(b.startHour).padStart(2,"0")}–${String(b.endHour).padStart(2,"0")}`}
              </span>
              <span className="hover-row__bar" />
              <span className="hover-row__logo">{tool.glyph}</span>
              <span className="hover-row__tool">{tool.short}</span>
              <span className="hover-row__avatar">{user.initials}</span>
              <span className="hover-row__user">{user.name}</span>
              <span className="hover-row__cat">{sc.label}</span>
            </button>
          );
        })}
      </div>

      <button className="hover-card__foot" onClick={onOpenDay}>
        查看完整詳情 →
      </button>
    </div>
  );
}

// =============================================================
// WeekView (B-style: tool swimlanes — each tool a row, days as columns)
// =============================================================
function WeekView({ date, bookings, tools, users, today, onCreate, onSelectBooking }) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayKey = window.AI_DATA.ymd(today);

  // Per (toolId, dateKey) → list of bookings
  const matrix = useMemo(() => {
    const m = {};
    for (const b of bookings) {
      const k = `${b.toolId}|${b.date}`;
      (m[k] ||= []).push(b);
    }
    return m;
  }, [bookings]);

  return (
    <div className="swim">
      {/* Sticky header — corner + day headers */}
      <div className="swim__head">
        <div className="swim__corner">
          <span className="swim__corner-lbl">工具</span>
          <span className="swim__corner-arrow">↓ 工具 ／ 日期 →</span>
        </div>
        {days.map((d, i) => {
          const isToday = window.AI_DATA.ymd(d) === todayKey;
          return (
            <div key={i} className={`swim__hday ${isToday ? "is-today" : ""}`}>
              <div className="swim__hday-w">週{WEEKDAYS[d.getDay()]}</div>
              <div className="swim__hday-d">{d.getDate()}</div>
              {/* Hour scale ticks inside header */}
              <div className="swim__hday-ticks">
                <span>9</span><span>12</span><span>15</span><span>18</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool rows */}
      <div className="swim__body">
        {tools.map((tool) => {
          // Sum hours of this tool this week (for the label)
          const weekHours = days.reduce((s, d) => {
            const list = matrix[`${tool.id}|${window.AI_DATA.ymd(d)}`] || [];
            return s + list.filter((b) => b.resStatus !== "cancelled")
                        .reduce((ss, b) => ss + (b.endHour - b.startHour), 0);
          }, 0);
          return (
            <div key={tool.id} className="swim__row">
              <div className="swim__label">
                <span className="swim__logo">{tool.glyph}</span>
                <div className="swim__lbl-main">
                  <div className="swim__lbl-name">{tool.name}</div>
                  <div className="swim__lbl-meta">
                    {tool.seats} 席 · 本週 <strong>{weekHours}h</strong>
                  </div>
                </div>
              </div>
              {days.map((d, di) => {
                const key = window.AI_DATA.ymd(d);
                const cellBookings = (matrix[`${tool.id}|${key}`] || []).slice().sort((a, b) => a.startHour - b.startHour);
                const isToday = key === todayKey;
                // Lane-assign within a cell (rare overlap of same tool same day)
                const lanes = [];
                const placed = cellBookings.map((b) => {
                  let li = lanes.findIndex((endH) => endH <= b.startHour);
                  if (li === -1) { lanes.push(b.endHour); li = lanes.length - 1; }
                  else lanes[li] = b.endHour;
                  return { b, lane: li };
                });
                const laneCount = Math.max(1, lanes.length);
                return (
                  <div
                    key={di}
                    className={`swim__cell ${isToday ? "is-today" : ""}`}
                    onClick={(e) => {
                      // Click empty area → create with tool pre-selected, hour from click position
                      if (e.target !== e.currentTarget && !e.target.classList.contains("swim__cell-hours")) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(0.99, (e.clientX - rect.left) / rect.width));
                      const hour = 9 + Math.floor(ratio * HOUR_SEGMENTS);
                      onCreate(key, hour, tool.id);
                    }}
                  >
                    {/* Hour grid background */}
                    <div className="swim__cell-hours" aria-hidden="true">
                      {Array.from({ length: HOUR_SEGMENTS }, (_, i) => (
                        <span key={i} className="swim__tick" />
                      ))}
                    </div>
                    {placed.map(({ b, lane }) => {
                      const user = users.find((u) => u.id === b.userId);
                      const isCancelled = b.resStatus === "cancelled";
                      const cat = calStatusCat(b, todayKey);
                      const sc = CAL_STATUS[cat];
                      const leftPct = ((b.startHour - 9) / HOUR_SEGMENTS) * 100;
                      const widthPct = ((b.endHour - b.startHour) / HOUR_SEGMENTS) * 100;
                      const top = `calc(4px + ${lane * 22}px)`;
                      const height = laneCount > 1 ? "18px" : "calc(100% - 8px)";
                      const dur = b.endHour - b.startHour;
                      return (
                        <button
                          key={b.id}
                          className={`swim-evt is-${cat} ${isCancelled ? "is-cancelled" : ""} ${b.resStatus === "pending" ? "is-pending" : ""} ${b.useStatus === "active" ? "is-live" : ""}`}
                          style={{
                            left: `calc(${leftPct}% + 1px)`,
                            width: `calc(${widthPct}% - 2px)`,
                            top, height,
                            "--c": sc.c, "--s": sc.s,
                          }}
                          onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                          title={`${tool.name} · ${user.name} · ${b.startHour}:00–${b.endHour}:00 · ${sc.label}`}
                        >
                          <span className="swim-evt__time">
                            {String(b.startHour).padStart(2,"0")}–{String(b.endHour).padStart(2,"0")}
                          </span>
                          <span className="swim-evt__user">
                            <span className="swim-evt__avatar">{user.initials}</span>
                            <span className="swim-evt__name">{user.name}</span>
                          </span>
                          {dur >= 3 && b.note && <span className="swim-evt__note">{b.note}</span>}
                          {b.useStatus === "active" && <span className="swim-evt__pulse" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { MonthView, WeekView, startOfWeek });
