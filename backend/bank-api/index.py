"""Основное API банка АС ЕФС СБОЛ.про — клиенты, счета, транзакции, очередь, отчёты, SMS OTP"""
import json
import os
import random
import string
import psycopg2
from datetime import datetime, timedelta, date

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78173955_bank_client_service_")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }

def auth_emp(event):
    token = (event.get("headers") or {}).get("X-Session-Token", "")
    if not token:
        return None
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f'SELECT e.id, e.role FROM "{SCHEMA}".employee_sessions s JOIN "{SCHEMA}".employees e ON s.employee_id=e.id WHERE s.session_token=%s AND s.expires_at>NOW()',
        (token,)
    )
    row = cur.fetchone(); cur.close(); conn.close()
    return row

def err(msg, code=400, h=None):
    return {"statusCode": code, "headers": h or cors(), "body": json.dumps({"error": msg})}

def ok(data, h=None):
    return {"statusCode": 200, "headers": h or cors(), "body": json.dumps(data)}

def handler(event: dict, context) -> dict:
    h = cors()
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": h, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except:
            pass

    emp = auth_emp(event)
    if not emp:
        return err("Не авторизован", 401)

    emp_id = emp[0]

    # --- CLIENTS ---
    if path.endswith("/clients") and method == "GET":
        return clients_list(params, h)
    if "/clients/" in path and method == "GET":
        return client_get(path.split("/clients/")[-1].rstrip("/"), h)
    if path.endswith("/clients") and method == "POST":
        return client_create(body, emp_id, h)
    if "/clients/" in path and method == "PUT":
        return client_update(path.split("/clients/")[-1].rstrip("/"), body, h)

    # --- ACCOUNTS ---
    if path.endswith("/accounts") and method == "GET":
        return accounts_list(params, h)
    if path.endswith("/accounts") and method == "POST":
        return account_create(body, emp_id, h)
    if "/check_account/" in path and method == "GET":
        return account_check(path.split("/check_account/")[-1].rstrip("/"), h)

    # --- TRANSACTIONS ---
    if path.endswith("/transactions") and method == "GET":
        return transactions_list(params, h)
    if path.endswith("/cash_out") and method == "POST":
        return cash_withdrawal(body, emp_id, h)
    if path.endswith("/cash_in") and method == "POST":
        return cash_deposit(body, emp_id, h)
    if path.endswith("/card_issue") and method == "POST":
        return issue_card(body, emp_id, h)
    if path.endswith("/credit") and method == "POST":
        return create_credit(body, emp_id, h)

    # --- QUEUE ---
    if path.endswith("/queue") and method == "GET":
        return queue_list(h)
    if path.endswith("/queue/next") and method == "POST":
        return queue_next(body, emp_id, h)
    if path.endswith("/queue/add") and method == "POST":
        return queue_add(body, h)
    if path.endswith("/queue/complete") and method == "POST":
        return queue_complete(body, h)
    if path.endswith("/queue/cancel") and method == "POST":
        return queue_cancel(body, h)

    # --- REPORTS ---
    if path.endswith("/reports/dashboard"):
        return reports_dashboard(h)
    if path.endswith("/reports/by_type"):
        return reports_by_type(h)
    if path.endswith("/reports/daily"):
        return reports_daily(h)

    # --- CREDITS LIST ---
    if path.endswith("/credits") and method == "GET":
        return credits_list(params, h)

    # --- SMS OTP ---
    if path.endswith("/sms/send") and method == "POST":
        return sms_send(body, h)
    if path.endswith("/sms/verify") and method == "POST":
        return sms_verify(body, h)

    # --- TERMINALS ---
    if path.endswith("/terminals") and method == "GET":
        return terminals_list(h)
    if path.endswith("/terminals") and method == "POST":
        return terminal_add(body, h)

    return err("Not found", 404)


# ============ CLIENTS ============

