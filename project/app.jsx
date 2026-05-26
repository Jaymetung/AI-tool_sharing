// Main App
const { useState: useState2, useEffect: useEffect2, useMemo: useMemo3 } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4f46e5",
  "view": "month",
  "density": "comfortable",
  "showDashboard": true,
  "showWeekend": true
}/*EDITMODE-END*/;

function App() {
  const { TOOLS, USERS, BOOKINGS, TODAY } = window.AI_DATA;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [view, setView] = useState2(tweaks.view || "month");
  useEffect2(() => { setView(tweaks.view); }, [tweaks.view]);
  const [mode, setMode] = useState2("calendar"); // calendar | stats

  const [cursor, setCursor] = useState2(new Date(TODAY));
  const [bookings, setBookings] = useState2(BOOKINGS);
  const [modal, setModal] = useState2(null); // { booking } or { defaultDate, defaultHour }
  const [dayDetail, setDayDetail] = useState2(null); // date key string
  const [search, setSearch] = useState2("");
  const [currentUserId, setCurrentUserId] = useState2("u2"); // 林宗翰 default

  // demo "current hour" — controls the live state.
  const [currentHour, setCurrentHour] = useState2(14);

  const [filters, setFilters] = useState2({
    tools: new Set(TOOLS.map((t) => t.id)),
    users: new Set(USERS.map((u) => u.id)),
    resStatus: new Set(["confirmed", "pending", "cancelled"]),
  });

  // Apply filters
  const filtered = useMemo3(() => {
    return bookings.filter((b) =>
      filters.tools.has(b.toolId) &&
      filters.users.has(b.userId) &&
      filters.resStatus.has(b.resStatus) &&
      (search === "" ||
        b.note.toLowerCase().includes(search.toLowerCase()) ||
        TOOLS.find((t) => t.id === b.toolId)?.name.toLowerCase().includes(search.toLowerCase()) ||
        USERS.find((u) => u.id === b.userId)?.name.includes(search))
    );
  }, [bookings, filters, search]);

  // Derive usage status live from currentHour + manual check-in override
  const liveBookings = useMemo3(() => {
    const todayKey = window.AI_DATA.ymd(TODAY);
    return filtered.map((b) => {
      if (b.resStatus === "cancelled") return b;
      let useStatus = b.useStatus;
      if (b.manualState === "in")  useStatus = "active";
      else if (b.manualState === "out") useStatus = "done";
      else if (b.date === todayKey) {
        if (currentHour >= b.endHour) useStatus = "done";
        else if (currentHour >= b.startHour) useStatus = "active";
        else useStatus = "upcoming";
      }
      return { ...b, useStatus };
    });
  }, [filtered, currentHour, TODAY]);

  const titleStr = view === "month"
    ? `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`
    : (() => {
        const ws = startOfWeek(cursor);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return `${ws.getMonth() + 1}/${ws.getDate()} – ${we.getMonth() + 1}/${we.getDate()}`;
      })();

  const nav = (dir) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const onCreate = (date, hour, toolId) => {
    setModal({ booking: null, defaultDate: date, defaultHour: hour, defaultToolId: toolId });
  };
  const onSave = (b) => {
    setBookings((bs) => {
      const i = bs.findIndex((x) => x.id === b.id);
      if (i >= 0) { const nx = [...bs]; nx[i] = b; return nx; }
      return [...bs, b];
    });
    setModal(null);
  };
  const onDelete = (id) => {
    setBookings((bs) => bs.filter((x) => x.id !== id));
    setModal(null);
  };
  const onCheckIn = (id) => {
    setBookings((bs) => bs.map((x) => x.id === id ? { ...x, manualState: "in" } : x));
  };
  const onCheckOut = (id) => {
    setBookings((bs) => bs.map((x) => x.id === id ? { ...x, manualState: "out" } : x));
  };

  const showDashboard = tweaks.showDashboard && mode === "calendar" && view === "month";

  return (
    <div className={`app density-${tweaks.density} ${showDashboard ? "" : "no-dash"}`} style={{ "--accent": tweaks.accent }}>
      <FilterSidebar
        tools={TOOLS} users={USERS}
        filters={filters} setFilters={setFilters} today={TODAY}
        topContent={
          <CheckInPanel
            users={USERS} tools={TOOLS} bookings={bookings}
            today={TODAY} currentHour={currentHour}
            currentUserId={currentUserId} setCurrentUserId={setCurrentUserId}
            onCheckIn={onCheckIn} onCheckOut={onCheckOut}
          />
        }
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <div className="mode-tabs">
              <button className={mode === "calendar" ? "is-on" : ""} onClick={() => setMode("calendar")}>
                <span className="mode-tabs__ic">▦</span> 月曆
              </button>
              <button className={mode === "stats" ? "is-on" : ""} onClick={() => setMode("stats")}>
                <span className="mode-tabs__ic">◧</span> 統計
              </button>
            </div>
            {mode === "calendar" && (
              <>
                <span className="topbar__divider" />
                <button className="iconbtn" onClick={() => nav(-1)} aria-label="上一個">‹</button>
                <button className="iconbtn" onClick={() => nav(+1)} aria-label="下一個">›</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setCursor(new Date(TODAY))}>今天</button>
                <h1 className="topbar__title">{titleStr}</h1>
              </>
            )}
            {mode === "stats" && <h1 className="topbar__title" style={{ marginLeft: 12 }}>使用統計</h1>}
          </div>

          <div className="topbar__center">
            {mode === "calendar" && (
              <div className="search">
                <span className="search__ic">⌕</span>
                <input
                  className="search__inp"
                  placeholder="搜尋預約備註、工具、使用者…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="topbar__right">
            {mode === "calendar" && (
              <div className="seg">
                <button className={view === "month" ? "is-on" : ""} onClick={() => setView("month")}>月</button>
                <button className={view === "week" ? "is-on" : ""} onClick={() => setView("week")}>週</button>
              </div>
            )}
            <button className="btn btn--primary" onClick={() => onCreate(window.AI_DATA.ymd(TODAY), 10)}>
              <span className="btn__plus">＋</span> 新增預約
            </button>
          </div>
        </header>

        {mode === "calendar" && (
          <div className="cal-wrap">
            {view === "month" ? (
              <MonthView
                date={cursor}
                bookings={liveBookings}
                tools={TOOLS} users={USERS} today={TODAY}
                onCreate={onCreate}
                onSelectBooking={(b) => setModal({ booking: b })}
                onOpenDay={(k) => setDayDetail(k)}
              />
            ) : (
              <WeekView
                date={cursor}
                bookings={liveBookings}
                tools={TOOLS} users={USERS} today={TODAY}
                onCreate={onCreate}
                onSelectBooking={(b) => setModal({ booking: b })}
              />
            )}
          </div>
        )}

        {mode === "stats" && (
          <StatsView tools={TOOLS} users={USERS} bookings={liveBookings} today={TODAY} />
        )}

        {mode === "calendar" && (
        <div className="legend">
          <div className="legend__group">
            <span className="legend__lbl">月曆色：</span>
            <span className="legend__item"><span className="legend__dot" style={{ background: "#0d8a36" }} /> 使用中</span>
            <span className="legend__item"><span className="legend__dot" style={{ background: "#1e6cff" }} /> 未使用</span>
            <span className="legend__item"><span className="legend__dot" style={{ background: "#b97309" }} /> 已預約</span>
            <span className="legend__item"><span className="legend__dot" style={{ background: "#7a7973" }} /> 已結束</span>
          </div>
          <div className="legend__group" style={{ marginLeft: "auto" }}>
            <span className="legend__lbl">模擬目前時刻</span>
            <input
              type="range" min="9" max="18" value={currentHour}
              onChange={(e) => setCurrentHour(+e.target.value)}
              className="hour-slider"
            />
            <span className="legend__hour">{String(currentHour).padStart(2,"0")}:00</span>
          </div>
        </div>
        )}
      </main>

      {showDashboard && (
        <Dashboard
          tools={TOOLS} users={USERS}
          bookings={liveBookings}
          today={TODAY}
          currentHour={currentHour}
        />
      )}

      {modal && (
        <BookingModal
          booking={modal.booking}
          defaultDate={modal.defaultDate}
          defaultHour={modal.defaultHour}
          defaultToolId={modal.defaultToolId}
          tools={TOOLS} users={USERS}
          onClose={() => setModal(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}

      {dayDetail && (
        <DayDetail
          dateKey={dayDetail}
          bookings={liveBookings}
          tools={TOOLS} users={USERS}
          today={TODAY}
          onClose={() => setDayDetail(null)}
          onSelectBooking={(b) => setModal({ booking: b })}
          onCreate={onCreate}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="主題">
          <TweakColor
            label="主色"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#4f46e5", "#0b8a3a", "#d97757", "#0b1220", "#7c3aed"]}
          />
          <TweakRadio
            label="密度"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "compact", label: "緊湊" },
              { value: "comfortable", label: "舒適" },
            ]}
          />
        </TweakSection>
        <TweakSection label="檢視">
          <TweakRadio
            label="預設檢視"
            value={tweaks.view}
            onChange={(v) => setTweak("view", v)}
            options={[
              { value: "month", label: "月" },
              { value: "week", label: "週" },
            ]}
          />
          <TweakToggle
            label="顯示儀表板"
            value={tweaks.showDashboard}
            onChange={(v) => setTweak("showDashboard", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
