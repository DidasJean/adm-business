const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { id } = require('../utils/ids');

const router = express.Router();

const createSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'client']),
  linkedClientId: z.string().optional().nullable(),
  password: z.string().min(4),
});

const updateSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'client']),
  linkedClientId: z.string().optional().nullable(),
  password: z.string().optional(),
});

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const result = await pool.query(
    `SELECT id, username, display_name, role, linked_client_id, active, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  );
  return res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;

  const username = String(data.username).trim().toLowerCase();
  const exists = await pool.query(`SELECT id FROM users WHERE lower(username)=lower($1) LIMIT 1`, [username]);
  if (exists.rowCount > 0) return res.status(409).json({ error: 'Identifiant déjà utilisé' });

  if (data.role === 'client' && !data.linkedClientId) {
    return res.status(400).json({ error: 'linkedClientId requis pour rôle client' });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const userId = id('user');
  const result = await pool.query(
    `INSERT INTO users (id, username, display_name, role, linked_client_id, password_hash, active)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE)
     RETURNING id, username, display_name, role, linked_client_id, active, created_at, updated_at`,
    [userId, username, data.displayName, data.role, data.role === 'client' ? data.linkedClientId : null, passwordHash]
  );
  return res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const data = parsed.data;
  const userId = req.params.id;

  const target = await pool.query(`SELECT id, role FROM users WHERE id=$1 LIMIT 1`, [userId]);
  if (target.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const username = String(data.username).trim().toLowerCase();
  const exists = await pool.query(
    `SELECT id FROM users WHERE lower(username)=lower($1) AND id <> $2 LIMIT 1`,
    [username, userId]
  );
  if (exists.rowCount > 0) return res.status(409).json({ error: 'Identifiant déjà utilisé' });

  if (data.role === 'client' && !data.linkedClientId) {
    return res.status(400).json({ error: 'linkedClientId requis pour rôle client' });
  }

  let passwordHash = null;
  if (data.password && data.password.length >= 4) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const result = await pool.query(
    `UPDATE users
     SET username=$2,
         display_name=$3,
         role=$4,
         linked_client_id=$5,
         password_hash=COALESCE($6, password_hash),
         updated_at=NOW()
     WHERE id=$1
     RETURNING id, username, display_name, role, linked_client_id, active, created_at, updated_at`,
    [userId, username, data.displayName, data.role, data.role === 'client' ? data.linkedClientId : null, passwordHash]
  );
  return res.json(result.rows[0]);
});

router.post('/:id/toggle-active', requireAuth, requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  const target = await pool.query(`SELECT id, role, active FROM users WHERE id=$1 LIMIT 1`, [userId]);
  if (target.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const user = target.rows[0];
  if (req.user.sub === userId) return res.status(400).json({ error: 'Impossible de se désactiver soi-même' });

  if (user.role === 'admin' && user.active) {
    const otherAdmins = await pool.query(
      `SELECT id FROM users WHERE role='admin' AND active=TRUE AND id<>$1 LIMIT 1`,
      [userId]
    );
    if (otherAdmins.rowCount === 0) {
      return res.status(400).json({ error: 'Au moins un admin actif est obligatoire' });
    }
  }

  const result = await pool.query(
    `UPDATE users SET active = NOT active, updated_at=NOW() WHERE id=$1
     RETURNING id, username, display_name, role, linked_client_id, active, created_at, updated_at`,
    [userId]
  );
  return res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  if (req.user.sub === userId) return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });

  const target = await pool.query(`SELECT id, role, active FROM users WHERE id=$1 LIMIT 1`, [userId]);
  if (target.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const user = target.rows[0];
  if (user.role === 'admin' && user.active) {
    const otherAdmins = await pool.query(
      `SELECT id FROM users WHERE role='admin' AND active=TRUE AND id<>$1 LIMIT 1`,
      [userId]
    );
    if (otherAdmins.rowCount === 0) {
      return res.status(400).json({ error: 'Au moins un admin actif est obligatoire' });
    }
  }

  await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
  return res.json({ ok: true });
});

module.exports = router;

