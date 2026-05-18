
import mysql from "mysql2/promise";

let pool;
if (process.env.MYSQL_URL) {
  pool = mysql.createPool({
    uri: process.env.MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "fresh",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
}

export default pool;

export async function query(sql, params = []) {
  // Use pool.query instead of pool.execute for better type coercion
  // (execute has strict type requirements for LIMIT/OFFSET parameters)
  const [results] = await pool.query(sql, params);
  return results;
}

export async function getOne(sql, params = []) {
  const results = await query(sql, params);
  return results[0] || null;
}

export async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Acquire a pooled connection, run the callback, and guarantee release.
 * Use this when you need session-level settings (e.g. SET SESSION) without
 * the overhead of a full transaction. The connection is released in `finally`
 * so it cannot leak even if the callback throws.
 */
export async function withConnection(callback) {
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}