def clients_list(params, h):
    search = params.get("search", "")
    conn = get_conn(); cur = conn.cursor()
    if search:
        cur.execute(
            f'SELECT id,full_name,passport_series,passport_number,phone,email,is_verified,created_at,inn,snils FROM "{SCHEMA}".clients WHERE full_name ILIKE %s OR phone ILIKE %s OR passport_number ILIKE %s ORDER BY created_at DESC LIMIT 100',
            (f"%{search}%", f"%{search}%", f"%{search}%")
        )
    else:
        cur.execute(f'SELECT id,full_name,passport_series,passport_number,phone,email,is_verified,created_at,inn,snils FROM "{SCHEMA}".clients ORDER BY created_at DESC LIMIT 100')
    rows = cur.fetchall(); cur.close(); conn.close()
    clients = [{"id":r[0],"full_name":r[1],"passport_series":r[2],"passport_number":r[3],"phone":r[4],"email":r[5],"is_verified":r[6],"created_at":r[7].isoformat() if r[7] else None,"inn":r[8],"snils":r[9]} for r in rows]
    return ok({"clients": clients}, h)

def client_get(cid, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f'SELECT id,full_name,passport_series,passport_number,phone,email,is_verified,created_at,inn,snils,birth_date,address FROM "{SCHEMA}".clients WHERE id=%s', (cid,))
    r = cur.fetchone()
    if not r: cur.close(); conn.close(); return err("Клиент не найден", 404, h)
    cur.execute(f'SELECT id,account_number,account_type,balance,currency,status,opened_at FROM "{SCHEMA}".accounts WHERE client_id=%s', (cid,))
    accs = [{"id":a[0],"account_number":a[1],"account_type":a[2],"balance":float(a[3]),"currency":a[4],"status":a[5],"opened_at":a[6].isoformat() if a[6] else None} for a in cur.fetchall()]
    cur.close(); conn.close()
    return ok({"id":r[0],"full_name":r[1],"passport_series":r[2],"passport_number":r[3],"phone":r[4],"email":r[5],"is_verified":r[6],"created_at":r[7].isoformat() if r[7] else None,"inn":r[8],"snils":r[9],"birth_date":r[10].isoformat() if r[10] else None,"address":r[11],"accounts":accs}, h)

def client_create(body, emp_id, h):
    if not body.get("full_name","").strip(): return err("ФИО обязательно", 400, h)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        f'INSERT INTO "{SCHEMA}".clients (full_name,passport_series,passport_number,phone,email,birth_date,address,inn,snils,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id',
        (body["full_name"],body.get("passport_series"),body.get("passport_number"),body.get("phone"),body.get("email"),body.get("birth_date") or None,body.get("address"),body.get("inn"),body.get("snils"),emp_id)
    )
    new_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"id": new_id, "ok": True}, h)

def client_update(cid, body, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        f'UPDATE "{SCHEMA}".clients SET full_name=%s,passport_series=%s,passport_number=%s,phone=%s,email=%s,birth_date=%s,address=%s,inn=%s,snils=%s,is_verified=%s WHERE id=%s',
        (body.get("full_name"),body.get("passport_series"),body.get("passport_number"),body.get("phone"),body.get("email"),body.get("birth_date") or None,body.get("address"),body.get("inn"),body.get("snils"),body.get("is_verified",False),cid)
    )
    conn.commit(); cur.close(); conn.close()
    return ok({"ok": True}, h)


# ============ ACCOUNTS ============

def accounts_list(params, h):
    client_id = params.get("client_id")
    account_number = params.get("account_number")
    conn = get_conn(); cur = conn.cursor()
    if client_id:
        cur.execute(f'SELECT a.id,a.account_number,a.account_type,a.balance,a.currency,a.status,a.opened_at,c.full_name,c.id,c.phone FROM "{SCHEMA}".accounts a JOIN "{SCHEMA}".clients c ON a.client_id=c.id WHERE a.client_id=%s ORDER BY a.opened_at DESC', (client_id,))
    elif account_number:
        cur.execute(f'SELECT a.id,a.account_number,a.account_type,a.balance,a.currency,a.status,a.opened_at,c.full_name,c.id,c.phone FROM "{SCHEMA}".accounts a JOIN "{SCHEMA}".clients c ON a.client_id=c.id WHERE a.account_number=%s', (account_number,))
    else:
        cur.execute(f'SELECT a.id,a.account_number,a.account_type,a.balance,a.currency,a.status,a.opened_at,c.full_name,c.id,c.phone FROM "{SCHEMA}".accounts a JOIN "{SCHEMA}".clients c ON a.client_id=c.id ORDER BY a.opened_at DESC LIMIT 200')
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"accounts": [{"id":r[0],"account_number":r[1],"account_type":r[2],"balance":float(r[3]),"currency":r[4],"status":r[5],"opened_at":r[6].isoformat() if r[6] else None,"client_name":r[7],"client_id":r[8],"client_phone":r[9]} for r in rows]}, h)

