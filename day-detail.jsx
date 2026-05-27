// Day detail popover — shows full booking list for a single day.

function DayDetail({ dateKey, bookings, tools, users, today, onClose, onSelectBooking, onCreate }) {
  const date = new Date(dateKey);
  const todayKey = window.AI_DATA.ymd(today);
  const isToday = dateKey === todayKey;
  const list = bookings.filter((b) => b.date === dateKey).sort((a, b) => a.startHour - b.startHour);

  const totalHours = list.filter((b) => b.resStatus !== "cancelled").reduce((s, b) => s + (b.endHour - b.startHour), 0);
  const dowLabel = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][date.getDay()];

  React.useEffect(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="day-detail" onClick={(e) => e.stopPropagation()}>
        <div className="day-detail__head">
          <div className="day-detail__date">
            <span className={`day-detail__num ${isToday ? "is-today" : ""}`}>{date.getDate()}</span>
            <div>
              <div className="day-detail__title">
                {date.getFullYear()} 年 {date.getMonth() + 1} 月 {date.getDate()} 日
                <span className="day-detail__dow">{dowLabel}</span>
              </div>
              <div className="day-detail__meta">
                {list.length} 筆預約 · 共 {totalHours} 小時
              </div>
            </div>
          </div>
          <div className="day-detail__actions">
            <button className="iconbtn" onClick={onClose} aria-label="關閉">✕</button>
          </div>
        </div>

        <div className="day-detail__body">
          {list.length === 0 ?
          <div className="day-detail__empty">這天沒有預約</div> :

          <div className="day-list">
              {list.map((b) => {
              const tool = tools.find((t) => t.id === b.toolId);
              const user = users.find((u) => u.id === b.userId);
              const isFull = b.endHour - b.startHour >= 8;
              const isCancelled = b.resStatus === "cancelled";
              const res = window.AI_DATA.RES_STATUS[b.resStatus];
              const cat = window.calStatusCat(b, window.AI_DATA.ymd(today));
              const sc = window.CAL_STATUS[cat];
              return (
                <button
                  key={b.id}
                  className={`day-row is-${cat} ${isCancelled ? "is-cancelled" : ""}`}
                  style={{ "--c": sc.c, "--s": sc.s }}
                  onClick={() => {onClose();onSelectBooking(b);}}>
                  
                    <div className="day-row__time">
                      {isFull ? <span className="day-row__fullday">全日</span> :
                    <>
                          <span className="day-row__t">{String(b.startHour).padStart(2, "0")}:00</span>
                          <span className="day-row__t-end">{String(b.endHour).padStart(2, "0")}:00</span>
                        </>
                    }
                    </div>
                    <span className="day-row__bar" />
                    <div className="day-row__body">
                      <div className="day-row__line1">
                        <span className="day-row__logo">{tool.glyph}</span>
                        <span className="day-row__tool">{tool.name}</span>
                      </div>
                      <div className="day-row__line2">
                        <span className="mini-avatar" style={{ background: user.avatar }}>{user.initials}</span>
                        <span className="day-row__user">{user.name}</span>
                        <span className="day-row__role">· {user.role}</span>
                      </div>
                      {b.note && <div className="day-row__note">{b.note}</div>}
                      {(b.checkInTime || b.checkOutTime) && (
                        <div className="day-row__checkin">
                          {b.checkInTime  && <span>↑ {b.checkInTime}</span>}
                          {b.checkOutTime && <span>↓ {b.checkOutTime}</span>}
                        </div>
                      )}
                    </div>
                    <div className="day-row__status">
                      <span className="day-row__chip" style={{ color: res.color, background: `color-mix(in oklab, ${res.dot} 14%, white)` }}>
                        <span className="dot" style={{ background: res.dot }} /> {res.label}
                      </span>
                    </div>
                  </button>);

            })}
            </div>
          }
        </div>

        <div className="day-detail__foot">
          <button className="btn btn--primary day-detail__add" onClick={() => {onClose();onCreate(dateKey, 10);}} data-comment-anchor="5a2bbeffea-button-35-13">
            <span className="btn__plus">＋</span> 為這天新增預約
          </button>
        </div>
      </div>
    </div>);

}

window.DayDetail = DayDetail;