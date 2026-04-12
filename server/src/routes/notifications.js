const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  if (req.user.role === 'client') {
    if (!req.user.linkedClientId) return res.json([]);
    const own = await pool.query(
      `SELECT * FROM notifications WHERE client_id=$1 ORDER BY created_at DESC`,
      [req.user.linkedClientId]
    );
    return res.json(own.rows);
  }

  const all = await pool.query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200`);
  return res.json(all.rows);
});

router.post('/mark-read-all', requireAuth, async (req, res) => {
  if (req.user.role !== 'client' || !req.user.linkedClientId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  await pool.query(
    `UPDATE notifications SET read = TRUE WHERE client_id = $1 AND read = FALSE`,
    [req.user.linkedClientId]
  );
  return res.json({ ok: true });
});

module.exports = router;

