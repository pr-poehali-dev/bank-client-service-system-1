import { useState, useEffect } from "react";
import { getState, setState } from "@/lib/store";
import Login from "./Login";
import Layout from "@/components/Layout";
import Dashboard from "./Dashboard";
import Queue from "./Queue";
import Cashier from "./Cashier";
import Clients from "./Clients";
import Accounts from "./Accounts";
import Credits from "./Credits";
import Transactions from "./Transactions";
import Reports from "./Reports";
import Terminals from "./Terminals";
import Profile from "./Profile";

export default function Index() {
  const [authed, setAuthed] = useState(!!getState().token);
  const [page, setPage] = useState("dashboard");

  // Сохраняем все изменения при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = getState();
      localStorage.setItem("bank_app_state", JSON.stringify({
        employee: state.employee,
        currentQueueItem: state.currentQueueItem,
        windowNumber: state.windowNumber,
      }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "queue": return <Queue onNavigate={setPage} />;
      case "cashier": return <Cashier />;
      case "clients": return <Clients />;
      case "accounts": return <Accounts />;
      case "credits": return <Credits />;
      case "transactions": return <Transactions />;
      case "reports": return <Reports />;
      case "terminals": return <Terminals />;
      case "profile": return <Profile />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <Layout page={page} onNavigate={setPage} onLogout={() => { setState({ token: null, employee: null }); setAuthed(false); }}>
      {renderPage()}
    </Layout>
  );
}
