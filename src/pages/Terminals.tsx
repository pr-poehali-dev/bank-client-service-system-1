import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Terminal {
  id: number;
  name?: string;
  ip_address?: string;
  terminal_type: string;
  status: string;
  last_ping?: string;
  created_at?: string;
}

export default function Terminals() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", ip_address: "", terminal_type: "sber" });
  const [saving, setSaving] = useState(false);
  const [pingStatus, setPingStatus] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    api.terminals.list().then(r => {
      if (r.ok) setTerminals(r.data.terminals || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.ip_address) return;
    setSaving(true);
    const res = await api.terminals.add({ ...form });
    setSaving(false);
    if (res.ok) { setShowModal(false); setForm({ name: "", ip_address: "", terminal_type: "sber" }); load(); }
  };

  const ping = async (t: Terminal) => {
    setPingStatus(p => ({...p, [t.id]: "checking"}));
    await new Promise(r => setTimeout(r, 1500));
    // Имитация пинга (в реальной системе — запрос к терминалу через IP)
    const success = Math.random() > 0.4;
    setPingStatus(p => ({...p, [t.id]: success ? "online" : "offline"}));
  };

  const STATUS_COLORS: Record<string, string> = {
    online: "var(--neon)", connected: "var(--neon)",
    offline: "var(--danger)", disconnected: "var(--text-muted)",
    checking: "var(--warning)"
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Терминалы</h2>
          <p className="text-sm mt-0.5" style={{color: "var(--text-muted)"}}>Подключение терминалов Сбер через IP-адрес</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
          style={{background: "var(--neon)", color: "#080c12"}}>
          <Icon name="Plus" size={16} />
          Добавить терминал
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>Загрузка...</div>
      ) : terminals.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center">
          <Icon name="Monitor" size={48} className="mx-auto mb-3 opacity-30" style={{color: "var(--text-secondary)"}} />
          <p className="mb-2" style={{color: "var(--text-primary)"}}>Терминалы не подключены</p>
          <p className="text-sm" style={{color: "var(--text-muted)"}}>Добавьте IP-адрес терминала Сбер</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {terminals.map(t => {
            const status = pingStatus[t.id] || t.status;
            const color = STATUS_COLORS[status] || "var(--text-muted)";
            return (
              <div key={t.id} className="surface-card rounded-2xl p-5 hover:neon-border transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{background: `${color}15`, border: `1px solid ${color}40`}}>
                      <Icon name="Monitor" size={24} style={{color}} />
                    </div>
                    <div>
                      <div className="font-bold" style={{color: "var(--text-primary)"}}>{t.name || "Терминал"}</div>
                      <div className="text-xs font-mono-bank mt-0.5" style={{color: "var(--text-muted)"}}>
                        {t.terminal_type?.toUpperCase()} · #{t.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{background: `${color}15`, color}}>
                    {status === "checking" ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{background: color}} />
                    )}
                    {status === "online" || status === "connected" ? "Онлайн" :
                     status === "checking" ? "Проверка..." : "Офлайн"}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="Wifi" size={14} style={{color: "var(--text-muted)"}} />
                    <span className="font-mono-bank" style={{color: "var(--neon)"}}>{t.ip_address || "—"}</span>
                  </div>
                  {t.last_ping && (
                    <div className="flex items-center gap-2 text-xs" style={{color: "var(--text-muted)"}}>
                      <Icon name="Clock" size={12} />
                      Последний пинг: {new Date(t.last_ping).toLocaleString("ru-RU")}
                    </div>
                  )}
                </div>

                <button onClick={() => ping(t)} disabled={pingStatus[t.id] === "checking"}
                  className="w-full py-2 rounded-lg text-sm border transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="Radio" size={14} />
                    {pingStatus[t.id] === "checking" ? "Проверяется..." : "Проверить соединение"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Добавить терминал</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>НАЗВАНИЕ</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                  placeholder="Терминал касса №1" />
              </div>
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>IP-АДРЕС ТЕРМИНАЛА</label>
                <input value={form.ip_address} onChange={e => setForm(p => ({...p, ip_address: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg font-mono-bank text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                  placeholder="192.168.1.100" />
              </div>
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ТИП ТЕРМИНАЛА</label>
                <select value={form.terminal_type} onChange={e => setForm(p => ({...p, terminal_type: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  <option value="sber">Сбер</option>
                  <option value="vtb">ВТБ</option>
                  <option value="generic">Универсальный</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={save} disabled={saving || !form.ip_address}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                style={{background: "var(--neon)", color: "#080c12"}}>
                {saving ? "Добавляется..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
