import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getState } from "@/lib/store";
import Icon from "@/components/ui/icon";
import SmsConfirmModal from "@/components/SmsConfirmModal";

type OpType = "cash_out" | "cash_in" | "card_issue";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", {style: "currency", currency: "RUB"}).format(n);
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function generateOKUD0402009(data: {
  docNumber: string; date: string; amount: number;
  accountNumber: string; clientName: string; employeeName: string;
}) {
  return `РАСХОДНЫЙ КАССОВЫЙ ОРДЕР
по ОКУД 0402009
════════════════════════════════════════════════════════════════

  Номер документа: ${data.docNumber}
  Дата:            ${data.date}
  Форма ОКУД:      0402009

  Плательщик:      ${data.clientName}
  Счёт:            ${data.accountNumber}
  Сумма:           ${formatMoney(data.amount)}
  Сумма прописью:  (прописью)

════════════════════════════════════════════════════════════════

  Выдать:          ${data.clientName}
  Основание:       Выдача наличных денежных средств

  Кассир:          ${data.employeeName}

  Подпись получателя: _________________________

  Предъявлен паспорт серии _______ № _________
  Выдан: ________________________________________

════════════════════════════════════════════════════════════════
  АС ЕФС СБОЛ.про · ${data.date}
`;
}

function generateOKUD0402008(data: {
  docNumber: string; date: string; amount: number;
  accountNumber: string; clientName: string; employeeName: string;
}) {
  return `ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР
по ОКУД 0402008
════════════════════════════════════════════════════════════════

  Номер документа: ${data.docNumber}
  Дата:            ${data.date}
  Форма ОКУД:      0402008

  Вноситель:       ${data.clientName}
  Счёт:            ${data.accountNumber}
  Сумма:           ${formatMoney(data.amount)}
  Сумма прописью:  (прописью)

════════════════════════════════════════════════════════════════

  Принято от:      ${data.clientName}
  Основание:       Взнос наличных денежных средств

  Кассир:          ${data.employeeName}

  Подпись вносителя: _________________________

════════════════════════════════════════════════════════════════
  АС ЕФС СБОЛ.про · ${data.date}
`;
}

