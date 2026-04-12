const { verifyToken } = require('../utils/token');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    req.user = verifyToken(token);
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };

