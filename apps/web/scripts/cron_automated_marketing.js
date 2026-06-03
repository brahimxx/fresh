const mysql = require('mysql2/promise');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function runCronMarketing() {
  console.log("=== Running Automated Marketing Cron Engine ===");
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
  });

  try {
    // 1. Fetch active automated campaigns
    const [activeAutomations] = await pool.query(
      `SELECT * FROM automated_campaigns WHERE is_active = 1`
    );

    if (activeAutomations.length === 0) {
      console.log("No active automations found.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (const automation of activeAutomations) {
      console.log(`\nProcessing Automation: ${automation.name} (${automation.trigger_type})`);
      
      let eligibleClients = [];

      if (automation.trigger_type === 'birthday') {
        // Find clients of this salon who have a birthday today
        // Note: date_of_birth might include the year, we just match Month and Day
        const [clients] = await pool.query(`
          SELECT DISTINCT u.id, u.first_name, u.email, u.phone 
          FROM users u
          JOIN salon_clients sc ON sc.client_id = u.id
          WHERE sc.salon_id = ? 
          AND MONTH(u.date_of_birth) = MONTH(CURDATE())
          AND DAY(u.date_of_birth) = DAY(CURDATE())
        `, [automation.salon_id]);
        eligibleClients = clients;
      } 
      else if (automation.trigger_type === 'lapsed_client') {
        // Find clients whose LAST completed booking was exactly trigger_days_offset ago
        const daysOffset = automation.trigger_days_offset; // e.g., 90
        const [clients] = await pool.query(`
          SELECT u.id, u.first_name, u.email, u.phone, MAX(b.start_datetime) as last_visit
          FROM users u
          JOIN bookings b ON b.client_id = u.id
          WHERE b.salon_id = ? AND b.status = 'completed'
          GROUP BY u.id, u.first_name, u.email, u.phone
          HAVING DATEDIFF(CURDATE(), DATE(MAX(b.start_datetime))) = ?
        `, [automation.salon_id, daysOffset]);
        eligibleClients = clients;
      }
      
      if (eligibleClients.length === 0) {
        console.log(` -> 0 eligible clients found.`);
        continue;
      }

      console.log(` -> Found ${eligibleClients.length} eligible clients!`);

      // Attempt to dispatch
      for (const client of eligibleClients) {
        // Check if we already sent this campaign to this client today (prevent duplicates)
        const [logs] = await pool.query(
          `SELECT id FROM automated_campaign_logs 
           WHERE automated_campaign_id = ? AND client_id = ? AND trigger_date = ?`,
          [automation.id, client.id, todayStr]
        );

        if (logs.length > 0) {
          console.log(`    - Skipped Client #${client.id} (Already executed today)`);
          continue;
        }

        // 1. Actually send the email using Resend
        if (automation.type === 'email') {
          if (resend) {
            try {
              const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Fresh <onboarding@resend.dev>',
                to: client.email,
                subject: automation.subject,
                html: automation.content,
              });
              
              if (error) {
                console.error(`    - [RESEND ERROR] Failed to send to ${client.email}:`, error);
                // If it fails to send, we continue to the next client so we don't log it as completed
                continue; 
              }
            } catch (apiErr) {
              console.error(`    - [RESEND CRASH] Failed to send to ${client.email}:`, apiErr);
              continue;
            }
          } else {
            console.log(`    - [RESEND MOCK] Would have sent email to ${client.email}`);
          }
        }

        // 2. Insert into the main campaigns table as a sent broadcast
        // This gives the owner visibility into what was sent in the Campaigns History tab!
        const [campRes] = await pool.query(
          `INSERT INTO campaigns 
           (salon_id, name, type, subject, content, target_audience, status, completed_at, recipient_count, sent_count)
           VALUES (?, ?, ?, ?, ?, 'all', 'completed', NOW(), 1, 1)`,
          [
            automation.salon_id, 
            `Automated: ${automation.name} for ${client.first_name}`, 
            automation.type, 
            automation.subject, 
            automation.content
          ]
        );
        const newCampaignId = campRes.insertId;

        // Log the execution to prevent duplicates
        await pool.query(
          `INSERT INTO automated_campaign_logs 
           (automated_campaign_id, client_id, generated_campaign_id, trigger_date)
           VALUES (?, ?, ?, ?)`,
          [automation.id, client.id, newCampaignId, todayStr]
        );

        console.log(`    - Successfully triggered for Client #${client.id} (Generated Campaign #${newCampaignId})`);
      }
    }

  } catch (err) {
    console.error("Cron Error:", err);
  } finally {
    await pool.end();
  }
}

runCronMarketing();
