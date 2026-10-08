const { Pool } = require('pg');
const config = require('./index');
const { executeMockQuery, mockDb } = require('./mockStore');

const pool = new Pool({
  connectionString: config.db.connectionString,
  connectionTimeoutMillis: 1000,
});

let isPgConnected = null;

pool.on('connect', () => {
  isPgConnected = true;
  console.log('[DB] Connected to PostgreSQL database.');
});

pool.on('error', (err) => {
  isPgConnected = false;
  console.warn('[DB] PostgreSQL error:', err.message);
});

/**
 * Execute a parameterized query.
 * Falls back to mock store if PostgreSQL is unreachable.
 */
const query = async (text, params = []) => {
  if (isPgConnected === false) {
    return executeMockQuery(text, params);
  }

  try {
    const res = await pool.query(text, params);
    isPgConnected = true;
    return res;
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ETIMEDOUT' ||
      err.message?.includes('connect') ||
      err.message?.includes('timeout')
    ) {
      if (isPgConnected !== false) {
        console.warn('⚠️ [DB] PostgreSQL not detected locally. Operating seamlessly in memory / mock mode.');
        isPgConnected = false;
      }
      return executeMockQuery(text, params);
    }
    throw err;
  }
};

/**
 * Transaction client with mock fallback support.
 */
const getClient = async () => {
  if (isPgConnected === false) {
    return {
      query: (text, params) => executeMockQuery(text, params),
      release: () => {},
    };
  }

  try {
    const client = await pool.connect();
    isPgConnected = true;
    return client;
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ETIMEDOUT' ||
      err.message?.includes('connect') ||
      err.message?.includes('timeout')
    ) {
      if (isPgConnected !== false) {
        console.warn('⚠️ [DB] PostgreSQL not detected. Operating in mock mode.');
        isPgConnected = false;
      }
      return {
        query: (text, params) => executeMockQuery(text, params),
        release: () => {},
      };
    }
    throw err;
  }
};

module.exports = { pool, query, getClient, mockDb };
