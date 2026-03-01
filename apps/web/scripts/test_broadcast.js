const { query } = require('./src/lib/db.js');
async function test() {
    try {
        const targetUsers = await query(`
            SELECT id FROM users 
            WHERE role IN ('owner', 'staff') AND is_active = 1 AND deleted_at IS NULL
        `);
        console.log("Targets:", targetUsers.length);
        if (targetUsers.length > 0) {
            const values = targetUsers.map(user => [
                user.id,
                'push',
                'Reboot',
                'Test Msg',
                1
            ]);
            const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
            const flatValues = values.flat();
            console.log("Placeholders:", placeholders);
            console.log("Flat Values:", flatValues);
            await query(`
                INSERT INTO notifications (user_id, type, title, message, is_system_banner)
                VALUES ${placeholders}
            `, flatValues);
            console.log("Success");
        }
    } catch (e) {
        console.error("DB Error:", e.message);
    }
    process.exit(0);
}
test();
