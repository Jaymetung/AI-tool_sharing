// Left sidebar: filters (tools, users, statuses).
// Right dashboard: usage stats by tool, by user, "live now", week heatmap.

const { useMemo: useMemo2 } = React;

function FilterSidebar({ tools, users, filters, setFilters, today, topContent }) {
  const toggleTool = (id) => {
    const next = new Set(filters.tools);
    next.has(id) ? next.delete(id) : next.add(id);
    setFilters({ ...filters, tools: next });
  };
  const toggleUser = (id) => {
    const next = new Set(filters.users);
    next.has(id) ? next.delete(id) : next.add(id);
    setFilters({ ...filters, users: next });
  };
  const allToolsOn = filters.tools.size === tools.length;
  const allUsersOn = filters.users.size === users.length;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <span className="logo-mark">◐</span>
        </div>
        <div>
          <div className="sidebar__title">AI 工具預約</div>
          <div className="sidebar__sub">團隊 · 共 {tools.length} 個工具</div>
        </div>
      </div>

      {topContent}

      <section className="filter">
        <div className="filter__head">
          <h3>AI 工具</h3>
          <button
            className="filter__all"
            onClick={() => setFilters({ ...filters, tools: new Set(allToolsOn ? [] : tools.map((t) => t.id)) })}
          >
            {allToolsOn ? "全部取消" : "全選"}
          </button>
        </div>
        <div className="filter__list">
          {tools.map((t) => {
            const on = filters.tools.has(t.id);
            return (
              <label key={t.id} className={`filter__item ${on ? "is-on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggleTool(t.id)} />
                <span className="filter__swatch" style={{ background: t.color }} />
                <span className="filter__name">{t.name}</span>
                <span className="filter__count">{t.seats}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="filter">
        <div className="filter__head">
          <h3>使用者</h3>
          <button
            className="filter__all"
            onClick={() => setFilters({ ...filters, users: new Set(allUsersOn ? [] : users.map((u) => u.id)) })}
          >
            {allUsersOn ? "全部取消" : "全選"}
          </button>
        </div>
        <div className="filter__list">
          {users.map((u) => {
            const on = filters.users.has(u.id);
            return (
              <label key={u.id} className={`filter__item ${on ? "is-on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggleUser(u.id)} />
                <span className="filter__avatar" style={{ background: u.avatar }}>{u.initials}</span>
                <span className="filter__name">{u.name}</span>
                <span className="filter__role">{u.role}</span>
              </label>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function Dashboard({ tools, users, bookings, today, currentHour }) {
  const todayKey = window.AI_DATA.ymd(today);

  // Usage in this week (sun–sat around today)
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const weekBookings = bookings.filter((b) => {
    const d = new Date(b.date);
    return d >= weekStart && d < weekEnd && b.resStatus !== "cancelled";
  });

  const totalHoursByTool = {};
  for (const b of weekBookings) {
    totalHoursByTool[b.toolId] = (totalHoursByTool[b.toolId] || 0) + (b.endHour - b.startHour);
  }
  const maxTool = Math.max(1, ...Object.values(totalHoursByTool));
  const sortedTools = tools
    .map((t) => ({ ...t, hours: totalHoursByTool[t.id] || 0 }))
    .sort((a, b) => b.hours - a.hours);

  const totalHoursByUser = {};
  for (const b of weekBookings) {
    totalHoursByUser[b.userId] = (totalHoursByUser[b.userId] || 0) + (b.endHour - b.startHour);
  }
  const topUsers = users
    .map((u) => ({ ...u, hours: totalHoursByUser[u.id] || 0 }))
    .sort((a, b) => b.hours - a.hours).slice(0, 5);

  // Live "active now" — trusts useStatus which respects manual check-in override
  const liveNow = bookings.filter((b) =>
    b.date === todayKey &&
    b.resStatus === "confirmed" &&
    b.useStatus === "active"
  );

  // Per-tool live status (capacity)
  const toolLive = tools.map((t) => {
    const inUse = liveNow.filter((b) => b.toolId === t.id).length;
    return { ...t, inUse, free: Math.max(0, t.seats - inUse) };
  });

  // 14-day stacked tool usage (mini chart)
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 7 + i);
    return d;
  });
  const dayTotals = days14.map((d) => {
    const k = window.AI_DATA.ymd(d);
    const list = bookings.filter((b) => b.date === k && b.resStatus !== "cancelled");
    const byTool = {};
    let total = 0;
    for (const b of list) {
      const h = b.endHour - b.startHour;
      byTool[b.toolId] = (byTool[b.toolId] || 0) + h;
      total += h;
    }
    return { date: d, total, byTool, isToday: k === todayKey };
  });
  const maxDay = Math.max(1, ...dayTotals.map((d) => d.total));

  const weekTotalHours = weekBookings.reduce((s, b) => s + (b.endHour - b.startHour), 0);
  const weekBookingsCount = weekBookings.length;
  const pending = bookings.filter((b) => b.resStatus === "pending").length;

  return (
    <aside className="dashboard">
      <div className="dash__head">
        <h2>使用情況儀表板</h2>
        <div className="dash__date">
          {today.getFullYear()} 年 {today.getMonth() + 1} 月 {today.getDate()} 日 · {String(currentHour).padStart(2,"0")}:00
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi__label">本週預約</div>
          <div className="kpi__value">{weekBookingsCount}<span className="kpi__unit">筆</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">本週時數</div>
          <div className="kpi__value">{weekTotalHours}<span className="kpi__unit">小時</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">使用中</div>
          <div className="kpi__value live">{liveNow.length}<span className="kpi__unit">/{tools.reduce((s,t)=>s+t.seats,0)}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">待確認</div>
          <div className="kpi__value">{pending}<span className="kpi__unit">筆</span></div>
        </div>
      </div>

      {/* Live now */}
      <section className="dash__section">
        <div className="dash__sec-head">
          <h3>現正使用中</h3>
          <span className="live-dot" />
        </div>
        {liveNow.length === 0 ? (
          <div className="dash__empty">目前無人使用任何工具</div>
        ) : (
          <div className="live-list">
            {liveNow.map((b) => {
              const tool = tools.find((t) => t.id === b.toolId);
              const user = users.find((u) => u.id === b.userId);
              return (
                <div key={b.id} className="live-row">
                  <span className="live-row__bar" style={{ background: tool.color }} />
                  <div className="live-row__main">
                    <div className="live-row__tool">{tool.name}</div>
                    <div className="live-row__user">
                      <span className="mini-avatar" style={{ background: user.avatar }}>{user.initials}</span>
                      {user.name}
                    </div>
                  </div>
                  <div className="live-row__time">
                    {String(b.startHour).padStart(2,"0")}–{String(b.endHour).padStart(2,"0")}
                    <div className="live-row__remain">剩 {b.endHour - currentHour}h</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tool usage bar chart (本週) */}
      <section className="dash__section">
        <div className="dash__sec-head">
          <h3>本週工具使用時數</h3>
          <span className="muted">小時</span>
        </div>
        <div className="bar-list">
          {sortedTools.map((t) => (
            <div key={t.id} className="bar">
              <div className="bar__label">
                <span className="bar__dot" style={{ background: t.color }} />
                <span className="bar__name">{t.short}</span>
              </div>
              <div className="bar__track">
                <div className="bar__fill" style={{ width: `${(t.hours / maxTool) * 100}%`, background: t.color }} />
              </div>
              <div className="bar__value">{t.hours}h</div>
            </div>
          ))}
        </div>
      </section>

      {/* Capacity (seats in use right now) */}
      <section className="dash__section">
        <div className="dash__sec-head"><h3>即時座位</h3></div>
        <div className="cap-grid">
          {toolLive.map((t) => (
            <div key={t.id} className="cap">
              <div className="cap__head">
                <span className="cap__dot" style={{ background: t.color }} />
                <span className="cap__name">{t.short}</span>
              </div>
              <div className="cap__seats">
                {Array.from({ length: t.seats }, (_, i) => (
                  <span
                    key={i}
                    className={`cap__seat ${i < t.inUse ? "is-used" : ""}`}
                    style={i < t.inUse ? { background: t.color, borderColor: t.color } : {}}
                  />
                ))}
              </div>
              <div className="cap__txt">
                <strong>{t.inUse}</strong>/{t.seats} 使用中
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 14-day mini chart */}
      <section className="dash__section">
        <div className="dash__sec-head">
          <h3>近 14 天使用熱度</h3>
        </div>
        <div className="trend">
          {dayTotals.map((d, i) => (
            <div key={i} className={`trend__col ${d.isToday ? "is-today" : ""}`} title={`${d.date.getMonth()+1}/${d.date.getDate()} · ${d.total}h`}>
              <div className="trend__stack" style={{ height: `${(d.total / maxDay) * 100}%` }}>
                {tools.map((t) => {
                  const h = d.byTool[t.id] || 0;
                  if (!h) return null;
                  return <span key={t.id} className="trend__seg" style={{ flex: h, "--tc": t.color }} />;
                })}
              </div>
              <div className="trend__label">{d.date.getDate()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top users */}
      <section className="dash__section">
        <div className="dash__sec-head"><h3>本週活躍使用者</h3></div>
        <div className="top-users">
          {topUsers.map((u, i) => (
            <div key={u.id} className="top-user">
              <span className="top-user__rank">{i + 1}</span>
              <span className="top-user__avatar" style={{ background: u.avatar }}>{u.initials}</span>
              <div className="top-user__main">
                <div className="top-user__name">{u.name}</div>
                <div className="top-user__role">{u.role}</div>
              </div>
              <div className="top-user__hours">{u.hours}h</div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

Object.assign(window, { FilterSidebar, Dashboard });
