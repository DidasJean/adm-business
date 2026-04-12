const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
      password_hash TEXT NOT NULL,
      linked_client_id TEXT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
      avatar TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('debt', 'payment')),
      amount_fc NUMERIC(14,2) NOT NULL,
      amount_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
      exchange_rate NUMERIC(14,2) NOT NULL DEFAULT 2700,
      payment_method TEXT NULL,
      description TEXT,
      reference TEXT,
      payload JSONB,
      happened_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      transaction_id TEXT NULL REFERENCES transactions(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('debt', 'payment', 'info')),
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'client')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
    CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
  `);

  const adminCheck = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (adminCheck.rowCount === 0) {
    const hash = await bcrypt.hash('ADM123', 10);
    await pool.query(
      `INSERT INTO users (id, username, display_name, role, password_hash, active)
       VALUES ($1, $2, $3, 'admin', $4, TRUE)`,
      ['user_admin', 'admin', 'Administrateur', hash]
    );
  }
}

module.exports = { ensureSchema };

