const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  connectionString: config.db.connectionString,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ [DB] Connected to remote PostgreSQL database:', config.db.connectionString.replace(/:[^:@]+@/, ':****@'));
});

pool.on('error', (err) => {
  console.error('❌ [DB] PostgreSQL database client error:', err.message);
});

/**
 * Execute a parameterized query directly on PostgreSQL.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from PostgreSQL pool for transactions.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
