import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  document_number?: string;
  okud_form?: string;
  notes?: string;
  created_at?: string;
  client_name?: string;
  account_number?: string;
  employee_name?: string;
}

const TYPE_LABELS: Record<string, string> = {
  cash_withdrawal: "Выдача наличных",
  cash_deposit: "Взнос наличных",
  card_issue: "Выпуск карты",
  credit: "Кредит",
  installment: "Рассрочка",
};

const TYPE_ICONS: Record<string, string> = {
  cash_withdrawal: "ArrowUpFromLine",
  cash_deposit: "ArrowDownToLine",
  card_issue: "CreditCard",
  credit: "TrendingUp",
  installment: "TrendingUp",
};

const TYPE_COLORS: Record<string, string> = {
  cash_withdrawal: "var(--danger)",
  cash_deposit: "var(--neon)",
  card_issue: "var(--info)",
  credit: "var(--warning)",
  installment: "var(--warning)",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency: "RUB", maximumFractionDigits: 0}).format(n);
}

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.transactions.list().then(r => {
      if (r.ok) setTxns(r.data.transactions || []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? txns : txns.filter(t => t.type === filter);
  const totalSum = filtered.filter(t => t.type !== "card_issue").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>История операций</h2>
          <p className="text-sm mt-0.5" style={{color: "var(--text-muted)"}}>
            {filtered.length} записей · {formatMoney(totalSum)}
          </p>
        </div>
        <button onClick={() => { setLoading(true); api.transactions.list().then(r => { if (r.ok) setTxns(r.data.transactions || []); setLoading(false); }); }}
          className="p-2 rounded-lg border" style={{borderColor: "var(--border-color)"}}>
          <Icon name="RefreshCw" size={16} style={{color: "var(--text-secondary)"}} />
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[["all", "Все"], ["cash_withdrawal", "Выдача"], ["cash_deposit", "Взнос"], ["card_issue", "Карты"], ["credit", "Кредиты"]].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === k ? "neon-border" : "surface-card hover:bg-white/5"}`}
            style={{
              background: filter === k ? `${TYPE_COLORS[k] || "var(--neon)"}15` : undefined,
              color: filter === k ? (TYPE_COLORS[k] || "var(--neon)") : "var(--text-secondary)"
            }}>
            {v}
          </button>
        ))}
      </div>

      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 px-5 py-3 border-b text-xs font-mono-bank"
          style={{borderColor: "var(--border-color)", color: "var(--text-muted)"}}>
          <span className="col-span-2">ОПЕРАЦИЯ</span>
          <span>КЛИЕНТ / СЧЁТ</span>
          <span className="text-right">СУММА</span>
          <span className="text-right">ДОКУМЕНТ</span>
          <span className="text-right">ДАТА</span>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Загрузка...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="History" size={40} className="mx-auto mb-3 opacity-30" style={{color: "var(--text-secondary)"}} />
            <p style={{color: "var(--text-muted)"}}>Операции не найдены</p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "var(--border-color)"}}>
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-6 px-5 py-3.5 hover:bg-white/3 transition-all items-center">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{background: `${TYPE_COLORS[t.type] || "gray"}20`}}>
                    <Icon name={TYPE_ICONS[t.type] || "Activity"} size={14}
                      style={{color: TYPE_COLORS[t.type] || "var(--text-secondary)"}} />
                  </div>
                  <div>
                    <div className="text-sm" style={{color: "var(--text-primary)"}}>{TYPE_LABELS[t.type] || t.type}</div>
                    {t.notes && <div className="text-xs" style={{color: "var(--text-muted)"}}>{t.notes}</div>}
                  </div>
                </div>
                <div>
                  <div className="text-sm truncate" style={{color: "var(--text-secondary)"}}>{t.client_name || "—"}</div>
                  {t.account_number && (
                    <div className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>{t.account_number}</div>
                  )}
                </div>
                <div className="text-right">
                  {t.amount > 0 ? (
                    <span className="font-mono-bank font-bold text-sm" style={{color: TYPE_COLORS[t.type] || "var(--neon)"}}>
                      {t.type === "cash_withdrawal" ? "-" : "+"}{formatMoney(t.amount)}
                    </span>
                  ) : (
                    <span className="text-sm" style={{color: "var(--text-muted)"}}>—</span>
                  )}
                </div>
                <div className="text-right">
                  {t.document_number ? (
                    <div>
                      <div className="text-xs font-mono-bank" style={{color: "var(--text-secondary)"}}>{t.document_number}</div>
                      {t.okud_form && <div className="text-xs" style={{color: "var(--text-muted)"}}>ОКУД {t.okud_form}</div>}
                    </div>
                  ) : <span style={{color: "var(--text-muted)"}}>—</span>}
                </div>
                <div className="text-right text-xs" style={{color: "var(--text-muted)"}}>
                  {t.created_at ? new Date(t.created_at).toLocaleString("ru-RU", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
