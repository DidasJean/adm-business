const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username,
      linkedClientId: user.linked_client_id || null,
      displayName: user.display_name,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { signToken, verifyToken };

