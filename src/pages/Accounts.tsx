import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Account {
  id: number;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  opened_at?: string;
  client_name?: string;
  client_id?: number;
  client_phone?: string;
}

function formatMoney(n: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency, maximumFractionDigits: 0}).format(n);
}

const ACC_TYPES: Record<string, string> = {
  current: "Расчётный", savings: "Сберегательный", credit: "Кредитный", deposit: "Депозитный"
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: "", account_type: "current", currency: "RUB" });
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{id: number; full_name: string}[]>([]);

  const load = (accountNumber?: string) => {
    setLoading(true);
    api.accounts.list(accountNumber ? { account_number: accountNumber } : undefined).then(r => {
      if (r.ok) setAccounts(r.data.accounts || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search) load(search);
    else load();
  };

  const openCreate = () => {
    api.clients.list().then(r => { if (r.ok) setClients(r.data.clients || []); });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.client_id) return;
    setSaving(true);
    const res = await api.accounts.create({ ...form, client_id: Number(form.client_id) });
    setSaving(false);
    if (res.ok) { setShowModal(false); load(); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Учёт счетов</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
          style={{background: "var(--neon)", color: "#080c12"}}>
          <Icon name="Plus" size={16} />
          Открыть счёт
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: "var(--text-muted)"}} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{background: "var(--surface-2)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
            placeholder="Поиск по номеру счёта..."
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-lg text-sm border"
          style={{borderColor: "var(--border-color)", color: "var(--neon)"}}>Найти</button>
        <button type="button" onClick={() => { setSearch(""); load(); }} className="px-4 py-2.5 rounded-lg text-sm border"
          style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Все</button>
      </form>

      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 border-b text-xs font-mono-bank"
          style={{borderColor: "var(--border-color)", color: "var(--text-muted)"}}>
          <span>НОМЕР СЧЁТА</span>
          <span>КЛИЕНТ</span>
          <span>ТИП</span>
          <span className="text-right">БАЛАНС</span>
          <span className="text-right">СТАТУС</span>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>Загрузка...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="CreditCard" size={40} className="mx-auto mb-3 opacity-30" style={{color: "var(--text-secondary)"}} />
            <p style={{color: "var(--text-muted)"}}>Счета не найдены</p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "var(--border-color)"}}>
            {accounts.map(a => (
              <div key={a.id} className="grid grid-cols-5 px-5 py-4 hover:bg-white/3 transition-all items-center">
                <span className="font-mono-bank text-xs" style={{color: "var(--neon)"}}>{a.account_number}</span>
                <div>
                  <div className="text-sm" style={{color: "var(--text-primary)"}}>{a.client_name || "—"}</div>
                  <div className="text-xs" style={{color: "var(--text-muted)"}}>{a.client_phone || "—"}</div>
                </div>
                <span className="text-sm" style={{color: "var(--text-secondary)"}}>{ACC_TYPES[a.account_type] || a.account_type}</span>
                <span className="text-right font-mono-bank font-bold" style={{
                  color: a.balance > 0 ? "var(--neon)" : "var(--text-muted)"
                }}>{formatMoney(a.balance, a.currency)}</span>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === "active" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                    {a.status === "active" ? "Активен" : a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Открыть новый счёт</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>КЛИЕНТ</label>
                <select value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  <option value="">Выберите клиента</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} (#{c.id})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ТИП СЧЁТА</label>
                <select value={form.account_type} onChange={e => setForm(p => ({...p, account_type: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  {Object.entries(ACC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ВАЛЮТА</label>
                <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                  <option>RUB</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={save} disabled={saving || !form.client_id}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                style={{background: "var(--neon)", color: "#080c12"}}>
                {saving ? "Открывается..." : "Открыть счёт"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
