const mysql = require('mysql2/promise');

async function checkUser() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "root",
        database: process.env.DB_NAME || "fresh",
    });

    try {
        console.log('Fetching user testpro_country@example.com...');
        const [users] = await pool.query('SELECT email, role, country FROM users WHERE email = ?', ['testpro_country@example.com']);

        if (users.length > 0) {
            console.log('User found:', users[0]);
        } else {
            console.log('User not found.');
        }
    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        await pool.end();
    }
}

checkUser();
