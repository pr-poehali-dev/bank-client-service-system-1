import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getState } from "@/lib/store";
import Icon from "@/components/ui/icon";

interface DashStats {
  today_withdrawals_count: number;
  today_withdrawals_sum: number;
  today_deposits_count: number;
  today_deposits_sum: number;
  total_clients: number;
  total_accounts: number;
  queue_waiting: number;
  today_transactions_count: number;
  today_transactions_sum: number;
  active_credits_count: number;
  active_credits_sum: number;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
}

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const emp = getState().employee;

  useEffect(() => {
    api.reports.dashboard().then(r => {
      if (r.ok) setStats(r.data);
      setLoading(false);
    });
  }, []);

  const cards = stats ? [
    { label: "Выдача наличных сегодня", value: formatMoney(stats.today_withdrawals_sum), sub: `${stats.today_withdrawals_count} операций`, icon: "ArrowUpFromLine", color: "var(--danger)" },
    { label: "Взнос наличных сегодня", value: formatMoney(stats.today_deposits_sum), sub: `${stats.today_deposits_count} операций`, icon: "ArrowDownToLine", color: "var(--neon)" },
    { label: "Всего клиентов", value: String(stats.total_clients), sub: `${stats.total_accounts} активных счетов`, icon: "Users", color: "var(--info)" },
    { label: "В очереди", value: String(stats.queue_waiting), sub: "ожидают обслуживания", icon: "Clock", color: "var(--warning)" },
    { label: "Операций сегодня", value: String(stats.today_transactions_count), sub: formatMoney(stats.today_transactions_sum), icon: "Activity", color: "var(--neon)" },
    { label: "Активных кредитов", value: String(stats.active_credits_count), sub: formatMoney(stats.active_credits_sum), icon: "TrendingUp", color: "var(--warning)" },
  ] : [];

  const quickActions = [
    { label: "Взять клиента", icon: "UserCheck", page: "queue", color: "var(--neon)" },
    { label: "Выдача наличных", icon: "ArrowUpFromLine", page: "cashier", color: "var(--danger)" },
    { label: "Взнос наличных", icon: "ArrowDownToLine", page: "cashier", color: "#38bdf8" },
    { label: "Добавить клиента", icon: "UserPlus", page: "clients", color: "var(--warning)" },
  ];

  return (
    <div className="animate-fade-in">
      {/* Приветствие */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{color: "var(--text-primary)"}}>
          Добро пожаловать, <span className="neon-text">{emp?.full_name}</span>
        </h1>
        <p className="text-sm" style={{color: "var(--text-secondary)"}}>
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}Рабочее место оператора
        </p>
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {quickActions.map(action => (
          <button key={action.page + action.label} onClick={() => onNavigate(action.page)}
            className="surface-card rounded-xl p-4 flex flex-col items-center gap-2 hover:neon-border transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{background: `${action.color}20`}}>
              <Icon name={action.icon} size={20} style={{color: action.color}} />
            </div>
            <span className="text-xs text-center font-medium" style={{color: "var(--text-secondary)"}}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Статистика */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="surface-card rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="surface-card rounded-xl p-5 hover:neon-border transition-all">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs" style={{color: "var(--text-secondary)"}}>{card.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: `${card.color}20`}}>
                  <Icon name={card.icon} size={16} style={{color: card.color}} />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-bank mb-1" style={{color: card.color}}>{card.value}</div>
              <div className="text-xs" style={{color: "var(--text-muted)"}}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Статус системы */}
      <div className="mt-6 surface-card rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="status-online" />
            <span className="text-sm font-medium" style={{color: "var(--text-primary)"}}>Система работает в штатном режиме</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>
            <span className="flex items-center gap-1"><Icon name="Database" size={12} />БД: ONLINE</span>
            <span className="flex items-center gap-1"><Icon name="Shield" size={12} />TLS: ACTIVE</span>
            <span className="flex items-center gap-1"><Icon name="Lock" size={12} />2FA: ENABLED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
