const { query } = require('./src/lib/db.js');
async function run() {
  try {
    const res = await query('SELECT COUNT(*) as count FROM staff_pay_runs');
    console.log(res);
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
