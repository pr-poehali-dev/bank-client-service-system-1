// Глобальное хранилище состояния с сохранением в localStorage

export interface Employee {
  id: number;
  login: string;
  full_name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface AppState {
  employee: Employee | null;
  token: string | null;
  currentQueueItem: QueueItem | null;
  windowNumber: number;
}

export interface QueueItem {
  id: number;
  ticket_number: string;
  service_type: string;
  status: string;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  window_number?: number;
  created_at?: string;
  called_at?: string;
}

const STORAGE_KEY = "bank_app_state";

function loadState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveState(state: Partial<AppState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const saved = loadState();

let _state: AppState = {
  employee: saved.employee || null,
  token: localStorage.getItem("bank_token") || null,
  currentQueueItem: saved.currentQueueItem || null,
  windowNumber: saved.windowNumber || 1,
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function getState(): AppState {
  return _state;
}

export function setState(partial: Partial<AppState>) {
  _state = { ..._state, ...partial };
  if (partial.token !== undefined) {
    if (partial.token) {
      localStorage.setItem("bank_token", partial.token);
    } else {
      localStorage.removeItem("bank_token");
    }
  }
  saveState({
    employee: _state.employee,
    currentQueueItem: _state.currentQueueItem,
    windowNumber: _state.windowNumber,
  });
  listeners.forEach(fn => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  const { useState, useEffect } = require("react");
  const [val, setVal] = useState(() => selector(getState()));
  useEffect(() => {
    return subscribe(() => setVal(selector(getState())));
  }, []);
  return val;
}
