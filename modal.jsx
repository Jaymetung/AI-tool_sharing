// Booking modal — create or edit a booking with the 4 required fields:
//   預約狀態, 使用狀態, 使用者, 使用工具
// Also supports hour-range or full-day mode.

const { useState, useEffect, useMemo: useMemo4 } = React;

function BookingModal({ booking, defaultDate, defaultHour, defaultToolId, tools, users, bookings = [], onClose, onSave, onDelete }) {
  const isEdit = !!booking;
  const [date, setDate] = useState(booking?.date || defaultDate || window.AI_DATA.ymd(window.AI_DATA.TODAY));
  const [mode, setMode] = useState(() => {
    if (!booking) return "hours";
    return booking.endHour - booking.startHour >= 8 ? "day" : "hours";
  });
  const [startHour, setStartHour] = useState(booking?.startHour ?? defaultHour ?? 10);
  const [endHour, setEndHour]     = useState(booking?.endHour   ?? (defaultHour ? defaultHour + 2 : 12));
  const [toolId, setToolId] = useState(booking?.toolId || defaultToolId || tools[0].id);
  const [userId, setUserId] = useState(booking?.userId || users[0].id);
  const [resStatus, setResStatus] = useState(booking?.resStatus || "confirmed");
  const [useStatus, setUseStatus] = useState(booking?.useStatus || "upcoming");
  const [note, setNote] = useState(booking?.note || "");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tool = tools.find((t) => t.id === toolId);
  const user = users.find((u) => u.id === userId);

  // Count overlapping confirmed bookings for the same tool/date/time (excluding self)
  const conflictCount = useMemo4(() => {
    const sh = mode === "day" ? 9 : startHour;
    const eh = mode === "day" ? 18 : endHour;
    return bookings.filter((b) =>
      b.id !== booking?.id &&
      b.toolId === toolId &&
      b.date === date &&
      b.resStatus !== "cancelled" &&
      b.startHour < eh && b.endHour > sh
    ).length;
  }, [bookings, toolId, date, mode, startHour, endHour, booking]);

  const overCapacity = tool && conflictCount >= tool.seats;

  const save = () => {
    const sh = mode === "day" ? 9 : startHour;
    const eh = mode === "day" ? 18 : endHour;
    if (eh <= sh) return;
    onSave({
      id: booking?.id || `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      date, startHour: sh, endHour: eh,
      toolId, userId, resStatus, useStatus, note,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <span className="modal__tool-dot" style={{ background: tool.color }} />
            <h2>{isEdit ? "編輯預約" : "新增預約"}</h2>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="關閉">✕</button>
        </div>

        <div className="modal__body">
          {/* Tool + User */}
          <div className="field-grid">
            <div className="field">
              <label className="field__label">使用工具 <span className="field__req">必填</span></label>
              <div className="tool-grid">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tool-chip ${t.id === toolId ? "is-on" : ""}`}
                    style={{ "--c": t.color, "--s": t.soft }}
                    onClick={() => setToolId(t.id)}
                  >
                    <span className="tool-chip__dot" />
                    <span className="tool-chip__name">{t.name}</span>
                    <span className="tool-chip__seats">{t.seats} 座位</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field__label">使用者 <span className="field__req">必填</span></label>
              <div className="user-grid">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`user-chip ${u.id === userId ? "is-on" : ""}`}
                    onClick={() => setUserId(u.id)}
                  >
                    <span className="user-chip__avatar" style={{ background: u.avatar }}>{u.initials}</span>
                    <span className="user-chip__name">{u.name}</span>
                    <span className="user-chip__role">{u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seat capacity warning */}
          {tool && conflictCount > 0 && (
            <div className={`field-warn ${overCapacity ? "field-warn--over" : ""}`}>
              {overCapacity
                ? `⚠ 此時段已滿（${conflictCount}/${tool.seats} 席），仍可建立待確認預約`
                : `ℹ 此時段已有 ${conflictCount}/${tool.seats} 席被使用`}
            </div>
          )}

          {/* Time */}
          <div className="field">
            <label className="field__label">使用時段</label>
            <div className="time-row">
              <div className="seg">
                <button className={mode === "hours" ? "is-on" : ""} onClick={() => setMode("hours")}>按小時</button>
                <button className={mode === "day" ? "is-on" : ""} onClick={() => setMode("day")}>整天</button>
              </div>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              {mode === "hours" && (
                <>
                  <select className="input" value={startHour} onChange={(e) => setStartHour(+e.target.value)}>
                    {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
                  </select>
                  <span className="dash">至</span>
                  <select className="input" value={endHour} onChange={(e) => setEndHour(+e.target.value)}>
                    {[...HOURS, 19].filter((h) => h > startHour).map((h) => <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
                  </select>
                </>
              )}
              {mode === "day" && <div className="muted">09:00 – 18:00 （全日）</div>}
            </div>
          </div>

          {/* Status — reservation status auto-derived */}

          <div className="field">
            <label className="field__label">備註（選填）</label>
            <textarea
              className="input input--area"
              placeholder="例：跑 Q3 行銷視覺的探索"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="modal__footer">
          <div className="modal__summary">
            <span className="dot" style={{ background: tool.color }} />
            <strong>{tool.name}</strong>
            <span className="muted">·</span>
            <span>{user.name}</span>
            <span className="muted">·</span>
            <span>{mode === "day" ? "整天" : `${String(startHour).padStart(2,"0")}:00–${String(endHour).padStart(2,"0")}:00`}</span>
          </div>
          <div className="modal__actions">
            {isEdit && <button className="btn btn--danger" onClick={() => onDelete(booking.id)}>刪除</button>}
            <button className="btn btn--ghost" onClick={onClose}>取消</button>
            <button className="btn btn--primary" onClick={save}>{isEdit ? "儲存變更" : "建立預約"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.BookingModal = BookingModal;
