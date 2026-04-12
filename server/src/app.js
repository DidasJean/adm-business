const express = require('express');
const cors = require('cors');
const { corsOrigin } = require('./config');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(v => v.trim()) }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'adm-api', ts: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

module.exports = { app };