def account_check(acc_number, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT a.id,a.account_number,a.balance,c.full_name,c.phone FROM \"{SCHEMA}\".accounts a JOIN \"{SCHEMA}\".clients c ON a.client_id=c.id WHERE a.account_number=%s AND a.status='active'", (acc_number,))
    r = cur.fetchone(); cur.close(); conn.close()
    if not r: return ok({"exists": False}, h)
    return ok({"exists":True,"id":r[0],"account_number":r[1],"balance":float(r[2]),"client_name":r[3],"client_phone":r[4]}, h)

def account_create(body, emp_id, h):
    if not body.get("client_id"): return err("client_id обязателен", 400, h)
    acc_number = body.get("account_number") or ("40817810" + str(random.randint(10000000000, 99999999999)))
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        f'INSERT INTO "{SCHEMA}".accounts (account_number,client_id,account_type,currency,balance,opened_by) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
        (acc_number, body["client_id"], body.get("account_type","current"), body.get("currency","RUB"), 0.00, emp_id)
    )
    new_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"id": new_id, "account_number": acc_number, "ok": True}, h)


# ============ TRANSACTIONS ============

def transactions_list(params, h):
    client_id = params.get("client_id")
    account_id = params.get("account_id")
    conn = get_conn(); cur = conn.cursor()
    base = f'SELECT t.id,t.transaction_type,t.amount,t.currency,t.status,t.document_number,t.okud_form,t.notes,t.created_at,c.full_name,a.account_number,e.full_name FROM "{SCHEMA}".transactions t LEFT JOIN "{SCHEMA}".clients c ON t.client_id=c.id LEFT JOIN "{SCHEMA}".accounts a ON t.account_id=a.id LEFT JOIN "{SCHEMA}".employees e ON t.employee_id=e.id'
    if client_id:
        cur.execute(base + ' WHERE t.client_id=%s ORDER BY t.created_at DESC LIMIT 100', (client_id,))
    elif account_id:
        cur.execute(base + ' WHERE t.account_id=%s ORDER BY t.created_at DESC LIMIT 100', (account_id,))
    else:
        cur.execute(base + ' ORDER BY t.created_at DESC LIMIT 200')
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"transactions":[{"id":r[0],"type":r[1],"amount":float(r[2]),"currency":r[3],"status":r[4],"document_number":r[5],"okud_form":r[6],"notes":r[7],"created_at":r[8].isoformat() if r[8] else None,"client_name":r[9],"account_number":r[10],"employee_name":r[11]} for r in rows]}, h)

def cash_withdrawal(body, emp_id, h):
    acc_num = body.get("account_number","").strip()
    amount = float(body.get("amount", 0))
    if not acc_num or amount <= 0: return err("Укажите счёт и сумму", 400, h)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT id,client_id,balance FROM \"{SCHEMA}\".accounts WHERE account_number=%s AND status='active'", (acc_num,))
    acc = cur.fetchone()
    if not acc: cur.close(); conn.close(); return err("Счёт не найден или не активен", 404, h)
    if float(acc[2]) < amount: cur.close(); conn.close(); return err("Недостаточно средств", 400, h)
    doc = f"КО-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    cur.execute(f'UPDATE "{SCHEMA}".accounts SET balance=balance-%s WHERE id=%s', (amount, acc[0]))
    cur.execute(f"INSERT INTO \"{SCHEMA}\".transactions (transaction_type,amount,account_id,client_id,employee_id,document_number,okud_form,notes) VALUES ('cash_withdrawal',%s,%s,%s,%s,%s,'0402009',%s) RETURNING id", (amount, acc[0], acc[1], emp_id, doc, body.get("notes","")))
    txn_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"ok":True,"transaction_id":txn_id,"document_number":doc,"okud_form":"0402009","amount":amount,"account_number":acc_num}, h)

