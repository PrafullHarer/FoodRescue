const { Pool } = require('pg');
const config = require('./index');

if (!config.db.connectionString) {
  console.error('❌ [DB] FATAL ERROR: DATABASE_URL is not set in environment variables! Ensure backend/.env file exists with valid DATABASE_URL.');
}

const pool = new Pool({
  connectionString: config.db.connectionString,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  ssl: config.db.connectionString && config.db.connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

let hasLoggedConnection = false;

pool.on('connect', () => {
  if (!hasLoggedConnection) {
    console.log('✅ [DB] Connection pool established with PostgreSQL database');
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ [DB] PostgreSQL pool idle client error:', err.message);
});

/**
 * Execute a parameterized query reusing a client from the central connection pool.
 * Automatically releases the client back to the pool immediately upon query completion.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from the pool for manual transactions.
 * NOTE: Always release client in a finally block!
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
