const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
  console.log('[MIGRATION] Connecting to PostgreSQL to run schema migration...');
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  let client;
  try {
    client = await pool.connect();
    console.log('[MIGRATION] Connected. Executing schema.sql...');
    await client.query(sql);
    console.log('✅ [MIGRATION] Database schema migrated successfully.');
  } catch (err) {
    console.error('❌ [MIGRATION] Failed to execute database migration:');
    console.error('   Code:', err.code);
    console.error('   Error:', err.message);
    throw err;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = migrate;
