const AUTH_URL = "https://functions.poehali.dev/c12f3278-9b38-49ce-b66e-4fe561eaf3db";
const API_URL = "https://functions.poehali.dev/833d4c37-c346-4764-8cd2-af58963a7432";

function getToken(): string {
  return localStorage.getItem("bank_token") || "";
}

async function authRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${AUTH_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function apiRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Token": getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// AUTH
export const api = {
  auth: {
    login: (login: string, password: string) =>
      authRequest("POST", "/login", { login, password }),
    logout: () =>
      authRequest("POST", "/logout"),
    me: () =>
      authRequest("GET", "/me"),
  },

  clients: {
    list: (search?: string) =>
      apiRequest("GET", `/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: (id: number) => apiRequest("GET", `/clients/${id}`),
    create: (data: object) => apiRequest("POST", "/clients", data),
    update: (id: number, data: object) => apiRequest("PUT", `/clients/${id}`, data),
  },

  accounts: {
    list: (params?: { client_id?: number; account_number?: string }) => {
      const q = new URLSearchParams();
      if (params?.client_id) q.set("client_id", String(params.client_id));
      if (params?.account_number) q.set("account_number", params.account_number);
      return apiRequest("GET", `/accounts${q.toString() ? "?" + q : ""}`);
    },
    check: (account_number: string) =>
      apiRequest("GET", `/check_account/${account_number}`),
    create: (data: object) => apiRequest("POST", "/accounts", data),
  },

  transactions: {
    list: (params?: { client_id?: number; account_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.client_id) q.set("client_id", String(params.client_id));
      if (params?.account_id) q.set("account_id", String(params.account_id));
      return apiRequest("GET", `/transactions${q.toString() ? "?" + q : ""}`);
    },
    cashOut: (data: object) => apiRequest("POST", "/cash_out", data),
    cashIn: (data: object) => apiRequest("POST", "/cash_in", data),
    cardIssue: (data: object) => apiRequest("POST", "/card_issue", data),
    credit: (data: object) => apiRequest("POST", "/credit", data),
  },

  credits: {
    list: (params?: { client_id?: number }) => {
      const q = params?.client_id ? `?client_id=${params.client_id}` : "";
      return apiRequest("GET", `/credits${q}`);
    },
  },

  queue: {
    list: () => apiRequest("GET", "/queue"),
    next: (window_number?: number) =>
      apiRequest("POST", "/queue/next", { window_number: window_number || 1 }),
    add: (data: object) => apiRequest("POST", "/queue/add", data),
    complete: (id: number) => apiRequest("POST", "/queue/complete", { id }),
    cancel: (id: number) => apiRequest("POST", "/queue/cancel", { id }),
  },

  reports: {
    dashboard: () => apiRequest("GET", "/reports/dashboard"),
    byType: () => apiRequest("GET", "/reports/by_type"),
    daily: () => apiRequest("GET", "/reports/daily"),
  },

  sms: {
    send: (phone: string, client_id?: number, purpose?: string) =>
      apiRequest("POST", "/sms/send", { phone, client_id, purpose }),
    verify: (phone: string, code: string) =>
      apiRequest("POST", "/sms/verify", { phone, code }),
  },

  terminals: {
    list: () => apiRequest("GET", "/terminals"),
    add: (data: object) => apiRequest("POST", "/terminals", data),
  },
};