export default function Cashier() {
  const [tab, setTab] = useState<OpType>("cash_out");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [accInfo, setAccInfo] = useState<{exists: boolean; client_name?: string; balance?: number; client_phone?: string; id?: number} | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ok: boolean; document_number?: string; okud_form?: string; amount?: number; account_number?: string} | null>(null);
  const [error, setError] = useState("");
  const [showSms, setShowSms] = useState(false);
  const [createAccountModal, setCreateAccountModal] = useState(false);
  const [createAccountClientId, setCreateAccountClientId] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Карта
  const [cardForm, setCardForm] = useState({ passport: "", full_name: "", phone: "", card_number: "", expiry_date: "", client_id: "" });
  const [cardResult, setCardResult] = useState<{ok: boolean} | null>(null);

  const emp = getState().employee;
  const currentItem = getState().currentQueueItem;

  useEffect(() => {
    if (currentItem?.service_type === "cash_deposit") setTab("cash_in");
    else if (currentItem?.service_type === "card_issue") setTab("card_issue");
    else setTab("cash_out");
  }, [currentItem?.service_type]);

  const checkAccount = async () => {
    if (!accountNumber.trim()) return;
    setChecking(true);
    setAccInfo(null);
    setError("");
    const res = await api.accounts.check(accountNumber.trim());
    setChecking(false);
    if (res.ok) {
      setAccInfo(res.data);
    } else {
      setAccInfo({ exists: false });
    }
  };

  const submitCashOp = async () => {
    if (!accInfo?.exists) { setError("Счёт не найден"); return; }
    if (!amount || Number(amount) <= 0) { setError("Укажите сумму"); return; }
    if (tab === "cash_out" && Number(amount) > (accInfo.balance || 0)) { setError("Недостаточно средств"); return; }

    // Показываем SMS подтверждение
    if (accInfo.client_phone) {
      setShowSms(true);
    } else {
      await performCashOp();
    }
  };

  const performCashOp = async () => {
    setLoading(true);
    setError("");
    const fn = tab === "cash_out" ? api.transactions.cashOut : api.transactions.cashIn;
    const res = await fn({ account_number: accountNumber, amount: Number(amount), notes });
    setLoading(false);
    if (res.ok) {
      setResult(res.data);
      setAccInfo(null);
      setAccountNumber(""); setAmount(""); setNotes("");
    } else {
      setError(res.data?.error || "Ошибка операции");
    }
  };

  const downloadDoc = () => {
    if (!result) return;
    const dateStr = new Date().toLocaleDateString("ru-RU");
    const docData = {
      docNumber: result.document_number || "",
      date: dateStr, amount: result.amount || 0,
      accountNumber: result.account_number || "",
      clientName: accInfo?.client_name || "Клиент",
      employeeName: emp?.full_name || ""
    };
    if (result.okud_form === "0402009") {
      downloadTextFile(generateOKUD0402009(docData), `ОКУД_0402009_${result.document_number}.txt`);
    } else {
      downloadTextFile(generateOKUD0402008(docData), `ОКУД_0402008_${result.document_number}.txt`);
    }
  };

  const submitCard = async () => {
    setLoading(true);
    const res = await api.transactions.cardIssue({
      client_id: cardForm.client_id ? Number(cardForm.client_id) : null,
      card_number: cardForm.card_number,
      expiry_date: cardForm.expiry_date,
    });
    setLoading(false);
    if (res.ok) setCardResult({ ok: true });
    else setError(res.data?.error || "Ошибка выпуска карты");
  };

  const createAccount = async () => {
    if (!createAccountClientId) { setError("Укажите ID клиента"); return; }
    setCreatingAccount(true);
    const res = await api.accounts.create({ client_id: Number(createAccountClientId), account_type: "current" });
    setCreatingAccount(false);
    if (res.ok) {
      setAccountNumber(res.data.account_number);
      setCreateAccountModal(false);
      setCreateAccountClientId("");
      setTimeout(() => checkAccount(), 300);
    } else {
      setError(res.data?.error || "Ошибка создания счёта");
    }
  };

  const tabs: {id: OpType; label: string; icon: string; color: string}[] = [
    { id: "cash_out", label: "Выдача наличных", icon: "ArrowUpFromLine", color: "var(--danger)" },
    { id: "cash_in", label: "Взнос наличных", icon: "ArrowDownToLine", color: "var(--neon)" },
    { id: "card_issue", label: "Выпуск карты", icon: "CreditCard", color: "var(--info)" },
  ];

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{color: "var(--text-primary)"}}>Кассовые операции</h2>
        {currentItem && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg neon-border text-sm"
            style={{background: "rgba(0,255,136,0.05)"}}>
            <Icon name="User" size={14} className="neon-text" />
            <span style={{color: "var(--neon)"}}>Клиент: <strong>{currentItem.client_name}</strong></span>
            <span style={{color: "var(--text-muted)"}}>{currentItem.ticket_number}</span>
          </div>
        )}
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(""); setAccInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "neon-border" : "surface-card hover:bg-white/5"}`}
            style={{
              background: tab === t.id ? `${t.color}15` : undefined,
              color: tab === t.id ? t.color : "var(--text-secondary)"
            }}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Результат */}
      {result && (
        <div className="neon-border rounded-2xl p-5 mb-6 animate-fade-in" style={{background: "rgba(0,255,136,0.05)"}}>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="CheckCircle" size={20} className="neon-text" />
            <span className="font-bold neon-text">Операция выполнена успешно</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="surface-card rounded-lg p-3">
              <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Номер документа</div>
              <div className="font-mono-bank text-sm font-bold" style={{color: "var(--text-primary)"}}>{result.document_number}</div>
            </div>
            <div className="surface-card rounded-lg p-3">
              <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Форма ОКУД</div>
              <div className="font-mono-bank text-sm font-bold" style={{color: "var(--text-primary)"}}>{result.okud_form}</div>
            </div>
            <div className="surface-card rounded-lg p-3">
              <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Сумма</div>
              <div className="font-mono-bank text-sm font-bold" style={{color: "var(--neon)"}}>{formatMoney(result.amount || 0)}</div>
            </div>
            <div className="surface-card rounded-lg p-3">
              <div className="text-xs mb-1" style={{color: "var(--text-muted)"}}>Счёт</div>
              <div className="font-mono-bank text-sm" style={{color: "var(--text-primary)"}}>{result.account_number}</div>
            </div>
          </div>
          <button onClick={downloadDoc}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold neon-glow-btn"
            style={{background: "var(--neon)", color: "#080c12"}}>
            <Icon name="Download" size={16} />
            Скачать документ ОКУД {result.okud_form}
          </button>
        </div>
      )}

      {/* Кассовые операции */}
      {(tab === "cash_out" || tab === "cash_in") && !result && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Icon name={tab === "cash_out" ? "ArrowUpFromLine" : "ArrowDownToLine"} size={18}
              style={{color: tab === "cash_out" ? "var(--danger)" : "var(--neon)"}} />
            <h3 className="font-bold" style={{color: "var(--text-primary)"}}>
              {tab === "cash_out" ? "Выдача наличных" : "Приём взноса наличных"}
            </h3>
          </div>

          {/* Номер счёта */}
          <div className="mb-4">
            <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>
              НОМЕР СЧЁТА КЛИЕНТА
            </label>
            <div className="flex gap-2">
              <input
                value={accountNumber}
                onChange={e => { setAccountNumber(e.target.value); setAccInfo(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg font-mono-bank text-sm outline-none"
                style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                placeholder="40817810XXXXXXXXXX"
                onKeyDown={e => e.key === "Enter" && checkAccount()}
              />
              <button onClick={checkAccount} disabled={checking || !accountNumber}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--neon)"}}>
                {checking ? "..." : "Проверить"}
              </button>
            </div>

            {/* Инфо о счёте */}
            {accInfo && (
              <div className={`mt-2 p-3 rounded-lg ${accInfo.exists ? "neon-border" : "danger-border"}`}
                style={{background: accInfo.exists ? "rgba(0,255,136,0.05)" : "rgba(255,59,92,0.05)"}}>
                {accInfo.exists ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="CheckCircle" size={14} className="neon-text" />
                      <span className="text-sm font-medium" style={{color: "var(--text-primary)"}}>{accInfo.client_name}</span>
                    </div>
                    <div className="text-xs" style={{color: "var(--text-muted)"}}>Баланс: {formatMoney(accInfo.balance || 0)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="AlertCircle" size={14} style={{color: "var(--danger)"}} />
                      <span className="text-sm" style={{color: "var(--danger)"}}>Счёт не найден</span>
                    </div>
                    <button onClick={() => setCreateAccountModal(true)}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold neon-glow-btn"
                      style={{background: "var(--neon)", color: "#080c12"}}>
                      Создать счёт
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Сумма */}
          <div className="mb-4">
            <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>
              СУММА (₽)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg font-mono-bank text-lg outline-none"
              style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
              placeholder="0.00"
              min="0.01"
            />
          </div>

          {/* Примечание */}
          <div className="mb-5">
            <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>
              ПРИМЕЧАНИЕ
            </label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
              placeholder="Необязательно"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg mb-4 danger-border">
              <Icon name="AlertCircle" size={14} style={{color: "var(--danger)"}} />
              <span className="text-sm" style={{color: "var(--danger)"}}>{error}</span>
            </div>
          )}

          <button onClick={submitCashOp} disabled={loading || !accInfo?.exists || !amount}
            className="w-full py-3 rounded-xl text-sm font-bold neon-glow-btn transition-all disabled:opacity-40"
            style={{background: tab === "cash_out" ? "var(--danger)" : "var(--neon)", color: "#080c12"}}>
            {loading ? "Выполняется..." : (
              <span className="flex items-center justify-center gap-2">
                <Icon name={tab === "cash_out" ? "ArrowUpFromLine" : "ArrowDownToLine"} size={16} />
                {tab === "cash_out" ? "Выдать наличные" : "Принять взнос"}
                {accInfo?.client_phone && <Icon name="MessageSquare" size={14} />}
              </span>
            )}
          </button>
          {accInfo?.client_phone && (
            <p className="text-xs text-center mt-2" style={{color: "var(--text-muted)"}}>
              Требуется SMS-подтверждение клиента
            </p>
          )}
        </div>
      )}

      {/* Выпуск карты */}
      {tab === "card_issue" && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Icon name="CreditCard" size={18} style={{color: "var(--info)"}} />
            <h3 className="font-bold" style={{color: "var(--text-primary)"}}>Выпуск банковской карты</h3>
          </div>

          {cardResult ? (
            <div className="text-center py-8">
              <Icon name="CheckCircle" size={48} className="neon-text mx-auto mb-3" />
              <div className="font-bold text-lg neon-text mb-2">Карта выпущена!</div>
              <button onClick={() => setCardResult(null)} className="px-4 py-2 rounded-lg text-sm border"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>
                Новая карта
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СЕРИЯ И НОМЕР ПАСПОРТА</label>
                  <input value={cardForm.passport} onChange={e => setCardForm(p => ({...p, passport: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="4510 123456" />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ФИО КЛИЕНТА</label>
                  <input value={cardForm.full_name} onChange={e => setCardForm(p => ({...p, full_name: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="Иванов Иван Иванович" />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ТЕЛЕФОН</label>
                  <input value={cardForm.phone} onChange={e => setCardForm(p => ({...p, phone: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="+7 (999) 000-00-00" />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>НОМЕР КАРТЫ</label>
                  <input value={cardForm.card_number} onChange={e => setCardForm(p => ({...p, card_number: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg font-mono-bank text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="4276 XXXX XXXX XXXX" />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>СРОК ДЕЙСТВИЯ</label>
                  <input value={cardForm.expiry_date} onChange={e => setCardForm(p => ({...p, expiry_date: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg font-mono-bank text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="MM/YY" />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ID КЛИЕНТА (если есть)</label>
                  <input value={cardForm.client_id} onChange={e => setCardForm(p => ({...p, client_id: e.target.value}))}
                    type="number"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                    placeholder="Необязательно" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg danger-border">
                  <Icon name="AlertCircle" size={14} style={{color: "var(--danger)"}} />
                  <span className="text-sm" style={{color: "var(--danger)"}}>{error}</span>
                </div>
              )}

              <button onClick={submitCard} disabled={loading || !cardForm.card_number || !cardForm.expiry_date}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 neon-glow-btn"
                style={{background: "var(--info)", color: "#080c12"}}>
                {loading ? "Выпуск..." : "Выпустить карту"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SMS Modal */}
      {showSms && accInfo?.client_phone && (
        <SmsConfirmModal
          phone={accInfo.client_phone}
          purpose={tab === "cash_out" ? "cash_withdrawal" : "cash_deposit"}
          onConfirmed={() => { setShowSms(false); performCashOp(); }}
          onCancel={() => setShowSms(false)}
        />
      )}

      {/* Создать счёт Modal */}
      {createAccountModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 neon-border" style={{background: "var(--surface-2)"}}>
            <h3 className="font-bold text-lg mb-4" style={{color: "var(--text-primary)"}}>Создать новый счёт</h3>
            <p className="text-sm mb-4" style={{color: "var(--text-secondary)"}}>
              Счёт <strong>{accountNumber}</strong> не найден. Создайте новый счёт для клиента.
            </p>
            <div className="mb-4">
              <label className="text-xs mb-1.5 block font-mono-bank" style={{color: "var(--text-secondary)"}}>ID КЛИЕНТА</label>
              <input
                type="number"
                value={createAccountClientId}
                onChange={e => setCreateAccountClientId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                style={{background: "var(--surface-3)", border: "1px solid var(--border-color)", color: "var(--text-primary)"}}
                placeholder="Введите ID клиента из системы"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCreateAccountModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm"
                style={{borderColor: "var(--border-color)", color: "var(--text-secondary)"}}>Отмена</button>
              <button onClick={createAccount} disabled={creatingAccount || !createAccountClientId}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold neon-glow-btn disabled:opacity-40"
                style={{background: "var(--neon)", color: "#080c12"}}>
                {creatingAccount ? "Создаётся..." : "Создать счёт"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
