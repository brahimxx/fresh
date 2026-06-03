const mysql = require('mysql2/promise');

async function cleanup() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
  });

  try {
    // Keep only the most recently created automation for each trigger_type per salon
    const [duplicates] = await pool.query(`
      SELECT id 
      FROM automated_campaigns a1
      WHERE EXISTS (
        SELECT 1 FROM automated_campaigns a2 
        WHERE a1.salon_id = a2.salon_id 
        AND a1.trigger_type = a2.trigger_type 
        AND a1.id < a2.id
      )
    `);

    if (duplicates.length > 0) {
      const idsToDelete = duplicates.map(d => d.id);
      await pool.query(`DELETE FROM automated_campaigns WHERE id IN (?)`, [idsToDelete]);
      console.log(`✅ Successfully deleted ${idsToDelete.length} duplicate automations.`);
    } else {
      console.log(`✅ No duplicates found.`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

cleanup();
