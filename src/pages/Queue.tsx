import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getState, setState } from "@/lib/store";
import Icon from "@/components/ui/icon";

const SERVICE_LABELS: Record<string, string> = {
  cash_withdrawal: "Выдача наличных",
  cash_deposit: "Взнос наличных",
  card_issue: "Выпуск карты",
  credit: "Кредит",
  installment: "Рассрочка",
  general: "Общий вопрос",
};

const SERVICE_COLORS: Record<string, string> = {
  cash_withdrawal: "var(--danger)",
  cash_deposit: "var(--neon)",
  card_issue: "var(--info)",
  credit: "var(--warning)",
  installment: "var(--warning)",
  general: "var(--text-secondary)",
};

interface QueueItem {
  id: number;
  ticket_number: string;
  service_type: string;
  status: string;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  created_at?: string;
}

export default function Queue({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [clients, setClients] = useState<{id: number; full_name: string}[]>([]);
  const [addForm, setAddForm] = useState({ client_id: "", service_type: "cash_withdrawal" });
  const currentItem = getState().currentQueueItem;

  const load = () => {
    setLoading(true);
    api.queue.list().then(r => {
      if (r.ok) setQueue(r.data.queue || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const takeNext = async () => {
    setTaking(true);
    const res = await api.queue.next(getState().windowNumber);
    setTaking(false);
    if (res.ok && res.data?.item) {
      setState({ currentQueueItem: res.data.item });
      load();
    } else if (res.data?.message) {
      alert(res.data.message);
    }
  };

  const complete = async (id: number) => {
    await api.queue.complete(id);
    if (currentItem?.id === id) setState({ currentQueueItem: null });
    load();
  };

  const cancel = async (id: number) => {
    await api.queue.cancel(id);
    if (currentItem?.id === id) setState({ currentQueueItem: null });
    load();
  };

  const handleAdd = async () => {
    await api.queue.add({ client_id: addForm.client_id ? Number(addForm.client_id) : null, service_type: addForm.service_type });
    setAddModal(false);
    load();
  };

  const openAdd = () => {
    api.clients.list().then(r => {
      if (r.ok) setClients(r.data.clients || []);
    });
    setAddModal(true);
  };

  const serviceToPage = (service: string) => {
    if (service === "cash_withdrawal" || service === "cash_deposit") return "cashier";
    if (service === "credit" || service === "installment") return "credits";
    if (service === "card_issue") return "cashier";
    return "cashier";
  };

  const waitingCount = queue.filter(q => q.status === "waiting").length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Электронная очередь</h2>
          <p className="text-sm mt-0.5" style={{color: "var(--text-muted)"}}>{waitingCount} ожидают · Окно {getState().windowNumber}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all hover:bg-white/5"
            style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>
            <Icon name="Plus" size={16} />
            Добавить в очередь
          </button>
          <button onClick={takeNext} disabled={taking}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold neon-glow-btn transition-all disabled:opacity-50"
            style={{background: "var(--neon)", color: "#080c12"}}>
            <Icon name="UserCheck" size={16} />
            {taking ? "..." : "Взять следующего"}
          </button>
          <button onClick={load} className="p-2 rounded-lg border transition-all hover:bg-white/5"
            style={{borderColor: "var(--border-color)"}}>
            <Icon name="RefreshCw" size={16} style={{color: "var(--text-secondary)"}} />
          </button>
        </div>
      </div>

      {/* Текущий клиент */}
      {currentItem && (
        <div className="neon-border-strong rounded-2xl p-5 mb-6 animate-fade-in" style={{background: "rgba(0,255,136,0.05)"}}>
          <div className="flex items-center gap-2 mb-3">
            <div className="status-online" />
            <span className="text-xs font-mono-bank neon-text">ОБСЛУЖИВАЕТСЯ</span>
            <span className="text-xs font-bold font-mono-bank neon-text">· ТАЛОН {currentItem.ticket_number}</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-bold mb-1" style={{color: "var(--text-primary)"}}>
                {currentItem.client_name || "Клиент не указан"}
              </div>
              <div className="text-sm mb-1" style={{color: "var(--text-secondary)"}}>
                {currentItem.client_phone || "—"}
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded text-xs font-mono-bank"
                  style={{background: `${SERVICE_COLORS[currentItem.service_type] || "var(--text-secondary)"}20`,
                  color: SERVICE_COLORS[currentItem.service_type] || "var(--text-secondary)"}}>
                  {SERVICE_LABELS[currentItem.service_type] || currentItem.service_type}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setState({ currentQueueItem: { ...currentItem, client_id: currentItem.client_id } });
                  onNavigate(serviceToPage(currentItem.service_type));
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
                style={{background: "var(--neon)", color: "#080c12"}}>
                <Icon name="Play" size={14} />
                Выполнить операцию
              </button>
              <button onClick={() => complete(currentItem.id)}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:bg-green-500/10"
                style={{borderColor: "rgba(0,255,136,0.3)", color: "var(--neon)"}}>
                <Icon name="Check" size={14} />
              </button>
              <button onClick={() => cancel(currentItem.id)}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:bg-red-500/10"
                style={{borderColor: "rgba(255,59,92,0.3)", color: "var(--danger)"}}>
                <Icon name="X" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список очереди */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{borderColor: "var(--border-color)"}}>
          <Icon name="List" size={16} style={{color: "var(--text-secondary)"}} />
          <span className="text-sm font-medium" style={{color: "var(--text-primary)"}}>Очередь ожидания</span>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" style={{color: "var(--neon)"}} />
            <p style={{color: "var(--text-muted)"}}>Очередь пуста</p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "var(--border-color)"}}>
            {queue.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/3
                ${item.status === "serving" ? "bg-green-500/5" : ""}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono-bank font-bold text-sm flex-shrink-0"
                  style={{
                    background: item.status === "serving" ? "rgba(0,255,136,0.15)" : "var(--surface-3)",
                    color: item.status === "serving" ? "var(--neon)" : "var(--text-secondary)",
                    border: `1px solid ${item.status === "serving" ? "rgba(0,255,136,0.3)" : "var(--border-color)"}`
                  }}>
                  {idx + 1}
                </div>
                <div className="w-16 font-mono-bank font-bold" style={{color: "var(--neon)"}}>{item.ticket_number}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium mb-0.5" style={{color: "var(--text-primary)"}}>
                    {item.client_name || "Клиент не указан"}
                  </div>
                  <div className="text-xs" style={{color: "var(--text-muted)"}}>{item.client_phone || "—"}</div>
                </div>
                <div className="px-2.5 py-1 rounded-lg text-xs"
                  style={{background: `${SERVICE_COLORS[item.service_type] || "gray"}20`,
                  color: SERVICE_COLORS[item.service_type] || "var(--text-secondary)"}}>
                  {SERVICE_LABELS[item.service_type] || item.service_type}
                </div>
                <div className="flex gap-1">
                  {item.status === "waiting" && (
                    <button onClick={() => cancel(item.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-all"
                      style={{color: "var(--danger)"}}>
                      <Icon name="X" size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модал добавления */}
      {addModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Добавить в очередь</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>УСЛУГА</label>
                <select value={addForm.service_type} onChange={e => setAddForm(p => ({...p, service_type: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>КЛИЕНТ (необязательно)</label>
                <select value={addForm.client_id} onChange={e => setAddForm(p => ({...p, client_id: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  <option value="">— Без клиента —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAddModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={handleAdd}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn"
                style={{background: "var(--neon)", color: "#080c12"}}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
