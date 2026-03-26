
CREATE TABLE "t_p78173955_bank_client_service_".employees (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE TABLE "t_p78173955_bank_client_service_".clients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    passport_series VARCHAR(10),
    passport_number VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    birth_date DATE,
    address TEXT,
    inn VARCHAR(20),
    snils VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id)
);

CREATE TABLE "t_p78173955_bank_client_service_".accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    account_type VARCHAR(30) DEFAULT 'current',
    currency VARCHAR(10) DEFAULT 'RUB',
    balance DECIMAL(18,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    opened_at TIMESTAMP DEFAULT NOW(),
    opened_by INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id)
);

CREATE TABLE "t_p78173955_bank_client_service_".cards (
    id SERIAL PRIMARY KEY,
    card_number VARCHAR(20) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    account_id INTEGER REFERENCES "t_p78173955_bank_client_service_".accounts(id),
    card_type VARCHAR(30) DEFAULT 'debit',
    expiry_date VARCHAR(10),
    status VARCHAR(20) DEFAULT 'active',
    issued_at TIMESTAMP DEFAULT NOW(),
    issued_by INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id)
);

CREATE TABLE "t_p78173955_bank_client_service_".transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    account_id INTEGER REFERENCES "t_p78173955_bank_client_service_".accounts(id),
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    employee_id INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id),
    document_number VARCHAR(50),
    okud_form VARCHAR(20),
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "t_p78173955_bank_client_service_".credits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    account_id INTEGER REFERENCES "t_p78173955_bank_client_service_".accounts(id),
    credit_type VARCHAR(30) DEFAULT 'credit',
    amount DECIMAL(18,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    term_months INTEGER,
    monthly_payment DECIMAL(18,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    employee_id INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "t_p78173955_bank_client_service_".queue (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL,
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    service_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    window_number INTEGER,
    employee_id INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id),
    called_at TIMESTAMP,
    served_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "t_p78173955_bank_client_service_".otp_codes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES "t_p78173955_bank_client_service_".clients(id),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "t_p78173955_bank_client_service_".employee_sessions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES "t_p78173955_bank_client_service_".employees(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "t_p78173955_bank_client_service_".terminals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    ip_address VARCHAR(50),
    terminal_type VARCHAR(50) DEFAULT 'sber',
    status VARCHAR(20) DEFAULT 'disconnected',
    last_ping TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO "t_p78173955_bank_client_service_".employees (login, password_hash, full_name, role, phone, is_active)
VALUES ('TIMA34', 'plain:2014', 'Шевченко Тимофей', 'senior_operator', '+79990000000', true);

INSERT INTO "t_p78173955_bank_client_service_".clients (full_name, passport_series, passport_number, phone, email, is_verified, created_by)
VALUES 
('Иванов Иван Иванович', '4510', '123456', '+79051234567', 'ivanov@mail.ru', true, 1),
('Петрова Мария Сергеевна', '4511', '654321', '+79169876543', 'petrova@gmail.com', true, 1),
('Сидоров Алексей Петрович', '4512', '111222', '+79265554433', 'sidorov@yandex.ru', false, 1);

INSERT INTO "t_p78173955_bank_client_service_".accounts (account_number, client_id, account_type, balance, opened_by)
VALUES 
('40817810000000000001', 1, 'current', 125000.00, 1),
('40817810000000000002', 2, 'current', 45500.50, 1),
('40817810000000000003', 1, 'savings', 300000.00, 1);

INSERT INTO "t_p78173955_bank_client_service_".queue (ticket_number, client_id, service_type, status)
VALUES 
('A001', 1, 'cash_withdrawal', 'waiting'),
('A002', 2, 'cash_deposit', 'waiting'),
('A003', 3, 'card_issue', 'waiting');
