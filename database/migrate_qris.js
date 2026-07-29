/**
 * WisataPass – QRIS columns migration
 * Adds qris_url and qris_expiry to the payments table.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('⚙️  Running QRIS migration…');
    await client.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS qris_url    VARCHAR(1000),
        ADD COLUMN IF NOT EXISTS qris_expiry VARCHAR(50);
    `);
    console.log('✅ QRIS columns added to payments table.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
