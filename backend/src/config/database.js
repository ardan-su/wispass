/**
 * MariaDB Connection Pool
 * Uses mysql2/promise with prepared statements
 */
const envPath = require('path').join(__dirname, '../..', '.env');
require('dotenv').config({ path: envPath });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME     || 'wisatapass',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  connectionLimit:    parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  waitForConnections: true,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
  // Enable named placeholders support
  namedPlaceholders:  false,
  decimalNumbers:     true,
  multipleStatements: false,
});

pool.on('connection', () => {});

/**
 * Execute a parameterized query using ? placeholders.
 * Returns [rows, fields] — mirrors mysql2 convention but we return rows directly.
 * @param {string} sql     – SQL with ? placeholders
 * @param {any[]}  params  – Query parameters array
 * @returns {Promise<any[]>} rows array
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Get a dedicated connection (for transactions).
 * Caller must call conn.release() when done.
 */
async function getConnection() {
  return pool.getConnection();
}

/**
 * Run a function inside a transaction.
 * Automatically commits or rolls back.
 * @param {function} fn – async (conn) => any
 */
async function transaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Execute inside a transaction-aware conn (helper for modules).
 * @param {object} conn – active connection (or null to use pool)
 * @param {string} sql
 * @param {any[]}  params
 */
async function execute(conn, sql, params = []) {
  if (conn) {
    const [rows] = await conn.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

module.exports = { pool, query, getConnection, transaction, execute, testConnection };

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    const logger = require('../utils/logger');
    logger.info(`✅ MariaDB connected: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    return true;
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error(`❌ MariaDB connection failed: ${err.message}`);
    return false;
  }
}
