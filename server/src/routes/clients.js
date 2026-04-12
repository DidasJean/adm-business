const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { id } = require('../utils/ids');

const router = express.Router();

const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative().default(0),
  avatar: z.string().optional().nullable(),
  active: z.boolean().optional(),
  clientPassword: z.string().min(4).optional(),
});

router.get('/', requireAuth, async (req, res) => {
  if (req.user.role === 'client' && req.user.linkedClientId) {
    const own = await pool.query(`SELECT * FROM clients WHERE id = $1 LIMIT 1`, [req.user.linkedClientId]);
    return res.json(own.rows);
  }

  const result = await pool.query(`SELECT * FROM clients ORDER BY created_at DESC`);
  return res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;
  const clientId = id('client');

  const result = await pool.query(
    `INSERT INTO clients (id, name, phone, email, address, credit_limit, avatar, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [clientId, data.name, data.phone || '', data.email || '', data.address || '', data.creditLimit, data.avatar || '', data.active !== false]
  );

  if (data.clientPassword) {
    const hash = await bcrypt.hash(data.clientPassword, 10);
    await pool.query(
      `INSERT INTO users (id, username, display_name, role, password_hash, linked_client_id, active)
       VALUES ($1,$2,$3,'client',$4,$5,TRUE)`,
      [id('user'), `client_${clientId.slice(-6)}`, data.name, hash, clientId]
    );
  }
  return res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;

  const result = await pool.query(
    `UPDATE clients
     SET name=$2, phone=$3, email=$4, address=$5, credit_limit=$6, avatar=$7, active=$8, updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [req.params.id, data.name, data.phone || '', data.email || '', data.address || '', data.creditLimit, data.avatar || '', data.active !== false]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Client introuvable' });

  await pool.query(
    `UPDATE users SET display_name=$2, updated_at=NOW() WHERE role='client' AND linked_client_id=$1`,
    [req.params.id, data.name]
  );

  if (data.clientPassword) {
    const hash = await bcrypt.hash(data.clientPassword, 10);
    const existing = await pool.query(
      `SELECT id FROM users WHERE role='client' AND linked_client_id=$1 LIMIT 1`,
      [req.params.id]
    );
    if (existing.rowCount > 0) {
      await pool.query(
        `UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1`,
        [existing.rows[0].id, hash]
      );
    } else {
      await pool.query(
        `INSERT INTO users (id, username, display_name, role, password_hash, linked_client_id, active)
         VALUES ($1,$2,$3,'client',$4,$5,TRUE)`,
        [id('user'), `client_${req.params.id.slice(-6)}`, data.name, hash, req.params.id]
      );
    }
  }

  return res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query(`DELETE FROM users WHERE role='client' AND linked_client_id=$1`, [req.params.id]);
  await pool.query(`DELETE FROM clients WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
});

module.exports = router;
