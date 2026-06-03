const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(__dirname, '../database/migrations/006_advanced_compensation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running Migration 006...');
    await pool.query(sql);
    console.log('✅ Migration 006 applied successfully!');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
