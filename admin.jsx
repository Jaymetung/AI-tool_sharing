// Admin panel — manage AI tools and users

function makesoft(hex) {
  try {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const mix = (c) => Math.round(c * 0.13 + 255 * 0.87);
    const h = (n) => n.toString(16).padStart(2,'0');
    return `#${h(mix(r))}${h(mix(g))}${h(mix(b))}`;
  } catch { return "#f0efea"; }
}

const TOOL_GLYPHS  = ["◉","✦","◐","◆","❖","◈","▶","♪","★","●","▲","■","⬟","⬡","✿","⊕"];
const TOOL_COLORS  = ["#10a37f","#d97757","#1a73e8","#7c3aed","#24292f","#22c55e","#ec4899","#4f46e5","#f59e0b","#ef4444","#06b6d4","#0b8a3a","#9333ea","#e11d48","#0284c7","#0b1220"];

function AdminPanel({ tools, users, bookings = [], initialTab, onClose, onSaveTool, onDeleteTool, onSaveUser, onDeleteUser }) {
  const [tab, setTab] = React.useState(initialTab || "tool");
  const [editingTool, setEditingTool] = React.useState(null);
  const [editingUser, setEditingUser] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);

  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const newTool = () => setEditingTool({ id: `t${Date.now()}`, name: "", short: "", glyph: "◉", color: "#4f46e5", soft: "#ebebff", seats: 1 });
  const newUser = () => setEditingUser({ id: `u${Date.now()}`, name: "", initials: "", role: "", avatar: "#8b887e" });

  const doDelete = () => {
    if (!confirm) return;
    if (confirm.type === "tool") onDeleteTool(confirm.id);
    else onDeleteUser(confirm.id);
    setConfirm(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title"><h2>管理設定</h2></div>
          <button className="iconbtn" onClick={onClose}>✕</button>
        </div>

        <div className="admin-tabs">
          <button className={tab === "tool" ? "is-on" : ""} onClick={() => setTab("tool")}>AI 工具</button>
          <button className={tab === "user" ? "is-on" : ""} onClick={() => setTab("user")}>使用者</button>
        </div>

        <div className="admin-body">
          {tab === "tool" && (
            <div className="admin-list">
              {tools.map((t) => (
                <div key={t.id} className="admin-row">
                  <span className="admin-row__icon" style={{ background: t.color, color: "#fff", borderRadius: 6, width: 28, height: 28, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 14 }}>{t.glyph}</span>
                  <div className="admin-row__main">
                    <div className="admin-row__name">{t.name}</div>
                    <div className="admin-row__meta">{t.short} · {t.seats} 席</div>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditingTool({ ...t })}>編輯</button>
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirm({ type: "tool", id: t.id, label: t.name })}>刪除</button>
                </div>
              ))}
              <button className="admin-add" onClick={newTool}>＋ 新增工具</button>
            </div>
          )}

          {tab === "user" && (
            <div className="admin-list">
              {users.map((u) => (
                <div key={u.id} className="admin-row">
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: u.avatar, color: "#fff", fontSize: 12, fontWeight: 600, display: "grid", placeItems: "center", flexShrink: 0 }}>{u.initials}</span>
                  <div className="admin-row__main">
                    <div className="admin-row__name">{u.name}</div>
                    <div className="admin-row__meta">{u.role}</div>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditingUser({ ...u })}>編輯</button>
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirm({ type: "user", id: u.id, label: u.name })}>刪除</button>
                </div>
              ))}
              <button className="admin-add" onClick={newUser}>＋ 新增使用者</button>
            </div>
          )}
        </div>
      </div>

      {editingTool && (
        <ToolEditor
          tool={editingTool}
          onSave={(t) => { onSaveTool(t); setEditingTool(null); }}
          onClose={() => setEditingTool(null)}
        />
      )}

      {editingUser && (
        <UserEditor
          user={editingUser}
          onSave={(u) => { onSaveUser(u); setEditingUser(null); }}
          onClose={() => setEditingUser(null)}
        />
      )}

      {confirm && (() => {
        const affectedBookings = bookings.filter((b) =>
          confirm.type === "tool" ? b.toolId === confirm.id : b.userId === confirm.id
        ).filter((b) => b.resStatus !== "cancelled");
        return (
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={() => setConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog__msg">確定刪除「{confirm.label}」？</div>
            <div className="confirm-dialog__sub">
              {affectedBookings.length > 0
                ? `此操作無法復原。將影響 ${affectedBookings.length} 筆現有預約（預約紀錄不會自動刪除）。`
                : "此操作無法復原"}
            </div>
            <div className="confirm-dialog__actions">
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>取消</button>
              <button className="btn btn--danger" onClick={doDelete}>刪除</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function ToolEditor({ tool, onSave, onClose }) {
  const [form, setForm] = React.useState({ ...tool });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !tool.name;

  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const save = () => {
    if (!form.name.trim() || !form.short.trim()) return;
    onSave({ ...form, soft: makesoft(form.color) });
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: form.color, display: "inline-block", marginRight: 4 }} />
            <h2>{isNew ? "新增工具" : "編輯工具"}</h2>
          </div>
          <button className="iconbtn" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body" style={{ gap: 16 }}>
          <div className="field">
            <label className="field__label">工具名稱 <span className="field__req">必填</span></label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例：ChatGPT Team" autoFocus />
          </div>

          <div className="field-grid">
            <div className="field">
              <label className="field__label">縮寫 <span className="field__req">必填</span></label>
              <input className="input" value={form.short} onChange={(e) => set("short", e.target.value.toUpperCase().slice(0,5))} placeholder="例：GPT" maxLength={5} />
            </div>
            <div className="field">
              <label className="field__label">可用席數</label>
              <input className="input" type="number" min={1} max={20} value={form.seats} onChange={(e) => set("seats", Math.max(1, +e.target.value))} />
            </div>
          </div>

          <div className="field">
            <label className="field__label">圖示</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {TOOL_GLYPHS.map((g) => (
                <button key={g} type="button" onClick={() => set("glyph", g)}
                  style={{ width: 34, height: 34, borderRadius: 7, border: form.glyph === g ? `2px solid ${form.color}` : "1px solid var(--border)", background: form.glyph === g ? form.color : "var(--surface)", color: form.glyph === g ? "#fff" : "var(--text)", cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">識別色</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {TOOL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  style={{ width: 26, height: 26, borderRadius: 6, background: c, border: form.color === c ? "3px solid var(--text)" : "2px solid transparent", cursor: "pointer" }} />
              ))}
              <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)}
                style={{ width: 34, height: 26, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", padding: 2 }} />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: form.color, color: "#fff", fontSize: 13, display: "grid", placeItems: "center" }}>{form.glyph}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{form.name || "…"}</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{form.short || "…"} · {form.seats} 席</span>
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>取消</button>
            <button className="btn btn--primary" onClick={save} disabled={!form.name.trim() || !form.short.trim()}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserEditor({ user, onSave, onClose }) {
  const [form, setForm] = React.useState({ ...user });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !user.name;
  const initials = form.initials || form.name.slice(0,1) || "?";

  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const save = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, initials: form.initials || form.name.slice(0,1), avatar: "#8b887e" });
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#8b887e", color: "#fff", fontSize: 11, fontWeight: 600, display: "inline-grid", placeItems: "center", marginRight: 6 }}>{initials}</span>
            <h2>{isNew ? "新增使用者" : "編輯使用者"}</h2>
          </div>
          <button className="iconbtn" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body" style={{ gap: 16 }}>
          <div className="field">
            <label className="field__label">姓名 <span className="field__req">必填</span></label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例：陳怡君" autoFocus />
          </div>
          <div className="field-grid">
            <div className="field">
              <label className="field__label">頭像文字</label>
              <input className="input" value={form.initials} onChange={(e) => set("initials", e.target.value.slice(0,2))} placeholder="例：陳（留空自動取名字第一字）" />
            </div>
            <div className="field">
              <label className="field__label">職稱 / 部門</label>
              <input className="input" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="例：產品設計" />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <div />
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>取消</button>
            <button className="btn btn--primary" onClick={save} disabled={!form.name.trim()}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AdminPanel = AdminPanel;
