"""Аутентификация сотрудников банка (АС ЕФС СБОЛ.про)"""
import json
import os
import secrets
from datetime import datetime, timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78173955_bank_client_service_")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "POST" and (path.endswith("/login") or path == "/"):
        return login(event, cors)
    if method == "POST" and path.endswith("/logout"):
        return logout(event, cors)
    if method == "GET" and (path.endswith("/me") or path == "/"):
        return get_me(event, cors)

    return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "Not found"})}


def login(event, cors):
    body = json.loads(event.get("body") or "{}")
    login_val = body.get("login", "").strip()
    password = body.get("password", "").strip()

    if not login_val or not password:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Логин и пароль обязательны"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f'SELECT id, login, password_hash, full_name, role, phone, is_active FROM "{SCHEMA}".employees WHERE login = %s',
        (login_val,)
    )
    row = cur.fetchone()

    if not row:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Неверный логин или пароль"})}

    emp_id, emp_login, pw_hash, full_name, role, phone, is_active = row

    if not is_active:
        cur.close(); conn.close()
        return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Учётная запись заблокирована"})}

    # Проверка пароля (plain:XXXX формат для простоты)
    expected = f"plain:{password}"
    if pw_hash != expected:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Неверный логин или пароль"})}

    token = secrets.token_hex(32)
    expires = datetime.now() + timedelta(hours=12)

    cur.execute(
        f'INSERT INTO "{SCHEMA}".employee_sessions (employee_id, session_token, expires_at) VALUES (%s, %s, %s)',
        (emp_id, token, expires)
    )
    cur.execute(f'UPDATE "{SCHEMA}".employees SET last_login = NOW() WHERE id = %s', (emp_id,))
    conn.commit()
    cur.close(); conn.close()

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "token": token,
            "employee": {
                "id": emp_id,
                "login": emp_login,
                "full_name": full_name,
                "role": role,
                "phone": phone
            }
        })
    }


def logout(event, cors):
    token = event.get("headers", {}).get("X-Session-Token", "")
    if token:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f'DELETE FROM "{SCHEMA}".employee_sessions WHERE session_token = %s', (token,))
        conn.commit()
        cur.close(); conn.close()
    return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}


def get_me(event, cors):
    token = event.get("headers", {}).get("X-Session-Token", "")
    if not token:
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Нет токена"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f'''SELECT e.id, e.login, e.full_name, e.role, e.phone, e.email
            FROM "{SCHEMA}".employee_sessions s
            JOIN "{SCHEMA}".employees e ON s.employee_id = e.id
            WHERE s.session_token = %s AND s.expires_at > NOW()''',
        (token,)
    )
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия недействительна"})}

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "id": row[0], "login": row[1], "full_name": row[2],
            "role": row[3], "phone": row[4], "email": row[5]
        })
    }