// 報到打卡 — 左欄頂部
// Lists "me" + today's bookings; check-in toggles a manualState flag
// that overrides the time-derived useStatus on the calendar.

function CheckInPanel({ users, tools, bookings, today, currentHour, currentUserId, setCurrentUserId, onCheckIn, onCheckOut, onCreate }) {
  const me = users.find((u) => u.id === currentUserId);
  const todayKey = window.AI_DATA.ymd(today);
  const myToday = bookings
    .filter((b) => b.userId === currentUserId && b.date === todayKey && b.resStatus !== "cancelled")
    .sort((a, b) => a.startHour - b.startHour);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const liveStatus = (b) => {
    if (b.manualState === "in") return "active";
    if (b.manualState === "out") return "done";
    if (currentHour >= b.endHour) return "done";
    if (currentHour >= b.startHour) return "active";
    return "upcoming";
  };

  const upcomingCount = myToday.filter((b) => liveStatus(b) === "upcoming").length;
  const activeCount = myToday.filter((b) => liveStatus(b) === "active").length;

  if (!me) return (
    <section className="checkin">
      <div className="checkin__head"><h3 className="checkin__title"><span className="checkin__title-ic">⊙</span> 報到打卡</h3></div>
      <div className="checkin__empty"><div className="checkin__empty-ic">👤</div><div>目前沒有使用者</div></div>
    </section>
  );

  return (
    <section className="checkin">
      <div className="checkin__head">
        <div>
          <h3 className="checkin__title">
            <span className="checkin__title-ic">⊙</span>
            報到打卡
          </h3>
          <div className="checkin__sub">
            今日 {myToday.length} 筆 · 進行中 <strong>{activeCount}</strong>
          </div>
        </div>
      </div>

      <div className="checkin__me" ref={pickerRef}>
        <button
          className="checkin__me-btn"
          onClick={() => setPickerOpen((v) => !v)}
        >
          <span className="checkin__avatar" style={{ background: me.avatar }}>{me.initials}</span>
          <div className="checkin__me-info">
            <div className="checkin__me-name">{me.name}</div>
            <div className="checkin__me-role">{me.role}</div>
          </div>
          <span className={`checkin__caret ${pickerOpen ? "is-open" : ""}`}>⌄</span>
        </button>
        {pickerOpen && (
          <div className="checkin__picker">
            <div className="checkin__picker-lbl">切換身份</div>
            {users.map((u) => (
              <button
                key={u.id}
                className={`checkin__picker-row ${u.id === currentUserId ? "is-on" : ""}`}
                onClick={() => { setCurrentUserId(u.id); setPickerOpen(false); }}
              >
                <span className="checkin__avatar checkin__avatar--sm" style={{ background: u.avatar }}>{u.initials}</span>
                <span className="checkin__picker-name">{u.name}</span>
                <span className="checkin__picker-role">{u.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="checkin__list">
        {myToday.length === 0 ? (
          <div className="checkin__empty">
            <div className="checkin__empty-ic">🗓</div>
            <div>今天沒有你的預約</div>
          </div>
        ) : (
          myToday.map((b) => {
            const tool = tools.find((t) => t.id === b.toolId);
            const status = liveStatus(b);
            const isActive = status === "active";
            const isDone = status === "done";
            const isFull = b.endHour - b.startHour >= 8;
            return (
              <div
                key={b.id}
                className={`ci-item ci-item--${status}`}
                style={{ "--c": tool.color }}
              >
                <div className="ci-item__main">
                  <div className="ci-item__time">
                    {isFull ? "全日" : `${String(b.startHour).padStart(2,"0")}:00 – ${String(b.endHour).padStart(2,"0")}:00`}
                  </div>
                  <div className="ci-item__tool">
                    <span className="ci-item__dot" />
                    {tool.name}
                  </div>
                  <div className="ci-item__status">
                    {status === "upcoming" && <span className="ci-item__chip is-up">未開始</span>}
                    {status === "active"   && <span className="ci-item__chip is-act"><span className="dot-pulse" /> 使用中</span>}
                    {status === "done"     && <span className="ci-item__chip is-done">已結束</span>}
                  </div>
                  {(b.checkInTime || b.checkOutTime) && (
                    <div className="ci-item__actual">
                      {b.checkInTime  && <span>↑ {b.checkInTime} 打卡</span>}
                      {b.checkOutTime && <span>↓ {b.checkOutTime} 結束</span>}
                    </div>
                  )}
                </div>
                {!isDone && (
                  <button
                    className={`ci-item__btn ${isActive ? "is-end" : "is-in"}`}
                    onClick={() => isActive ? onCheckOut(b.id) : onCheckIn(b.id)}
                  >
                    {isActive ? "結束" : "打卡"}
                  </button>
                )}
                {isDone && (
                  <button
                    className="ci-item__btn is-restore"
                    onClick={() => onCheckIn(b.id)}
                    title="恢復為使用中"
                  >
                    ↺ 恢復
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <button className="checkin__add" onClick={onCreate}>
        <span className="btn__plus">＋</span> 新增預約
      </button>
    </section>
  );
}

window.CheckInPanel = CheckInPanel;