def cash_deposit(body, emp_id, h):
    acc_num = body.get("account_number","").strip()
    amount = float(body.get("amount", 0))
    if not acc_num or amount <= 0: return err("Укажите счёт и сумму", 400, h)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT id,client_id FROM \"{SCHEMA}\".accounts WHERE account_number=%s AND status='active'", (acc_num,))
    acc = cur.fetchone()
    if not acc: cur.close(); conn.close(); return err("Счёт не найден или не активен", 404, h)
    doc = f"ПО-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    cur.execute(f'UPDATE "{SCHEMA}".accounts SET balance=balance+%s WHERE id=%s', (amount, acc[0]))
    cur.execute(f"INSERT INTO \"{SCHEMA}\".transactions (transaction_type,amount,account_id,client_id,employee_id,document_number,okud_form,notes) VALUES ('cash_deposit',%s,%s,%s,%s,%s,'0402008',%s) RETURNING id", (amount, acc[0], acc[1], emp_id, doc, body.get("notes","")))
    txn_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"ok":True,"transaction_id":txn_id,"document_number":doc,"okud_form":"0402008","amount":amount,"account_number":acc_num}, h)

def issue_card(body, emp_id, h):
    if not all([body.get("client_id"), body.get("card_number"), body.get("expiry_date")]):
        return err("Заполните все обязательные поля", 400, h)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f'INSERT INTO "{SCHEMA}".cards (card_number,client_id,account_id,expiry_date,issued_by) VALUES (%s,%s,%s,%s,%s) RETURNING id', (body["card_number"],body["client_id"],body.get("account_id"),body["expiry_date"],emp_id))
    card_id = cur.fetchone()[0]
    cur.execute(f"INSERT INTO \"{SCHEMA}\".transactions (transaction_type,amount,client_id,employee_id,document_number,notes) VALUES ('card_issue',0,%s,%s,%s,%s)", (body["client_id"],emp_id,f"CARD-{body['card_number']}",f"Выпуск карты {body['card_number']}"))
    conn.commit(); cur.close(); conn.close()
    return ok({"ok": True, "card_id": card_id}, h)

def create_credit(body, emp_id, h):
    client_id = body.get("client_id")
    amount = float(body.get("amount", 0))
    if not client_id or amount <= 0: return err("Заполните обязательные поля", 400, h)
    term = int(body.get("term_months", 12))
    rate = float(body.get("interest_rate", 15.0))
    credit_type = body.get("credit_type", "credit")
    monthly = round((amount * (rate/100/12)) / (1 - (1 + rate/100/12)**(-term)), 2)
    start = date.today()
    from dateutil.relativedelta import relativedelta
    end = start + relativedelta(months=term)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f'INSERT INTO "{SCHEMA}".credits (client_id,account_id,credit_type,amount,interest_rate,term_months,monthly_payment,start_date,end_date,employee_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id', (client_id,body.get("account_id"),credit_type,amount,rate,term,monthly,start,end,emp_id))
    credit_id = cur.fetchone()[0]
    if body.get("account_id"):
        cur.execute(f'UPDATE "{SCHEMA}".accounts SET balance=balance+%s WHERE id=%s', (amount, body["account_id"]))
        cur.execute(f"INSERT INTO \"{SCHEMA}\".transactions (transaction_type,amount,account_id,client_id,employee_id,notes) VALUES (%s,%s,%s,%s,%s,%s)", (credit_type,amount,body["account_id"],client_id,emp_id,f"Выдача {credit_type}: {amount} руб."))
    conn.commit(); cur.close(); conn.close()
    return ok({"ok":True,"credit_id":credit_id,"monthly_payment":monthly}, h)


# ============ CREDITS LIST ============

def credits_list(params, h):
    client_id = params.get("client_id")
    conn = get_conn(); cur = conn.cursor()
    if client_id:
        cur.execute(f'SELECT cr.id,cr.credit_type,cr.amount,cr.interest_rate,cr.term_months,cr.monthly_payment,cr.start_date,cr.end_date,cr.status,c.full_name,a.account_number FROM "{SCHEMA}".credits cr JOIN "{SCHEMA}".clients c ON cr.client_id=c.id LEFT JOIN "{SCHEMA}".accounts a ON cr.account_id=a.id WHERE cr.client_id=%s ORDER BY cr.created_at DESC', (client_id,))
    else:
        cur.execute(f'SELECT cr.id,cr.credit_type,cr.amount,cr.interest_rate,cr.term_months,cr.monthly_payment,cr.start_date,cr.end_date,cr.status,c.full_name,a.account_number FROM "{SCHEMA}".credits cr JOIN "{SCHEMA}".clients c ON cr.client_id=c.id LEFT JOIN "{SCHEMA}".accounts a ON cr.account_id=a.id ORDER BY cr.created_at DESC LIMIT 100')
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"credits":[{"id":r[0],"credit_type":r[1],"amount":float(r[2]),"interest_rate":float(r[3]) if r[3] else None,"term_months":r[4],"monthly_payment":float(r[5]) if r[5] else None,"start_date":r[6].isoformat() if r[6] else None,"end_date":r[7].isoformat() if r[7] else None,"status":r[8],"client_name":r[9],"account_number":r[10]} for r in rows]}, h)


