const express = require('express');
const { z } = require('zod');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { id } = require('../utils/ids');

const router = express.Router();

const messageSchema = z.object({
  clientId: z.string().optional(),
  body: z.string().min(1).max(2000),
});

router.get('/', requireAuth, async (req, res) => {
  if (req.user.role === 'client') {
    if (!req.user.linkedClientId) return res.json([]);
    const result = await pool.query(
      `SELECT * FROM messages WHERE client_id = $1 ORDER BY created_at ASC`,
      [req.user.linkedClientId]
    );
    return res.json(result.rows);
  }

  const clientId = String(req.query.clientId || '').trim();
  if (!clientId) {
    return res.status(400).json({ error: 'clientId requis pour admin' });
  }
  const result = await pool.query(
    `SELECT * FROM messages WHERE client_id = $1 ORDER BY created_at ASC`,
    [clientId]
  );
  return res.json(result.rows);
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const body = parsed.data.body.trim();
  const clientId = req.user.role === 'client'
    ? req.user.linkedClientId
    : String(parsed.data.clientId || '').trim();

  if (!clientId) return res.status(400).json({ error: 'clientId requis' });

  const result = await pool.query(
    `INSERT INTO messages (id, client_id, sender_user_id, sender_role, body)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [id('msg'), clientId, req.user.sub, req.user.role, body]
  );

  const io = req.app.locals.io;
  if (io) {
    io.to(`client:${clientId}`).emit('message:new', { clientId });
    io.to('admins').emit('message:new', { clientId });
  }

  return res.status(201).json(result.rows[0]);
});

module.exports = router;
