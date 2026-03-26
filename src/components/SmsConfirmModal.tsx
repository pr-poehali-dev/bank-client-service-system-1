import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface SmsConfirmModalProps {
  phone: string;
  clientId?: number;
  purpose?: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

export default function SmsConfirmModal({
  phone, clientId, purpose = "operation_confirm",
  onConfirmed, onCancel
}: SmsConfirmModalProps) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent] = useState(false);

  const sendCode = async () => {
    setSending(true);
    setError("");
    const res = await api.sms.send(phone, clientId, purpose);
    setSending(false);
    if (res.ok) {
      setSent(true);
      setDemoCode(res.data?.demo_code || "");
      setCountdown(60);
    } else {
      setError(res.data?.error || "Ошибка отправки SMS");
    }
  };

  useEffect(() => {
    sendCode();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = async () => {
    if (code.length < 4) return;
    setVerifying(true);
    setError("");
    const res = await api.sms.verify(phone, code);
    setVerifying(false);
    if (res.ok && res.data?.verified) {
      onConfirmed();
    } else {
      setError(res.data?.error || "Неверный код");
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fade-in">
      <div className="w-full max-w-sm mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: "rgba(0,255,136,0.1)"}}>
            <Icon name="MessageSquare" size={20} className="neon-text" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{color: "var(--text-primary)"}}>SMS-подтверждение</div>
            <div className="text-xs" style={{color: "var(--text-muted)"}}>Верификация операции клиента</div>
          </div>
        </div>

        <div className="p-3 rounded-lg mb-4" style={{background: "var(--surface-3)", border: "1px solid var(--border-color)"}}>
          <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Номер телефона клиента</div>
          <div className="font-mono-bank text-sm" style={{color: "var(--neon)"}}>{phone}</div>
        </div>

        {demoCode && (
          <div className="p-3 rounded-lg mb-4 warning-border">
            <div className="text-xs mb-1" style={{color: "var(--warning)"}}>ДЕМО-режим: код для тестирования</div>
            <div className="font-mono-bank text-2xl font-bold tracking-widest" style={{color: "var(--warning)"}}>{demoCode}</div>
          </div>
        )}

        {sent && (
          <div className="mb-4">
            <label className="block text-xs mb-1.5 font-mono-bank" style={{color: "var(--text-secondary)"}}>
              КОД ИЗ SMS
            </label>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-lg font-mono-bank text-2xl tracking-widest text-center outline-none"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)"
              }}
              placeholder="• • • •"
              autoFocus
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg mb-4 danger-border">
            <Icon name="AlertCircle" size={14} style={{color: "var(--danger)"}} />
            <span className="text-xs" style={{color: "var(--danger)"}}>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm border transition-all hover:bg-white/5"
            style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>
            Отмена
          </button>
          {sent ? (
            <button
              onClick={verify}
              disabled={verifying || code.length < 4}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 neon-glow-btn"
              style={{background: "var(--neon)", color: "#080c12"}}
            >
              {verifying ? "Проверка..." : "Подтвердить"}
            </button>
          ) : (
            <button onClick={sendCode} disabled={sending || countdown > 0}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{background: "var(--surface-3)", color: "var(--text-secondary)"}}>
              {countdown > 0 ? `Повтор (${countdown}с)` : "Отправить"}
            </button>
          )}
        </div>
        {sent && countdown > 0 && (
          <div className="text-center mt-2 text-xs" style={{color: "var(--text-muted)"}}>
            Повторная отправка через {countdown} с.
          </div>
        )}
      </div>
    </div>
  );
}
