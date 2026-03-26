import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency: "RUB", maximumFractionDigits: 0}).format(n);
}

const COLORS = ["#00ff88", "#ff3b5c", "#38bdf8", "#ffb340", "#a78bfa"];

const TYPE_LABELS: Record<string, string> = {
  cash_withdrawal: "Выдача", cash_deposit: "Взнос",
  card_issue: "Карты", credit: "Кредиты", installment: "Рассрочка"
};

export default function Reports() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [byType, setByType] = useState<{type: string; label: string; count: number; sum: number}[]>([]);
  const [daily, setDaily] = useState<{date: string; type: string; count: number; sum: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.reports.dashboard(),
      api.reports.byType(),
      api.reports.daily(),
    ]).then(([d, bt, dl]) => {
      if (d.ok) setStats(d.data);
      if (bt.ok) setByType(bt.data.by_type || []);
      if (dl.ok) setDaily(dl.data.daily || []);
      setLoading(false);
    });
  }, []);

  const dailyChartData = (() => {
    const map: Record<string, Record<string, number>> = {};
    daily.forEach(d => {
      if (!map[d.date]) map[d.date] = {};
      map[d.date][d.type] = d.sum;
    });
    return Object.entries(map).map(([date, vals]) => ({
      date: date.slice(5), ...vals
    })).slice(-14);
  })();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{color: "var(--text-primary)"}}>Отчёты и аналитика</h2>
        <span className="text-sm" style={{color: "var(--text-muted)"}}>
          {new Date().toLocaleDateString("ru-RU")}
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{color: "var(--text-muted)"}}>
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Загрузка аналитики...
        </div>
      ) : (
        <>
          {/* Показатели дня */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Выдача нал. сегодня", val: formatMoney(stats.today_withdrawals_sum), sub: `${stats.today_withdrawals_count} оп.`, color: "var(--danger)", icon: "ArrowUpFromLine" },
                { label: "Взнос нал. сегодня", val: formatMoney(stats.today_deposits_sum), sub: `${stats.today_deposits_count} оп.`, color: "var(--neon)", icon: "ArrowDownToLine" },
                { label: "Транзакций сегодня", val: String(stats.today_transactions_count), sub: formatMoney(stats.today_transactions_sum), color: "var(--info)", icon: "Activity" },
                { label: "Активных кредитов", val: String(stats.active_credits_count), sub: formatMoney(stats.active_credits_sum), color: "var(--warning)", icon: "TrendingUp" },
              ].map((s, i) => (
                <div key={i} className="surface-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{color: "var(--text-muted)"}}>{s.label}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background: `${s.color}20`}}>
                      <Icon name={s.icon} size={14} style={{color: s.color}} />
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono-bank" style={{color: s.color}}>{s.val}</div>
                  <div className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Pie chart */}
            <div className="surface-card rounded-xl p-4">
              <div className="text-sm font-medium mb-3" style={{color: "var(--text-primary)"}}>Структура операций (30 дн.)</div>
              {byType.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={byType} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                        {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val: number) => [val, "операций"]}
                        contentStyle={{background:"var(--surface-2)",border:"1px solid var(--border-color)",borderRadius:8,color:"var(--text-primary)"}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {byType.map((item, i) => (
                      <div key={item.type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{background: COLORS[i % COLORS.length]}} />
                          <span style={{color: "var(--text-secondary)"}}>{TYPE_LABELS[item.type] || item.type}</span>
                        </div>
                        <span style={{color: "var(--text-muted)"}}>{item.count} оп.</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm" style={{color: "var(--text-muted)"}}>Нет данных</div>
              )}
            </div>

            {/* Bar chart */}
            <div className="surface-card rounded-xl p-4 col-span-2">
              <div className="text-sm font-medium mb-3" style={{color: "var(--text-primary)"}}>Суммы по типам (30 дн.)</div>
              {byType.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byType} margin={{top: 4, right: 4, left: 0, bottom: 4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{fill: "var(--text-muted)", fontSize: 10}} />
                    <YAxis tick={{fill: "var(--text-muted)", fontSize: 10}} />
                    <Tooltip
                      formatter={(val: number) => [formatMoney(val), "Сумма"]}
                      contentStyle={{background:"var(--surface-2)",border:"1px solid var(--border-color)",borderRadius:8,color:"var(--text-primary)"}} />
                    <Bar dataKey="sum" radius={[4,4,0,0]}>
                      {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm" style={{color: "var(--text-muted)"}}>Нет данных за период</div>
              )}
            </div>
          </div>

          {/* Line chart */}
          <div className="surface-card rounded-xl p-4">
            <div className="text-sm font-medium mb-3" style={{color: "var(--text-primary)"}}>Динамика за 14 дней</div>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{fill: "var(--text-muted)", fontSize: 10}} />
                  <YAxis tick={{fill: "var(--text-muted)", fontSize: 10}} />
                  <Tooltip
                    formatter={(val: number) => [formatMoney(val)]}
                    contentStyle={{background:"var(--surface-2)",border:"1px solid var(--border-color)",borderRadius:8,color:"var(--text-primary)"}} />
                  <Line type="monotone" dataKey="cash_withdrawal" stroke="var(--danger)" strokeWidth={2} dot={false} name="Выдача" />
                  <Line type="monotone" dataKey="cash_deposit" stroke="var(--neon)" strokeWidth={2} dot={false} name="Взнос" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm" style={{color: "var(--text-muted)"}}>Нет данных за период</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