# ============ QUEUE ============

def queue_list(h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT q.id,q.ticket_number,q.service_type,q.status,q.window_number,q.created_at,q.called_at,c.id,c.full_name,c.phone FROM \"{SCHEMA}\".queue q LEFT JOIN \"{SCHEMA}\".clients c ON q.client_id=c.id WHERE q.status IN ('waiting','serving') ORDER BY q.created_at ASC")
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"queue":[{"id":r[0],"ticket_number":r[1],"service_type":r[2],"status":r[3],"window_number":r[4],"created_at":r[5].isoformat() if r[5] else None,"called_at":r[6].isoformat() if r[6] else None,"client_id":r[7],"client_name":r[8],"client_phone":r[9]} for r in rows]}, h)

def queue_next(body, emp_id, h):
    window = body.get("window_number", 1)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT q.id,q.ticket_number,q.service_type,q.client_id,c.full_name,c.phone FROM \"{SCHEMA}\".queue q LEFT JOIN \"{SCHEMA}\".clients c ON q.client_id=c.id WHERE q.status='waiting' ORDER BY q.created_at ASC LIMIT 1")
    row = cur.fetchone()
    if not row: cur.close(); conn.close(); return ok({"item": None, "message": "Очередь пуста"}, h)
    cur.execute(f"UPDATE \"{SCHEMA}\".queue SET status='serving',window_number=%s,employee_id=%s,called_at=NOW() WHERE id=%s", (window, emp_id, row[0]))
    conn.commit(); cur.close(); conn.close()
    return ok({"item":{"id":row[0],"ticket_number":row[1],"service_type":row[2],"client_id":row[3],"client_name":row[4],"client_phone":row[5]}}, h)

def queue_add(body, h):
    service_type = body.get("service_type", "general")
    client_id = body.get("client_id")
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*)+1 FROM \"{SCHEMA}\".queue WHERE DATE(created_at)=CURRENT_DATE")
    count = cur.fetchone()[0]
    prefix = {"cash_withdrawal":"A","cash_deposit":"B","card_issue":"C","credit":"D","installment":"E","general":"G"}.get(service_type,"G")
    ticket = f"{prefix}{str(count).zfill(3)}"
    cur.execute(f'INSERT INTO "{SCHEMA}".queue (ticket_number,client_id,service_type) VALUES (%s,%s,%s) RETURNING id', (ticket, client_id, service_type))
    new_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"id": new_id, "ticket_number": ticket, "ok": True}, h)

def queue_complete(body, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"UPDATE \"{SCHEMA}\".queue SET status='completed',served_at=NOW() WHERE id=%s", (body.get("id"),))
    conn.commit(); cur.close(); conn.close()
    return ok({"ok": True}, h)

def queue_cancel(body, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"UPDATE \"{SCHEMA}\".queue SET status='cancelled' WHERE id=%s", (body.get("id"),))
    conn.commit(); cur.close(); conn.close()
    return ok({"ok": True}, h)


# ============ REPORTS ============

def reports_dashboard(h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*),COALESCE(SUM(amount),0) FROM \"{SCHEMA}\".transactions WHERE transaction_type='cash_withdrawal' AND DATE(created_at)=CURRENT_DATE")
    wd = cur.fetchone()
    cur.execute(f"SELECT COUNT(*),COALESCE(SUM(amount),0) FROM \"{SCHEMA}\".transactions WHERE transaction_type='cash_deposit' AND DATE(created_at)=CURRENT_DATE")
    dep = cur.fetchone()
    cur.execute(f'SELECT COUNT(*) FROM "{SCHEMA}".clients')
    total_clients = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM \"{SCHEMA}\".accounts WHERE status='active'")
    total_accounts = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM \"{SCHEMA}\".queue WHERE status='waiting'")
    queue_waiting = cur.fetchone()[0]
    cur.execute(f'SELECT COUNT(*),COALESCE(SUM(amount),0) FROM "{SCHEMA}".transactions WHERE DATE(created_at)=CURRENT_DATE')
    today_all = cur.fetchone()
    cur.execute(f"SELECT COUNT(*),COALESCE(SUM(amount),0) FROM \"{SCHEMA}\".credits WHERE status='active'")
    credits_active = cur.fetchone()
    cur.close(); conn.close()
    return ok({"today_withdrawals_count":wd[0],"today_withdrawals_sum":float(wd[1]),"today_deposits_count":dep[0],"today_deposits_sum":float(dep[1]),"total_clients":total_clients,"total_accounts":total_accounts,"queue_waiting":queue_waiting,"today_transactions_count":today_all[0],"today_transactions_sum":float(today_all[1]),"active_credits_count":credits_active[0],"active_credits_sum":float(credits_active[1])}, h)

