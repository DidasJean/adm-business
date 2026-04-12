const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../db/pool');
const { signToken } = require('../utils/token');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1).optional(),
  role: z.enum(['admin', 'client']).optional(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const { username, role, password } = parsed.data;
  let user = null;

  if (username) {
    const result = await pool.query(
      `SELECT id, username, display_name, role, linked_client_id, password_hash, active
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    );
    if (result.rowCount > 0) user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
    if (!user.active) return res.status(403).json({ error: 'Compte inactif' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });
  } else if (role) {
    const result = await pool.query(
      `SELECT id, username, display_name, role, linked_client_id, password_hash, active
       FROM users
       WHERE role = $1 AND active = TRUE`,
      [role]
    );
    for (const candidate of result.rows) {
      // For current mobile UX, allow role + password login.
      // Client passwords should remain unique.
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(password, candidate.password_hash);
      if (ok) {
        user = candidate;
        break;
      }
    }
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
  } else {
    return res.status(400).json({ error: 'username ou role requis' });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      linkedClientId: user.linked_client_id || null,
    },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, display_name, role, linked_client_id, active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const user = result.rows[0];
  return res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    linkedClientId: user.linked_client_id || null,
    active: user.active,
  });
});

module.exports = router;
