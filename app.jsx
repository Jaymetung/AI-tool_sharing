// Main App — Firebase-backed
const { useState: useState2, useEffect: useEffect2, useMemo: useMemo3 } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4f46e5",
  "view": "month",
  "density": "comfortable",
  "showDashboard": true,
  "showWeekend": true
}/*EDITMODE-END*/;

function App() {
  const { TOOLS: SEED_TOOLS, USERS: SEED_USERS, BOOKINGS: SEED_BOOKINGS, TODAY } = window.AI_DATA;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [view, setView] = useState2(tweaks.view || "month");
  useEffect2(() => { setView(tweaks.view); }, [tweaks.view]);
  const [mode, setMode] = useState2("calendar");

  const [cursor, setCursor] = useState2(new Date(TODAY));

  // Data from Firebase
  const [tools, setTools] = useState2(SEED_TOOLS);
  const [users, setUsers] = useState2(SEED_USERS);
  const [bookings, setBookings] = useState2([]);
  const [dbLoaded, setDbLoaded] = useState2(false);
  const [dbError, setDbError] = useState2(null);

  const [modal, setModal] = useState2(null);
  const [dayDetail, setDayDetail] = useState2(null);
  const [search, setSearch] = useState2("");
  const [currentUserId, setCurrentUserId] = useState2(SEED_USERS[0]?.id || "u1");
  const [currentHour, setCurrentHour] = useState2(new Date().getHours() || 14);
  const [adminModal, setAdminModal] = useState2(null);
  const [adminAuthed, setAdminAuthed] = useState2(false);
  const [adminGate, setAdminGate] = useState2(false);
  const [adminPassword, setAdminPassword] = useState2("admin");
  const [sidebarOpen, setSidebarOpen] = useState2(false);

  const [filters, setFilters] = useState2({
    tools: new Set(SEED_TOOLS.map((t) => t.id)),
    users: new Set(SEED_USERS.map((u) => u.id)),
    resStatus: new Set(["confirmed", "pending", "cancelled"]),
  });

  // Firebase init — seed on first run, then subscribe to live updates
  useEffect2(() => {
    let unsub = null;
    fbSeedIfEmpty(SEED_TOOLS, SEED_USERS, SEED_BOOKINGS)
      .then(() => {
        unsub = fbSubscribe(
          ({ tools: t, users: u, bookings: b, config: c }) => {
            setTools(t);
            setUsers(u);
            setBookings(b);
            setFilters((prev) => ({
              ...prev,
              tools: new Set([...prev.tools, ...t.map((x) => x.id)]),
              users: new Set([...prev.users, ...u.map((x) => x.id)]),
            }));
            setCurrentUserId((prev) => u.find((x) => x.id === prev) ? prev : (u[0]?.id || prev));
            if (c.adminPassword) setAdminPassword(c.adminPassword);
            setDbLoaded(true);
          },
          (err) => setDbError(err)
        );
      })
      .catch((err) => setDbError(err));
    return () => { if (unsub) unsub(); };
  }, []);

  const filtered = useMemo3(() =>
    bookings.filter((b) =>
      tools.some((t) => t.id === b.toolId) &&
      users.some((u) => u.id === b.userId) &&
      filters.tools.has(b.toolId) &&
      filters.users.has(b.userId) &&
      filters.resStatus.has(b.resStatus) &&
      (search === "" ||
        b.note?.toLowerCase().includes(search.toLowerCase()) ||
        tools.find((t) => t.id === b.toolId)?.name.toLowerCase().includes(search.toLowerCase()) ||
        users.find((u) => u.id === b.userId)?.name.includes(search))
    ),
  [bookings, filters, search, tools, users]);

  const liveBookings = useMemo3(() => {
    const todayKey = window.AI_DATA.ymd(TODAY);
    return filtered.map((b) => {
      if (b.resStatus === "cancelled") return b;
      let useStatus = b.useStatus;
      if (b.manualState === "in")       useStatus = "active";
      else if (b.manualState === "out") useStatus = "done";
      else if (b.date === todayKey) {
        if (currentHour >= b.endHour)        useStatus = "done";
        else if (currentHour >= b.startHour) useStatus = "active";
        else                                  useStatus = "upcoming";
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

  const onCreate = (date, hour, toolId) =>
    setModal({ booking: null, defaultDate: date, defaultHour: hour, defaultToolId: toolId });

  const onSave   = (b)  => { fbSaveBooking(b);   setModal(null); };
  const onDelete = (id) => { fbDeleteBooking(id); setModal(null); };

  const onCheckIn  = (id) => { const b = bookings.find((x) => x.id === id); if (b) fbSaveBooking({ ...b, manualState: "in" });  };
  const onCheckOut = (id) => { const b = bookings.find((x) => x.id === id); if (b) fbSaveBooking({ ...b, manualState: "out" }); };

  const showDashboard = tweaks.showDashboard && mode === "calendar" && view === "month";

  // ── Error screen ───────────────────────────────────────────────────────────
  if (dbError) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16, background:"var(--bg)", fontFamily:"var(--font-sans)", padding:24 }}>
        <div style={{ fontSize:36 }}>🔒</div>
        <div style={{ fontSize:17, fontWeight:600 }}>需要設定資料庫權限</div>
        <div style={{ fontSize:13, color:"var(--text-dim)", textAlign:"center", maxWidth:420, lineHeight:1.7 }}>
          請到 <strong>Firebase Console → Realtime Database → 規則</strong>，將內容改為以下並按「發布」：
        </div>
        <pre style={{ background:"var(--surface-2)", padding:"14px 20px", borderRadius:10, fontSize:13, fontFamily:"monospace", border:"1px solid var(--border)", margin:0 }}>{`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}</pre>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>設定完成，重新整理</button>
      </div>
    );
  }

  if (!dbLoaded) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12, background:"var(--bg)", fontFamily:"var(--font-sans)" }}>
        <div style={{ fontSize:32, animation:"pulse 1.4s ease-in-out infinite" }}>◐</div>
        <div style={{ fontSize:13, color:"var(--text-dim)" }}>連線資料庫中…</div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className={`app density-${tweaks.density} ${showDashboard ? "" : "no-dash"}`} style={{ "--accent": tweaks.accent }}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <FilterSidebar
        tools={tools} users={users}
        filters={filters} setFilters={setFilters} today={TODAY}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        topContent={
          <CheckInPanel
            users={users} tools={tools} bookings={liveBookings}
            today={TODAY} currentHour={currentHour}
            currentUserId={currentUserId} setCurrentUserId={setCurrentUserId}
            onCheckIn={onCheckIn} onCheckOut={onCheckOut}
          />
        }
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="篩選">☰</button>
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
            {mode === "stats" && <h1 className="topbar__title" style={{ marginLeft:12 }}>使用統計</h1>}
          </div>

          <div className="topbar__center">
            {mode === "calendar" && (
              <div className="search">
                <span className="search__ic">⌕</span>
                <input className="search__inp" placeholder="搜尋預約備註、工具、使用者…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
          </div>

          <div className="topbar__right">
            {mode === "calendar" && (
              <div className="seg">
                <button className={view === "month" ? "is-on" : ""} onClick={() => setView("month")}>月</button>
                <button className={view === "week"  ? "is-on" : ""} onClick={() => setView("week")}>週</button>
              </div>
            )}
            <button className="btn btn--ghost btn--sm" onClick={() => adminAuthed ? setAdminModal("tool") : setAdminGate(true)} title="管理工具與使用者">⚙ 管理</button>
            <button className="btn btn--primary" onClick={() => onCreate(window.AI_DATA.ymd(TODAY), 10)}>
              <span className="btn__plus">＋</span> 新增預約
            </button>
          </div>
        </header>

        {mode === "calendar" && (
          <div className="cal-wrap">
            {view === "month" ? (
              <MonthView date={cursor} bookings={liveBookings} tools={tools} users={users} today={TODAY}
                onCreate={onCreate} onSelectBooking={(b) => setModal({ booking: b })} onOpenDay={(k) => setDayDetail(k)} />
            ) : (
              <WeekView date={cursor} bookings={liveBookings} tools={tools} users={users} today={TODAY}
                onCreate={onCreate} onSelectBooking={(b) => setModal({ booking: b })} />
            )}
          </div>
        )}

        {mode === "stats" && (
          <StatsView tools={tools} users={users} bookings={liveBookings} today={TODAY} />
        )}

        {mode === "calendar" && (
          <div className="legend">
            <div className="legend__group">
              <span className="legend__lbl">月曆色：</span>
              <span className="legend__item"><span className="legend__dot" style={{ background:"#0d8a36" }} /> 使用中</span>
              <span className="legend__item"><span className="legend__dot" style={{ background:"#1e6cff" }} /> 未使用</span>
              <span className="legend__item"><span className="legend__dot" style={{ background:"#b97309" }} /> 已預約</span>
              <span className="legend__item"><span className="legend__dot" style={{ background:"#7a7973" }} /> 已結束</span>
            </div>
            <div className="legend__group" style={{ marginLeft:"auto" }}>
              <span className="legend__lbl">模擬目前時刻</span>
              <input type="range" min="9" max="18" value={currentHour}
                onChange={(e) => setCurrentHour(+e.target.value)} className="hour-slider" />
              <span className="legend__hour">{String(currentHour).padStart(2,"0")}:00</span>
            </div>
          </div>
        )}
      </main>

      {showDashboard && (
        <Dashboard tools={tools} users={users} bookings={liveBookings} today={TODAY} currentHour={currentHour} />
      )}

      {modal && (
        <BookingModal booking={modal.booking} defaultDate={modal.defaultDate}
          defaultHour={modal.defaultHour} defaultToolId={modal.defaultToolId}
          tools={tools} users={users} bookings={liveBookings}
          onClose={() => setModal(null)} onSave={onSave} onDelete={onDelete} />
      )}

      {dayDetail && (
        <DayDetail dateKey={dayDetail} bookings={liveBookings} tools={tools} users={users} today={TODAY}
          onClose={() => setDayDetail(null)}
          onSelectBooking={(b) => setModal({ booking: b })}
          onCreate={onCreate} />
      )}

      {adminGate && (
        <PasswordGate
          adminPassword={adminPassword}
          onSuccess={() => { setAdminAuthed(true); setAdminGate(false); setAdminModal("tool"); }}
          onClose={() => setAdminGate(false)}
        />
      )}

      {adminModal && (
        <AdminPanel tools={tools} users={users} bookings={liveBookings} initialTab={adminModal}
          onClose={() => setAdminModal(null)}
          onSaveTool={fbSaveTool}   onDeleteTool={fbDeleteTool}
          onSaveUser={fbSaveUser}   onDeleteUser={fbDeleteUser} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="主題">
          <TweakColor label="主色" value={tweaks.accent} onChange={(v) => setTweak("accent", v)}
            options={["#4f46e5","#0b8a3a","#d97757","#0b1220","#7c3aed"]} />
          <TweakRadio label="密度" value={tweaks.density} onChange={(v) => setTweak("density", v)}
            options={[{ value:"compact", label:"緊湊" },{ value:"comfortable", label:"舒適" }]} />
        </TweakSection>
        <TweakSection label="檢視">
          <TweakRadio label="預設檢視" value={tweaks.view} onChange={(v) => setTweak("view", v)}
            options={[{ value:"month", label:"月" },{ value:"week", label:"週" }]} />
          <TweakToggle label="顯示儀表板" value={tweaks.showDashboard} onChange={(v) => setTweak("showDashboard", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
