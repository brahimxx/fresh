const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      process.env[key] = value;
    }
  });
}

async function checkStaffHours() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('========== STAFF WORKING HOURS ==========\n');

  // Get all staff members
  const [staff] = await connection.execute(
    `SELECT s.id, u.first_name, u.last_name, s.title
     FROM staff s
     JOIN users u ON u.id = s.user_id
     WHERE s.is_active = 1
     LIMIT 5`
  );

  console.log('Active Staff Members:');
  staff.forEach(s => {
    console.log(`  - ${s.first_name} ${s.last_name} (ID: ${s.id}) - ${s.title || 'Staff'}`);
  });

  console.log('\n========== WORKING HOURS FOR EACH STAFF ==========\n');

  for (const s of staff) {
    console.log(`\n${s.first_name} ${s.last_name} (ID: ${s.id}):`);

    const [hours] = await connection.execute(
      `SELECT day_of_week, start_time, end_time
       FROM staff_working_hours
       WHERE staff_id = ?
       ORDER BY day_of_week`,
      [s.id]
    );

    if (hours.length === 0) {
      console.log('  ❌ No working hours configured!');
    } else {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      hours.forEach(h => {
        console.log(`  ${days[h.day_of_week]}: ${h.start_time} - ${h.end_time}`);
      });
    }
  }

  console.log('\n========== BUSINESS HOURS (FALLBACK) ==========\n');

  const [businessHours] = await connection.execute(
    `SELECT day_of_week, open_time, close_time, is_closed
     FROM business_hours
     WHERE salon_id = (SELECT id FROM salons LIMIT 1)
     ORDER BY day_of_week`
  );

  if (businessHours.length === 0) {
    console.log('  ❌ No business hours configured!');
  } else {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    businessHours.forEach(h => {
      if (h.is_closed) {
        console.log(`  ${days[h.day_of_week]}: CLOSED`);
      } else {
        console.log(`  ${days[h.day_of_week]}: ${h.open_time} - ${h.close_time}`);
      }
    });
  }

  console.log('\n========== CHECKING TIME FORMAT ==========\n');

  const [sampleHour] = await connection.execute(
    `SELECT start_time, end_time, TIME_FORMAT(start_time, '%H:%i:%s') as formatted_start
     FROM staff_working_hours
     LIMIT 1`
  );

  if (sampleHour.length > 0) {
    console.log('Sample time from database:');
    console.log(`  Raw: ${sampleHour[0].start_time}`);
    console.log(`  Type: ${typeof sampleHour[0].start_time}`);
    console.log(`  Formatted: ${sampleHour[0].formatted_start}`);
  }

  await connection.end();
}

checkStaffHours().catch(console.error);
