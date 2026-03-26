import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Client {
  id: number;
  full_name: string;
  passport_series?: string;
  passport_number?: string;
  phone?: string;
  email?: string;
  is_verified: boolean;
  created_at?: string;
  inn?: string;
  snils?: string;
  accounts?: Account[];
  address?: string;
  birth_date?: string;
}

interface Account {
  id: number;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  opened_at?: string;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency: "RUB", maximumFractionDigits: 0}).format(n);
}

const initialForm = {
  full_name: "", passport_series: "", passport_number: "",
  phone: "", email: "", birth_date: "", address: "", inn: "", snils: ""
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...initialForm });
  const [saving, setSaving] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accClientId, setAccClientId] = useState<number | null>(null);

  const load = (s?: string) => {
    setLoading(true);
    api.clients.list(s).then(r => {
      if (r.ok) setClients(r.data.clients || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const selectClient = async (c: Client) => {
    const res = await api.clients.get(c.id);
    if (res.ok) setSelected(res.data);
    else setSelected(c);
  };

  const openCreate = () => {
    setForm({ ...initialForm });
    setShowModal(true);
  };

  const saveClient = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const res = await api.clients.create(form);
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      load(search);
    }
  };

  const createAccount = async () => {
    if (!accClientId) return;
    const res = await api.accounts.create({ client_id: accClientId, account_type: "current" });
    if (res.ok) {
      setShowAccountModal(false);
      if (selected) {
        const fresh = await api.clients.get(selected.id);
        if (fresh.ok) setSelected(fresh.data);
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Клиентская база</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
          style={{background: "var(--neon)", color: "#080c12"}}>
          <Icon name="UserPlus" size={16} />
          Добавить клиента
        </button>
      </div>

      <div className="flex gap-4">
        {/* Список */}
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: "var(--text-muted)"}} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
                style={{background: "var(--surface-2)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                placeholder="Поиск по ФИО, телефону, паспорту..."
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-lg text-sm border"
              style={{borderColor: "var(--border-color)", color: "var(--neon)"}}>Найти</button>
            <button type="button" onClick={() => { setSearch(""); load(); }} className="px-4 py-2.5 rounded-lg text-sm border"
              style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Сброс</button>
          </form>

          <div className="surface-card rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>Загрузка...</div>
            ) : clients.length === 0 ? (
              <div className="p-12 text-center">
                <Icon name="Users" size={40} className="mx-auto mb-3 opacity-30" style={{color: "var(--text-secondary)"}} />
                <p style={{color: "var(--text-muted)"}}>Клиенты не найдены</p>
              </div>
            ) : (
              <div className="divide-y" style={{borderColor: "var(--border-color)"}}>
                {clients.map(c => (
                  <button key={c.id} onClick={() => selectClient(c)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/3
                      ${selected?.id === c.id ? "bg-green-500/5" : ""}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{background: "var(--surface-3)", color: "var(--neon)"}}>
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{color: "var(--text-primary)"}}>{c.full_name}</div>
                      <div className="text-xs" style={{color: "var(--text-muted)"}}>{c.phone || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.is_verified && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          style={{background: "rgba(0,255,136,0.1)", color: "var(--neon)"}}>
                          <Icon name="ShieldCheck" size={10} />
                          ИД
                        </div>
                      )}
                      <span className="text-xs" style={{color: "var(--text-muted)"}}>#{c.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Карточка клиента */}
        {selected && (
          <div className="w-80 flex-shrink-0 animate-slide-in">
            <div className="surface-card rounded-2xl p-5 neon-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{background: "rgba(0,255,136,0.15)", color: "var(--neon)"}}>
                  {selected.full_name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{color: "var(--text-primary)"}}>{selected.full_name}</div>
                  {selected.is_verified && (
                    <div className="flex items-center gap-1 text-xs neon-text">
                      <Icon name="ShieldCheck" size={10} />
                      Верифицирован
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { label: "Паспорт", val: selected.passport_series && selected.passport_number ? `${selected.passport_series} ${selected.passport_number}` : "—" },
                  { label: "Телефон", val: selected.phone || "—" },
                  { label: "Email", val: selected.email || "—" },
                  { label: "ИНН", val: selected.inn || "—" },
                  { label: "СНИЛС", val: selected.snils || "—" },
                  { label: "Адрес", val: selected.address || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span style={{color: "var(--text-muted)"}}>{row.label}</span>
                    <span className="font-mono-bank" style={{color: "var(--text-primary)"}}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Счета */}
              <div className="border-t pt-3" style={{borderColor: "var(--border-color)"}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-bank" style={{color: "var(--text-secondary)"}}>СЧЕТА</span>
                  <button onClick={() => { setAccClientId(selected.id); setShowAccountModal(true); }}
                    className="text-xs flex items-center gap-1" style={{color: "var(--neon)"}}>
                    <Icon name="Plus" size={10} />Открыть
                  </button>
                </div>
                {(selected.accounts || []).length === 0 ? (
                  <div className="text-xs text-center py-2" style={{color: "var(--text-muted)"}}>Нет счетов</div>
                ) : (
                  (selected.accounts || []).map(a => (
                    <div key={a.id} className="p-2 rounded-lg mb-1.5 text-xs"
                      style={{background: "var(--surface-3)"}}>
                      <div className="font-mono-bank mb-0.5" style={{color: "var(--text-primary)"}}>{a.account_number}</div>
                      <div className="flex justify-between">
                        <span style={{color: "var(--text-muted)"}}>{a.account_type}</span>
                        <span className="font-bold" style={{color: "var(--neon)"}}>{formatMoney(a.balance)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => setSelected(null)}
                className="w-full mt-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модал создания клиента */}
      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6 neon-border overflow-y-auto max-h-screen" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Новый клиент</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["full_name", "ФИО", "Иванов Иван Иванович", "2"],
                ["passport_series", "Серия паспорта", "4510", "1"],
                ["passport_number", "Номер паспорта", "123456", "1"],
                ["phone", "Телефон", "+7 (999) 000-00-00", "1"],
                ["email", "Email", "email@mail.ru", "1"],
                ["birth_date", "Дата рождения", "ГГГГ-ММ-ДД", "1"],
                ["inn", "ИНН", "123456789012", "1"],
                ["snils", "СНИЛС", "000-000-000 00", "1"],
                ["address", "Адрес", "г. Москва, ул...", "2"],
              ] as [keyof typeof form, string, string, string][]).map(([key, label, ph, cols]) => (
                <div key={key} className={cols === "2" ? "col-span-2" : ""}>
                  <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>{label.toUpperCase()}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder={ph}
                    type={key === "birth_date" ? "date" : "text"}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={saveClient} disabled={saving || !form.full_name.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                style={{background: "var(--neon)", color: "#080c12"}}>
                {saving ? "Сохраняется..." : "Создать клиента"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал создания счёта */}
      {showAccountModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-2" style={{color: "var(--text-primary)"}}>Открыть счёт</h3>
            <p className="text-sm mb-4" style={{color: "var(--text-secondary)"}}>
              Клиент #{accClientId} · Тип: текущий счёт (RUB)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAccountModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={createAccount}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn"
                style={{background: "var(--neon)", color: "#080c12"}}>Открыть счёт</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
