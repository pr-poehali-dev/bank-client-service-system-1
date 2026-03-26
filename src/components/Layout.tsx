import { useState } from "react";
import Icon from "@/components/ui/icon";
import { getState, setState } from "@/lib/store";
import { api } from "@/lib/api";

interface LayoutProps {
  children: React.ReactNode;
  page: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}

const NAV = [
  { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
  { id: "queue", label: "Очередь", icon: "Users" },
  { id: "cashier", label: "Кассовые операции", icon: "Banknote" },
  { id: "clients", label: "Клиенты", icon: "UserCheck" },
  { id: "accounts", label: "Счета", icon: "CreditCard" },
  { id: "credits", label: "Кредиты и рассрочка", icon: "TrendingUp" },
  { id: "transactions", label: "История операций", icon: "History" },
  { id: "reports", label: "Отчёты и аналитика", icon: "BarChart3" },
  { id: "terminals", label: "Терминалы", icon: "Monitor" },
  { id: "profile", label: "Личный кабинет", icon: "CircleUser" },
];

export default function Layout({ children, page, onNavigate, onLogout }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const emp = getState().employee;

  const handleLogout = async () => {
    await api.auth.logout();
    setState({ employee: null, token: null, currentQueueItem: null });
    localStorage.removeItem("bank_token");
    onLogout();
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="flex h-screen overflow-hidden" style={{background: "var(--surface)"}}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 border-r relative"
        style={{
          width: collapsed ? 64 : 240,
          background: "var(--surface)",
          borderColor: "var(--border-color)",
          minWidth: collapsed ? 64 : 240,
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center gap-3 overflow-hidden" style={{borderColor: "var(--border-color)"}}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 neon-border"
               style={{background: "var(--surface-2)"}}>
            <Icon name="Shield" size={16} className="neon-text" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-bold neon-text font-mono-bank truncate">АС ЕФС СБОЛ.про</div>
              <div className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>v2.1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-all text-left mb-0.5
                ${page === item.id
                  ? "neon-border"
                  : "hover:bg-white/5"
                }`}
              style={{
                background: page === item.id ? "rgba(0,255,136,0.08)" : "transparent",
                color: page === item.id ? "var(--neon)" : "var(--text-secondary)",
                width: collapsed ? "calc(100% - 8px)" : "calc(100% - 8px)",
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={18} style={{flexShrink: 0}} />
              {!collapsed && <span className="text-sm truncate font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Employee info */}
        <div className="p-3 border-t" style={{borderColor: "var(--border-color)"}}>
          {!collapsed ? (
            <div className="surface-card-2 rounded-lg p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="status-online flex-shrink-0" />
                <span className="text-xs truncate font-medium" style={{color: "var(--text-primary)"}}>{emp?.full_name}</span>
              </div>
              <div className="text-xs font-mono-bank mb-2" style={{color: "var(--text-muted)"}}>
                {emp?.role === "senior_operator" ? "Ст. операционист" : emp?.role}
              </div>
              <div className="flex gap-1">
                <button onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs transition-all hover:bg-red-500/20"
                  style={{color: "var(--danger)", border: "1px solid rgba(255,59,92,0.3)"}}>
                  <Icon name="LogOut" size={12} />
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-red-500/10"
              style={{color: "var(--danger)"}}>
              <Icon name="LogOut" size={16} />
            </button>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center z-10 border"
          style={{background: "var(--surface-2)", borderColor: "var(--border-color)", color: "var(--text-secondary)"}}
        >
          <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={12} />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{background: "var(--surface)", borderColor: "var(--border-color)"}}>
          <div className="flex items-center gap-3">
            <Icon name="Building2" size={18} style={{color: "var(--text-secondary)"}} />
            <span className="text-sm font-medium" style={{color: "var(--text-secondary)"}}>
              {NAV.find(n => n.id === page)?.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="Clock" size={14} style={{color: "var(--text-muted)"}} />
              <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>{timeStr} · {dateStr}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background: "var(--surface-2)"}}>
              <div className="status-online" />
              <span className="text-xs font-mono-bank" style={{color: "var(--neon)"}}>{emp?.login}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6" style={{background: "var(--surface)"}}>
          {children}
        </div>
      </main>
    </div>
  );
}
