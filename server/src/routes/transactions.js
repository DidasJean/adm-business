const express = require('express');
const { z } = require('zod');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { id } = require('../utils/ids');

const router = express.Router();

const transactionSchema = z.object({
  clientId: z.string().min(1),
  type: z.enum(['debt', 'payment']),
  amountFC: z.number().positive(),
  amountUSD: z.number().nonnegative().default(0),
  exchangeRate: z.number().positive().default(2700),
  paymentMethod: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  happenedAt: z.string(),
  payload: z.any().optional(),
});

router.get('/', requireAuth, async (req, res) => {
  let result;
  if (req.user.role === 'client' && req.user.linkedClientId) {
    result = await pool.query(
      `SELECT * FROM transactions WHERE client_id = $1 ORDER BY happened_at DESC, created_at DESC`,
      [req.user.linkedClientId]
    );
  } else {
    result = await pool.query(`SELECT * FROM transactions ORDER BY happened_at DESC, created_at DESC`);
  }
  return res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;
  const txId = id('tx');

  const insertTx = await pool.query(
    `INSERT INTO transactions (
      id, client_id, type, amount_fc, amount_usd, exchange_rate, payment_method,
      description, reference, payload, happened_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      txId,
      data.clientId,
      data.type,
      data.amountFC,
      data.amountUSD || 0,
      data.exchangeRate || 2700,
      data.paymentMethod || null,
      data.description || '',
      data.reference || '',
      data.payload || null,
      data.happenedAt,
    ]
  );

  const label = data.type === 'debt' ? 'Nouvelle dette' : 'Nouveau paiement';
  const notifId = id('notif');
  await pool.query(
    `INSERT INTO notifications (id, client_id, transaction_id, title, message, type, read)
     VALUES ($1,$2,$3,$4,$5,$6,FALSE)`,
    [
      notifId,
      data.clientId,
      txId,
      label,
      `${label}: ${Number(data.amountFC).toLocaleString('fr-FR')} FC`,
      data.type,
    ]
  );

  const io = req.app.locals.io;
  if (io) {
    io.to(`client:${data.clientId}`).emit('transaction:new', { transactionId: txId, clientId: data.clientId, type: data.type });
    io.to('admins').emit('transaction:new', { transactionId: txId, clientId: data.clientId, type: data.type });
    io.to(`client:${data.clientId}`).emit('notification:new', { clientId: data.clientId, type: data.type });
    io.to('admins').emit('notification:new', { clientId: data.clientId, type: data.type });
  }

  return res.status(201).json(insertTx.rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;

  const updateTx = await pool.query(
    `UPDATE transactions SET
      client_id=$2, type=$3, amount_fc=$4, amount_usd=$5, exchange_rate=$6,
      payment_method=$7, description=$8, reference=$9, payload=$10,
      happened_at=$11, updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [
      req.params.id,
      data.clientId,
      data.type,
      data.amountFC,
      data.amountUSD || 0,
      data.exchangeRate || 2700,
      data.paymentMethod || null,
      data.description || '',
      data.reference || '',
      data.payload || null,
      data.happenedAt,
    ]
  );
  if (updateTx.rowCount === 0) return res.status(404).json({ error: 'Transaction introuvable' });

  const io = req.app.locals.io;
  if (io) {
    io.to(`client:${data.clientId}`).emit('transaction:updated', { transactionId: req.params.id, clientId: data.clientId });
    io.to('admins').emit('transaction:updated', { transactionId: req.params.id, clientId: data.clientId });
  }
  return res.json(updateTx.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const existing = await pool.query(`SELECT id, client_id FROM transactions WHERE id = $1 LIMIT 1`, [req.params.id]);
  if (existing.rowCount === 0) return res.status(404).json({ error: 'Transaction introuvable' });
  await pool.query(`DELETE FROM transactions WHERE id = $1`, [req.params.id]);

  const clientId = existing.rows[0].client_id;
  const io = req.app.locals.io;
  if (io) {
    io.to(`client:${clientId}`).emit('transaction:deleted', { transactionId: req.params.id, clientId });
    io.to('admins').emit('transaction:deleted', { transactionId: req.params.id, clientId });
  }

  return res.json({ ok: true });
});

module.exports = router;