def reports_by_type(h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT transaction_type,COUNT(*),COALESCE(SUM(amount),0) FROM \"{SCHEMA}\".transactions WHERE DATE(created_at)>=CURRENT_DATE-INTERVAL '30 days' GROUP BY transaction_type")
    rows = cur.fetchall(); cur.close(); conn.close()
    labels = {"cash_withdrawal":"Выдача наличных","cash_deposit":"Взнос наличных","card_issue":"Выпуск карт","credit":"Кредиты","installment":"Рассрочка"}
    return ok({"by_type":[{"type":r[0],"label":labels.get(r[0],r[0]),"count":r[1],"sum":float(r[2])} for r in rows]}, h)

def reports_daily(h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT DATE(created_at) as day,transaction_type,COUNT(*),COALESCE(SUM(amount),0) FROM \"{SCHEMA}\".transactions WHERE DATE(created_at)>=CURRENT_DATE-INTERVAL '14 days' GROUP BY day,transaction_type ORDER BY day ASC")
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"daily":[{"date":r[0].isoformat() if r[0] else None,"type":r[1],"count":r[2],"sum":float(r[3])} for r in rows]}, h)


# ============ SMS OTP ============

def sms_send(body, h):
    phone = body.get("phone","").strip()
    if not phone: return err("Номер телефона обязателен", 400, h)
    code = "".join(random.choices(string.digits, k=4))
    expires = datetime.now() + timedelta(minutes=5)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"UPDATE \"{SCHEMA}\".otp_codes SET is_used=true WHERE phone=%s AND is_used=false", (phone,))
    cur.execute(f"INSERT INTO \"{SCHEMA}\".otp_codes (client_id,phone,code,purpose,expires_at) VALUES (%s,%s,%s,%s,%s) RETURNING id", (body.get("client_id"),phone,code,body.get("purpose","operation_confirm"),expires))
    otp_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"ok":True,"otp_id":otp_id,"demo_code":code,"message":f"SMS отправлено на {phone[:4]}***{phone[-2:] if len(phone)>2 else ''}"}, h)

def sms_verify(body, h):
    phone = body.get("phone","").strip()
    code = body.get("code","").strip()
    if not phone or not code: return err("Телефон и код обязательны", 400, h)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"SELECT id FROM \"{SCHEMA}\".otp_codes WHERE phone=%s AND code=%s AND is_used=false AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1", (phone, code))
    row = cur.fetchone()
    if not row: cur.close(); conn.close(); return err("Неверный код или срок истёк", 400, h)
    cur.execute(f"UPDATE \"{SCHEMA}\".otp_codes SET is_used=true WHERE id=%s", (row[0],))
    conn.commit(); cur.close(); conn.close()
    return ok({"ok":True,"verified":True}, h)


# ============ TERMINALS ============

def terminals_list(h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f'SELECT id,name,ip_address,terminal_type,status,last_ping,created_at FROM "{SCHEMA}".terminals ORDER BY created_at DESC')
    rows = cur.fetchall(); cur.close(); conn.close()
    return ok({"terminals":[{"id":r[0],"name":r[1],"ip_address":r[2],"terminal_type":r[3],"status":r[4],"last_ping":r[5].isoformat() if r[5] else None,"created_at":r[6].isoformat() if r[6] else None} for r in rows]}, h)

def terminal_add(body, h):
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f'INSERT INTO "{SCHEMA}".terminals (name,ip_address,terminal_type,status) VALUES (%s,%s,%s,%s) RETURNING id', (body.get("name"),body.get("ip_address"),body.get("terminal_type","sber"),body.get("status","disconnected")))
    new_id = cur.fetchone()[0]; conn.commit(); cur.close(); conn.close()
    return ok({"id": new_id, "ok": True}, h)
