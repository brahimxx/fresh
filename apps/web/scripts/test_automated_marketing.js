const mysql = require('mysql2/promise');

async function testAutomatedMarketing() {
  console.log("=== Testing CRM & Automated Marketing ===");
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
  });

  try {
    const salonId = 163;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Create a Birthday Automation Rule
    const [autoRes] = await pool.query(
      `INSERT INTO automated_campaigns (salon_id, name, trigger_type, trigger_days_offset, is_active, type, subject, content)
       VALUES (?, 'Happy Birthday Blast', 'birthday', 0, 1, 'email', 'Happy Birthday!', 'Here is a 20% off coupon for your special day!')`,
      [salonId]
    );
    const automationId = autoRes.insertId;
    console.log(`✅ Created Birthday Automation Rule (#${automationId})`);

    // 2. Create a Dummy User with Birthday = Today
    const uniqueEmail = `birthdayboy_${Date.now()}@test.com`;
    const [userRes] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, role, date_of_birth, password_hash) 
       VALUES ('Birthday', 'Boy', ?, 'client', CURDATE(), 'dummyhash')`,
      [uniqueEmail]
    );
    const userId = userRes.insertId;
    console.log(`✅ Created Dummy User (#${userId}) with Birthday Today`);

    // 3. Link User to Salon
    await pool.query(
      `INSERT INTO salon_clients (salon_id, client_id, is_active) VALUES (?, ?, 1)`,
      [salonId, userId]
    );
    console.log(`✅ Linked User to Salon #${salonId}`);

    // 4. Run the Cron Engine (Importing it)
    console.log(`\n--- Triggering Cron Engine ---`);
    // Run the cron script as a sub-process
    const { execSync } = require('child_process');
    const output = execSync('node scripts/cron_automated_marketing.js').toString();
    console.log(output);

    // 5. Verification
    const [logs] = await pool.query(`SELECT * FROM automated_campaign_logs WHERE automated_campaign_id = ? AND client_id = ?`, [automationId, userId]);
    if (logs.length === 1) {
      console.log(`✅ Verification Passed! Log generated for client #${userId}.`);
      
      const campaignId = logs[0].generated_campaign_id;
      const [camps] = await pool.query(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
      console.log(`   -> Inserted Campaign Name: "${camps[0].name}"`);
      console.log(`   -> Inserted Campaign Subject: "${camps[0].subject}"`);
      console.log(`✅ Success: The cron engine successfully bridged the automation trigger into the existing campaigns pipeline!`);
    } else {
      console.error(`❌ Verification Failed! No log found.`);
    }

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await pool.end();
  }
}

testAutomatedMarketing();
