const mysql = require('mysql2/promise');
const { db } = require('./env');


const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,

  ssl: {
    minVersion: 'TLSv1.2',
  },

  waitForConnections: true,
  connectionLimit: 10,
});

// pool.query (client-side escaping) is used throughout to avoid
// prepared-statement quirks with LIMIT/OFFSET placeholders.
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction };
