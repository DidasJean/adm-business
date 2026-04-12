const { randomUUID } = require('crypto');

function id(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

module.exports = { id };

