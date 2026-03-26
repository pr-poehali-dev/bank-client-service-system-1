import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getState } from "@/lib/store";
import Icon from "@/components/ui/icon";
import SmsConfirmModal from "@/components/SmsConfirmModal";

interface Credit {
  id: number;
  credit_type: string;
  amount: number;
  interest_rate?: number;
  term_months?: number;
  monthly_payment?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  client_name?: string;
  account_number?: string;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency: "RUB", maximumFractionDigits: 0}).format(n);
}

const initialForm = {
  client_id: "", account_id: "", credit_type: "credit",
  amount: "", interest_rate: "15", term_months: "12",
  passport: "", full_name: "", client_phone: ""
};

export default function Credits() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...initialForm });
  const [accounts, setAccounts] = useState<{id: number; account_number: string; client_name: string; client_phone: string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ok: boolean; monthly_payment: number} | null>(null);
  const [showSms, setShowSms] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [accExists, setAccExists] = useState<boolean | null>(null);
  const [checkingAcc, setCheckingAcc] = useState(false);
  const [showCreateAcc, setShowCreateAcc] = useState(false);
  const currentItem = getState().currentQueueItem;

  useEffect(() => {
    api.credits.list().then(r => { if (r.ok) setCredits(r.data.credits || []); setLoading(false); });
    api.accounts.list().then(r => { if (r.ok) setAccounts(r.data.accounts || []); });
  }, []);

  const checkAccount = async () => {
    if (!form.account_id) return;
    const acc = accounts.find(a => a.id === Number(form.account_id));
    if (acc) { setAccExists(true); setSmsPhone(acc.client_phone || ""); return; }
    setCheckingAcc(true);
    setAccExists(null);
    setCheckingAcc(false);
    if (accounts.length > 0) setAccExists(true);
    else setAccExists(false);
  };

  useEffect(() => {
    if (form.account_id) checkAccount();
  }, [form.account_id]);

  const monthly = (() => {
    const p = Number(form.amount);
    const r = Number(form.interest_rate) / 100 / 12;
    const n = Number(form.term_months);
    if (!p || !r || !n) return 0;
    return (p * r) / (1 - Math.pow(1 + r, -n));
  })();

  const openModal = () => {
    setForm({ ...initialForm });
    if (currentItem?.client_id) setForm(f => ({...f, client_id: String(currentItem.client_id)}));
    setResult(null);
    setShowModal(true);
  };

  const submit = async () => {
    const acc = accounts.find(a => a.id === Number(form.account_id));
    const phone = acc?.client_phone || form.client_phone;
    if (phone) { setSmsPhone(phone); setShowSms(true); }
    else await performSave();
  };

  const performSave = async () => {
    setSaving(true);
    const res = await api.transactions.credit({
      client_id: Number(form.client_id),
      account_id: form.account_id ? Number(form.account_id) : null,
      credit_type: form.credit_type,
      amount: Number(form.amount),
      interest_rate: Number(form.interest_rate),
      term_months: Number(form.term_months),
    });
    setSaving(false);
    if (res.ok) {
      setResult({ ok: true, monthly_payment: res.data.monthly_payment });
      api.credits.list().then(r => { if (r.ok) setCredits(r.data.credits || []); });
    }
  };

  const createAccount = async () => {
    if (!form.client_id) return;
    const res = await api.accounts.create({ client_id: Number(form.client_id), account_type: "current" });
    if (res.ok) {
      const accsRes = await api.accounts.list();
      if (accsRes.ok) setAccounts(accsRes.data.accounts || []);
      setForm(f => ({...f, account_id: String(res.data.id)}));
      setShowCreateAcc(false);
      setAccExists(true);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Кредиты и рассрочка</h2>
        <button onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
          style={{background: "var(--neon)", color: "#080c12"}}>
          <Icon name="Plus" size={16} />
          Выдать кредит / рассрочку
        </button>
      </div>

      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 border-b text-xs font-mono-bank"
          style={{borderColor: "var(--border-color)", color: "var(--text-muted)"}}>
          <span>КЛИЕНТ</span>
          <span>ТИП</span>
          <span className="text-right">СУММА</span>
          <span className="text-right">ПЛАТЁЖ/МЕС.</span>
          <span className="text-right">СТАТУС</span>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>Загрузка...</div>
        ) : credits.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="TrendingUp" size={40} className="mx-auto mb-3 opacity-30" style={{color: "var(--text-secondary)"}} />
            <p style={{color: "var(--text-muted)"}}>Кредиты не найдены</p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "var(--border-color)"}}>
            {credits.map(c => (
              <div key={c.id} className="grid grid-cols-5 px-5 py-4 hover:bg-white/3 transition-all items-center">
                <div>
                  <div className="text-sm" style={{color: "var(--text-primary)"}}>{c.client_name || "—"}</div>
                  <div className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>{c.account_number || "—"}</div>
                </div>
                <div>
                  <span className="text-sm px-2 py-0.5 rounded"
                    style={{background: "rgba(255,179,64,0.1)", color: "var(--warning)"}}>
                    {c.credit_type === "installment" ? "Рассрочка" : "Кредит"}
                  </span>
                  {c.term_months && <div className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>{c.term_months} мес. · {c.interest_rate}%</div>}
                </div>
                <span className="text-right font-mono-bank font-bold" style={{color: "var(--warning)"}}>{formatMoney(c.amount)}</span>
                <span className="text-right font-mono-bank" style={{color: "var(--text-secondary)"}}>
                  {c.monthly_payment ? formatMoney(c.monthly_payment) : "—"}
                </span>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === "active" ? "text-green-400 bg-green-400/10" : "text-gray-400 bg-gray-400/10"}`}>
                    {c.status === "active" ? "Активен" : c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модал выдачи */}
      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6 neon-border overflow-y-auto max-h-screen" style={{background: "var(--surface-2)"}}>
            {result ? (
              <div className="text-center py-6">
                <Icon name="CheckCircle" size={48} className="neon-text mx-auto mb-3" />
                <div className="font-bold text-lg neon-text mb-2">Кредит выдан!</div>
                <div className="p-4 rounded-xl mb-4" style={{background: "var(--surface-3)"}}>
                  <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Ежемесячный платёж</div>
                  <div className="text-2xl font-bold font-mono-bank" style={{color: "var(--warning)"}}>{formatMoney(result.monthly_payment)}</div>
                </div>
                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-lg text-sm border"
                  style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Закрыть</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>
                  Оформление кредита / рассрочки
                </h3>
                {currentItem && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg neon-border text-sm"
                    style={{background: "rgba(0,255,136,0.05)"}}>
                    <Icon name="User" size={14} className="neon-text" />
                    <span style={{color: "var(--neon)"}}>Клиент очереди: {currentItem.client_name}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СЕРИЯ И № ПАСПОРТА</label>
                      <input value={form.passport} onChange={e => setForm(p => ({...p, passport: e.target.value}))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                        placeholder="4510 123456" />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ФИО КЛИЕНТА</label>
                      <input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                        placeholder="Иванов Иван Иванович" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ID КЛИЕНТА В СИСТЕМЕ</label>
                    <input type="number" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                      placeholder="Введите ID клиента" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-mono-bank" style={{color: "var(--text-secondary)"}}>СЧЁТ / КАРТА ДЛЯ ЗАЧИСЛЕНИЯ</label>
                      <button onClick={() => setShowCreateAcc(true)} className="text-xs" style={{color: "var(--neon)"}}>
                        <Icon name="Plus" size={10} className="inline mr-0.5" />Создать счёт
                      </button>
                    </div>
                    <select value={form.account_id} onChange={e => setForm(p => ({...p, account_id: e.target.value}))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                      <option value="">Выберите счёт</option>
                      {accounts.filter(a => !form.client_id || a.client_id === Number(form.client_id) ||
                        (a as unknown as {client_id: number}).client_id === Number(form.client_id)).map(a => (
                        <option key={a.id} value={a.id}>{a.account_number} · {a.client_name}</option>
                      ))}
                    </select>
                    {form.account_id && accExists === false && (
                      <div className="mt-1 text-xs flex items-center gap-1" style={{color: "var(--danger)"}}>
                        <Icon name="AlertCircle" size={10} />
                        Счёт не найден.
                        <button onClick={() => setShowCreateAcc(true)} className="underline">Создать?</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ТИП</label>
                    <select value={form.credit_type} onChange={e => setForm(p => ({...p, credit_type: e.target.value}))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}>
                      <option value="credit">Кредит</option>
                      <option value="installment">Рассрочка</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СУММА (₽)</label>
                      <input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СТАВКА %</label>
                      <input type="number" value={form.interest_rate} onChange={e => setForm(p => ({...p, interest_rate: e.target.value}))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                        placeholder="15" />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СРОК МЕС.</label>
                      <input type="number" value={form.term_months} onChange={e => setForm(p => ({...p, term_months: e.target.value}))}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                        placeholder="12" />
                    </div>
                  </div>

                  {monthly > 0 && (
                    <div className="p-3 rounded-lg" style={{background: "rgba(255,179,64,0.1)", border: "1px solid rgba(255,179,64,0.3)"}}>
                      <div className="text-xs mb-1" style={{color: "var(--warning)"}}>Ежемесячный платёж (расчёт)</div>
                      <div className="text-xl font-bold font-mono-bank" style={{color: "var(--warning)"}}>
                        {formatMoney(monthly)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                    style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
                  <button onClick={submit} disabled={saving || !form.client_id || !form.amount}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                    style={{background: "var(--warning)", color: "#080c12"}}>
                    {saving ? "Оформляется..." : "Выдать кредит"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSms && (
        <SmsConfirmModal
          phone={smsPhone}
          purpose="credit_confirm"
          onConfirmed={() => { setShowSms(false); performSave(); }}
          onCancel={() => setShowSms(false)}
        />
      )}

      {showCreateAcc && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Создать счёт</h3>
            <p className="text-sm mb-4" style={{color: "var(--text-secondary)"}}>
              Счёт будет создан для клиента #{form.client_id}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateAcc(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={createAccount} disabled={!form.client_id}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                style={{background: "var(--neon)", color: "#080c12"}}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
