const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.info('New PostgreSQL client connected');
});

// Wrapper that logs query duration and errors for observability
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('Database query error', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
};

// Use getClient() when you need transactions (BEGIN/COMMIT)
const getClient = async () => {
  return pool.connect();
};

module.exports = { pool, query, getClient };
