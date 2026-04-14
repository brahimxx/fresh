import { config } from 'dotenv';
config({ path: '.env.local' });
import pool from './src/lib/db.js';
import fs from 'fs';

async function run() {
  const sql = fs.readFileSync('./database/migrations/20260413_create_staff_invitations.sql', 'utf8');
  try {
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists');
    } else {
      console.error(err);
    }
  }
  process.exit(0);
}
run();
