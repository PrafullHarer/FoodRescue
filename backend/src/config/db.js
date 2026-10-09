const { Pool } = require('pg');
const dns = require('dns').promises;
const config = require('./index');

if (!config.db.connectionString) {
  console.error('❌ [DB] FATAL ERROR: DATABASE_URL is not set in environment variables! Ensure backend/.env file exists with valid DATABASE_URL.');
}

let poolInstance = null;
let poolInitPromise = null;
let hasLoggedConnection = false;

/**
 * Parses DATABASE_URL, resolves IPv4 address to circumvent Windows/Node IPv6 blackholing,
 * and initializes a pg.Pool with pre-warmed connections and SSL configuration.
 */
async function getPool() {
  if (poolInstance) {
    return poolInstance;
  }

  if (!poolInitPromise) {
    poolInitPromise = (async () => {
      const connStr = config.db.connectionString;
      if (!connStr) {
        throw new Error('DATABASE_URL is not defined in environment');
      }

      let poolConfig = {
        min: 2, // Maintain 2 pre-warmed persistent connections to eliminate 1.5s TCP/TLS handshakes
        max: 15,
        idleTimeoutMillis: 300000, // Keep idle connections alive for 5 minutes
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };

      try {
        const parsedUrl = new URL(connStr);
        const originalHostname = parsedUrl.hostname;
        const isNeon = originalHostname.includes('neon.tech');
        const isRemoteHost = !['localhost', '127.0.0.1', '::1'].includes(originalHostname) &&
          !originalHostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);

        let targetHost = originalHostname;

        if (isRemoteHost) {
          try {
            // Resolve IPv4 address directly to prevent Node dual-stack IPv6 connection timeouts
            const dnsResult = await dns.lookup(originalHostname, { family: 4 });
            if (dnsResult && dnsResult.address) {
              targetHost = dnsResult.address;
            }
          } catch (dnsErr) {
            console.warn('⚠️ [DB] IPv4 DNS lookup fallback to default hostname:', dnsErr.message);
          }
        }

        const sslConfig = isNeon
          ? { rejectUnauthorized: false, servername: originalHostname }
          : (parsedUrl.searchParams.get('sslmode') || connStr.includes('sslmode=')
              ? { rejectUnauthorized: false, servername: originalHostname }
              : undefined);

        poolConfig = {
          ...poolConfig,
          host: targetHost,
          port: parseInt(parsedUrl.port || '5432', 10),
          user: decodeURIComponent(parsedUrl.username || ''),
          password: decodeURIComponent(parsedUrl.password || ''),
          database: (parsedUrl.pathname || '').replace(/^\//, '') || 'postgres',
          ssl: sslConfig,
        };
      } catch (parseErr) {
        // If standard URL parsing fails, fallback to connectionString directly
        console.warn('⚠️ [DB] URL parse failed, falling back to raw connectionString:', parseErr.message);
        poolConfig.connectionString = connStr;
        if (connStr.includes('neon.tech') || connStr.includes('sslmode=')) {
          poolConfig.ssl = { rejectUnauthorized: false };
        }
      }

      const pool = new Pool(poolConfig);

      pool.on('connect', (client) => {
        if (!hasLoggedConnection) {
          console.log('✅ [DB] Connection pool established with PostgreSQL database');
          hasLoggedConnection = true;
        }
        client.on('error', (err) => {
          console.warn('⚠️ [DB] Client socket error caught:', err.message);
        });
      });

      pool.on('error', (err) => {
        console.warn('⚠️ [DB] PostgreSQL pool idle client error caught:', err.message);
      });

      // Eagerly pre-warm pool connections and ensure schema migrations
      pool.query(`
        SELECT 1;
        ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
        ALTER TABLE donation_claims ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
        ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
      `).catch((schemaErr) => {
        console.warn('⚠️ [DB] Schema column check notice:', schemaErr.message);
      });

      poolInstance = pool;
      return poolInstance;
    })();
  }

  return poolInitPromise;
}

// Start pool initialization eagerly on module import
getPool().catch((err) => {
  console.error('❌ [DB] Initial connection pool setup error:', err.message);
});

/**
 * Execute a parameterized query reusing a client from the central connection pool.
 * Automatically releases the client back to the pool immediately upon query completion.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const p = await getPool();
  return p.query(text, params);
};

/**
 * Acquire a dedicated client from the pool for manual transactions.
 * NOTE: Always release client in a finally block!
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = async () => {
  const p = await getPool();
  return p.connect();
};

/**
 * Transparent proxy for pool so that legacy code accessing `pool.query`, `pool.on`,
 * `pool.end`, or `pool.connect` works seamlessly without code modifications.
 */
const poolProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') return undefined;
    return async (...args) => {
      const p = await getPool();
      if (typeof p[prop] === 'function') {
        return p[prop](...args);
      }
      return p[prop];
    };
  }
});

module.exports = { pool: poolProxy, query, getClient, getPool };
