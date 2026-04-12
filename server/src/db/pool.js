const { Pool } = require('pg');
const { databaseUrl } = require('../config');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and set DATABASE_URL.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

module.exports = { pool };

