import { useState } from "react";
import { api } from "@/lib/api";
import { setState } from "@/lib/store";
import Icon from "@/components/ui/icon";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.auth.login(login, password);
    setLoading(false);
    if (res.ok && res.data?.token) {
      setState({ token: res.data.token, employee: res.data.employee });
      onLogin();
    } else {
      setError(res.data?.error || "Ошибка авторизации");
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center relative overflow-hidden">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-5" style={{background: "radial-gradient(circle, #00ff88, transparent)"}} />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-5" style={{background: "radial-gradient(circle, #00ff88, transparent)"}} />
      </div>

      <div className="w-full max-w-md px-6 animate-fade-in">
        {/* Логотип */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 neon-border-strong relative"
               style={{background: "linear-gradient(135deg, #0d1117, #131920)"}}>
            <Icon name="Shield" size={40} className="neon-text" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 pulse-neon border-2 border-background" />
          </div>
          <h1 className="text-3xl font-bold neon-text font-mono-bank tracking-wider">АС ЕФС СБОЛ.про</h1>
          <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>Автоматизированная система единого фронта сервисов</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="status-online" />
            <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>СИСТЕМА АКТИВНА</span>
          </div>
        </div>

        {/* Форма */}
        <div className="surface-card rounded-2xl p-8 neon-border">
          <div className="flex items-center gap-2 mb-6">
            <Icon name="Lock" size={16} className="neon-text" />
            <span className="text-sm font-mono-bank" style={{color: "var(--text-secondary)"}}>АВТОРИЗАЦИЯ СОТРУДНИКА</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 font-mono-bank" style={{color: "var(--text-secondary)"}}>
                ИДЕНТИФИКАТОР
              </label>
              <div className="relative">
                <Icon name="User" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: "var(--text-muted)"}} />
                <input
                  type="text"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg font-mono-bank text-sm outline-none transition-all"
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }}
                  placeholder="Введите логин"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-mono-bank" style={{color: "var(--text-secondary)"}}>
                КОД ДОСТУПА
              </label>
              <div className="relative">
                <Icon name="Key" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: "var(--text-muted)"}} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg font-mono-bank text-sm outline-none transition-all"
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                  <Icon name={showPass ? "EyeOff" : "Eye"} size={16} style={{color: "var(--text-secondary)"}} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg danger-border animate-fade-in">
                <Icon name="AlertCircle" size={14} style={{color: "var(--danger)"}} />
                <span className="text-xs" style={{color: "var(--danger)"}}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !login || !password}
              className="w-full py-3 rounded-lg font-bold font-mono-bank text-sm mt-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed neon-glow-btn"
              style={{background: "var(--neon)", color: "#080c12"}}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ПРОВЕРКА...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="LogIn" size={16} />
                  ВОЙТИ В СИСТЕМУ
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{borderColor: "var(--border-color)"}}>
            <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>v2.1.0 STABLE</span>
            <div className="flex items-center gap-1.5">
              <Icon name="Shield" size={12} style={{color: "var(--neon)"}} />
              <span className="text-xs font-mono-bank" style={{color: "var(--text-muted)"}}>256-BIT ENC</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{color: "var(--text-muted)"}}>
          © 2025 АС ЕФС СБОЛ.про · Для внутреннего использования
        </p>
      </div>
    </div>
  );
}
