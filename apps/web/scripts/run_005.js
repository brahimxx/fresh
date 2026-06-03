const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  console.log('Connecting to DB...');
  const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "fresh",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
  
  try {
    const sqlPath = path.join(__dirname, '../database/migrations/005_payroll_edge_cases.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.trim().substring(0, 50).replace(/\n/g, ' ')}...`);
      try {
        await pool.query(statement);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists, skipping...');
        } else {
            throw err;
        }
      }
    }
    console.log('Migration 005 applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
