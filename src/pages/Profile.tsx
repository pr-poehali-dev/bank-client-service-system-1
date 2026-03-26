import { getState } from "@/lib/store";
import Icon from "@/components/ui/icon";

const ROLE_LABELS: Record<string, string> = {
  senior_operator: "Старший операционист",
  operator: "Операционист",
  admin: "Администратор",
  cashier: "Кассир",
};

export default function Profile() {
  const emp = getState().employee;

  if (!emp) return null;

  return (
    <div className="animate-fade-in max-w-2xl">
      <h2 className="text-xl font-bold mb-6" style={{color: "var(--text-primary)"}}>Личный кабинет</h2>

      <div className="surface-card rounded-2xl p-6 neon-border mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{background: "rgba(0,255,136,0.15)", color: "var(--neon)", border: "1px solid rgba(0,255,136,0.3)"}}>
            {emp.full_name.charAt(0)}
          </div>
          <div>
            <div className="text-xl font-bold" style={{color: "var(--text-primary)"}}>{emp.full_name}</div>
            <div className="text-sm mt-0.5" style={{color: "var(--neon)"}}>
              {ROLE_LABELS[emp.role] || emp.role}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-online" />
              <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>СЕССИЯ АКТИВНА</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Логин", val: emp.login, icon: "User" },
            { label: "Роль", val: ROLE_LABELS[emp.role] || emp.role, icon: "Shield" },
            { label: "Телефон", val: emp.phone || "—", icon: "Phone" },
            { label: "Email", val: emp.email || "—", icon: "Mail" },
            { label: "ID сотрудника", val: `#${emp.id}`, icon: "Hash" },
          ].map(row => (
            <div key={row.label} className="p-3 rounded-xl" style={{background: "var(--surface-3)"}}>
              <div className="flex items-center gap-2 mb-1">
                <Icon name={row.icon} size={12} style={{color: "var(--text-muted)"}} />
                <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>{row.label.toUpperCase()}</span>
              </div>
              <div className="text-sm font-medium" style={{color: "var(--text-primary)"}}>{row.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card rounded-2xl p-5">
        <div className="text-sm font-medium mb-3" style={{color: "var(--text-primary)"}}>Безопасность</div>
        <div className="space-y-3">
          {[
            { icon: "Shield", label: "Двухфакторная аутентификация", status: "Включена", color: "var(--neon)" },
            { icon: "Lock", label: "Шифрование сессии (256-bit TLS)", status: "Активно", color: "var(--neon)" },
            { icon: "MessageSquare", label: "SMS-подтверждение операций", status: "Включено", color: "var(--neon)" },
            { icon: "Eye", label: "Журнал аудита", status: "Ведётся", color: "var(--info)" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl"
              style={{background: "var(--surface-3)"}}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{background: `${item.color}15`}}>
                  <Icon name={item.icon} size={16} style={{color: item.color}} />
                </div>
                <span className="text-sm" style={{color: "var(--text-secondary)"}}>{item.label}</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono-bank"
                style={{background: `${item.color}15`, color: item.color}}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
